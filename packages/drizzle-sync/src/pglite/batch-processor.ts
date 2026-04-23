import type { PGlite } from "@electric-sql/pglite";
import type { ISyncHttpClient, SyncOperationRecord, HandlerResult } from "../core";
import { BATCH_SIZE, MAX_RETRIES, OPERATION_STATUS } from "../shared";
import { SyncAutoRunner } from "./auto-runner";
import { SyncOperationLifecycleService } from "./operation-lifecycle";

export interface BatchProcessorOptions {
  /** Column name for tenant filtering (default: "tenant_id") */
  tenantColumn?: string;
  /** Ordered array of entity types for priority sorting (earlier = higher priority) */
  entityPriorities?: string[];
  /** Max operations per batch (default: 50) */
  batchSize?: number;
}

type ProcessPendingResult = {
  processed: number;
  failed: number;
  conflicts: number;
};

type GroupProcessResult = {
  success: boolean;
  errors: string[];
};

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function buildPriorityCaseSql(priorities: string[]): string {
  if (priorities.length === 0) return "";
  return priorities
    .map((entity, index) => `WHEN '${entity}' THEN ${index + 1}`)
    .join("\n           ");
}

function sortOperations(
  operations: SyncOperationRecord[],
  entityPriorities: string[]
): SyncOperationRecord[] {
  if (entityPriorities.length === 0) {
    return [...operations].sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
  }

  const priorityMap = new Map(entityPriorities.map((e, i) => [e, i + 1]));

  return [...operations].sort((left, right) => {
    const leftPriority = priorityMap.get(left.entity_type) ?? 99;
    const rightPriority = priorityMap.get(right.entity_type) ?? 99;

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

/**
 * Processes pending sync operations in batches, respecting entity priorities
 * for proper foreign-key ordering.
 */
export class SyncBatchProcessor {
  private readonly tenantColumn: string;
  private readonly entityPriorities: string[];
  private readonly batchSize: number;

  constructor(
    private pg: PGlite,
    private tenantId: string,
    private httpClient: ISyncHttpClient,
    private lifecycle: SyncOperationLifecycleService,
    private autoRunner: SyncAutoRunner,
    options: BatchProcessorOptions = {}
  ) {
    this.tenantColumn = options.tenantColumn ?? "tenant_id";
    this.entityPriorities = options.entityPriorities ?? [];
    this.batchSize = options.batchSize ?? BATCH_SIZE;
  }

  async processPending(ignoreOnlineCheck = false): Promise<ProcessPendingResult> {
    if (!ignoreOnlineCheck && !isOnline()) {
      console.log("[SYNC] Offline - skipping push sync");
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    await this.autoRunner.waitForBackoff();

    const pendingOperations = await this.fetchPendingOperations(this.batchSize);
    if (pendingOperations.length === 0) {
      console.log("[SYNC] No pending operations");
      this.autoRunner.recordSuccess();
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    // Sort operations by entity priority for proper FK-based ordering
    const sortedOperations = sortOperations(pendingOperations, this.entityPriorities);

    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    // Process in chunks based on priority ordering
    for (const chunk of chunkOperations(sortedOperations, this.batchSize)) {
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
    console.warn("[SYNC] processGroup is deprecated - sync_group_id no longer exists");
    return { success: true, errors: [] };
  }

  private async fetchPendingOperations(limit: number): Promise<SyncOperationRecord[]> {
    const priorityCase = buildPriorityCaseSql(this.entityPriorities);
    const orderBy = priorityCase
      ? `ORDER BY
          CASE entity_type
            ${priorityCase}
            ELSE 99
          END,
          created_at ASC`
      : `ORDER BY created_at ASC`;

    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT *
       FROM sync_operations
       WHERE "${this.tenantColumn}" = $1
         AND status IN ($2, $3)
         AND sync_attempts < $4
       ${orderBy}
       LIMIT $5`,
      [
        this.tenantId,
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

      const response = await this.httpClient.sendBatch(operations);

      for (const operation of operations) {
        const result = response.find(
          (item: HandlerResult) => item.idempotencyKey === (operation.idempotency_key ?? operation.id)
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
}
