import type { PGlite } from "@electric-sql/pglite";
import { ENTITY_PRIORITIES, getEntityPriority, isSyncEntity } from "@avileo/shared";
import { BATCH_SIZE, MAX_RETRIES, OPERATION_STATUS } from "@avileo/drizzle-sync/shared";
import type { ISyncHttpClient } from "./http/sync-http-client";
import type { BatchSyncResponse, SyncOperationRecord } from "./types";
import { SyncAutoRunner } from "./sync-auto-runner";
import { SyncOperationLifecycleService } from "./sync-operation-lifecycle-service";

type ProcessPendingResult = {
  processed: number;
  failed: number;
  conflicts: number;
};

type GroupProcessResult = {
  success: boolean;
  errors: string[];
};

type SyncOperationResult = {
  success: boolean;
  error?: string;
  conflict?: {
    serverData: Record<string, unknown>;
    suggestedMerge: Record<string, unknown>;
  };
};

const ENTITY_PRIORITY_CASE_SQL = Object.entries(ENTITY_PRIORITIES)
  .filter(([, priority]) => typeof priority === "number")
  .sort((left, right) => (left[1] ?? 99) - (right[1] ?? 99))
  .map(([entity, priority]) => `WHEN '${entity}' THEN ${priority}`)
  .join("\n           ");

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function sortOperations(operations: SyncOperationRecord[]): SyncOperationRecord[] {
  return [...operations].sort((left, right) => {
    const leftPriority = isSyncEntity(left.entity_type)
      ? getEntityPriority(left.entity_type)
      : 99;
    const rightPriority = isSyncEntity(right.entity_type)
      ? getEntityPriority(right.entity_type)
      : 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return (
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
  });
}

function chunkOperations(
  operations: SyncOperationRecord[],
  size: number
): SyncOperationRecord[][] {
  const chunks: SyncOperationRecord[][] = [];

  for (let index = 0; index < operations.length; index += size) {
    chunks.push(operations.slice(index, index + size));
  }

  return chunks;
}

export class SyncBatchProcessor {
  constructor(
    private pg: PGlite,
    private businessId: string,
    private httpClient: ISyncHttpClient,
    private lifecycle: SyncOperationLifecycleService,
    private autoRunner: SyncAutoRunner
  ) {}

  async processPending(ignoreOnlineCheck = false): Promise<ProcessPendingResult> {
    if (!ignoreOnlineCheck && !isOnline()) {
      console.log("[SYNC] Offline - skipping push sync");
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    await this.autoRunner.waitForBackoff();

    const pendingOperations = await this.fetchPendingOperations(BATCH_SIZE);
    if (pendingOperations.length === 0) {
      console.log("[SYNC] No pending operations");
      this.autoRunner.recordSuccess();
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    // Sort operations by entity priority for proper FK-based ordering
    const sortedOperations = sortOperations(pendingOperations);

    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    // Process in chunks based on priority ordering (FK-based, no sync_group_id grouping)
    for (const chunk of chunkOperations(sortedOperations, BATCH_SIZE)) {
      const result = await this.processBatch(chunk);
      processed += result.processed;
      failed += result.failed;
      conflicts += result.conflicts;
    }

    if (failed > 0) {
      this.autoRunner.recordFailure();
    } else {
      this.autoRunner.recordSuccess();
    }

    console.log("[SYNC] Processing complete:", {
      processed,
      failed,
      conflicts,
    });

    return { processed, failed, conflicts };
  }

  async processGroup(groupId: string): Promise<GroupProcessResult> {
    // This method is deprecated - sync_group_id is no longer used
    // Group processing is now handled by FK-based ordering in processPending
    // Keeping for backward compatibility but it will not work as expected
    console.warn("[SYNC] processGroup is deprecated - sync_group_id no longer exists");
    return { success: true, errors: [] };
  }

  async syncOperation(operation: SyncOperationRecord): Promise<SyncOperationResult> {
    try {
      const response = await this.sendBatchToServer([operation]);
      const result = response.results.find(
        (item) => item.idempotencyKey === (operation.idempotency_key ?? operation.id)
      );

      if (!result) {
        return {
          success: false,
          error: "Sync batch returned no result for operation",
        };
      }

      if (result.conflict) {
        return { success: false, conflict: result.conflict };
      }

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async fetchPendingOperations(limit: number): Promise<SyncOperationRecord[]> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT *
       FROM sync_operations
       WHERE business_id = $1
         AND status IN ($2, $3)
         AND sync_attempts < $4
       ORDER BY
         CASE entity_type
           ${ENTITY_PRIORITY_CASE_SQL}
           ELSE 99
         END,
         created_at ASC
       LIMIT $5`,
      [
        this.businessId,
        OPERATION_STATUS.PENDING,
        OPERATION_STATUS.FAILED,
        MAX_RETRIES,
        limit,
      ]
    );

    return result.rows;
  }

  private async processBatch(
    operations: SyncOperationRecord[]
  ): Promise<ProcessPendingResult & { errors: string[] }> {
    if (operations.length === 0) {
      return { processed: 0, failed: 0, conflicts: 0, errors: [] };
    }

    const errors: string[] = [];
    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      for (const operation of operations) {
        await this.lifecycle.markProcessing(operation.id);
      }

      console.log(
        `[SYNC] Sending batch (count=${operations.length})`
      );

      const response = await this.sendBatchToServer(operations);

      for (const operation of operations) {
        const result = response.results.find(
          (item) => item.idempotencyKey === (operation.idempotency_key ?? operation.id)
        );

        if (!result) {
          const error = "Batch sync returned no result for operation";
          await this.lifecycle.markFailed(operation.id, error);
          failed += 1;
          errors.push(error);
          continue;
        }

        if (result.conflict) {
          await this.lifecycle.markConflict(operation.id, result.conflict);
          conflicts += 1;
          continue;
        }

        if (result.success) {
          await this.lifecycle.markCompleted(operation.id);
          processed += 1;
          continue;
        }

        const error = result.error || "Unknown error";
        await this.lifecycle.markFailed(operation.id, error);
        failed += 1;
        errors.push(error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      for (const operation of operations) {
        await this.lifecycle.markFailed(operation.id, message);
      }

      failed += operations.length;
      errors.push(message);
    }

    return { processed, failed, conflicts, errors };
  }

  private async sendBatchToServer(
    operations: SyncOperationRecord[]
  ): Promise<BatchSyncResponse> {
    return this.httpClient.sendBatch(operations);
  }
}
