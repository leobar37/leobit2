import type { DatabaseAdapter } from "../core/database-adapter";
import type { ISyncHttpClient, SyncOperationRecord, HandlerResult } from "../core";
import { BATCH_SIZE, MAX_RETRIES, OPERATION_STATUS } from "../shared";
import { SyncAutoRunner } from "./auto-runner";
import { SyncOperationLifecycleService } from "./operation-lifecycle";
import { getFileUploadService } from "../client/file-upload-service";

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
    private adapter: DatabaseAdapter,
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

    const result = await this.adapter.query<SyncOperationRecord>(
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

  private extractFileIds(payload: unknown): string[] {
    if (!payload || typeof payload !== "object") return [];

    const fileIds: string[] = [];
    const values = Object.values(payload as Record<string, unknown>);

    for (const value of values) {
      if (typeof value === "string" && /^[a-z0-9]{20,}$/i.test(value)) {
        // Likely a CUID2 file ID - check if it exists in temp storage
        fileIds.push(value);
      }
    }

    return fileIds;
  }

  private async uploadPendingFiles(operations: SyncOperationRecord[]): Promise<{ success: boolean; errors: string[] }> {
    try {
      const fileService = getFileUploadService();
      const pendingUploads = await fileService.getPendingUploads();
      if (pendingUploads.length === 0) {
        return { success: true, errors: [] };
      }

      const errors: string[] = [];

      // Extract file IDs referenced in operations
      const referencedFileIds = new Set<string>();
      for (const op of operations) {
        const fileIds = this.extractFileIds(op.payload);
        fileIds.forEach((id) => referencedFileIds.add(id));
      }

      // Upload only referenced files
      for (const upload of pendingUploads) {
        if (!referencedFileIds.has(upload.id)) continue;

        try {
          await fileService.upload(upload.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to upload file ${upload.id}: ${message}`);
        }
      }

      return { success: errors.length === 0, errors };
    } catch (error) {
      // If file service is not available (e.g., IndexedDB not supported), skip file upload
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("indexedDB") || message.includes("IDBDatabase")) {
        return { success: true, errors: [] };
      }
      return { success: false, errors: [message] };
    }
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

      // Upload pending files before sending batch
      const uploadResult = await this.uploadPendingFiles(operations);
      if (!uploadResult.success) {
        console.error("[SYNC] File upload failed:", uploadResult.errors);
        // Mark operations with file upload errors as failed
        for (const operation of operations) {
          await this.lifecycle.markFailed(operation.id, `File upload failed: ${uploadResult.errors.join(", ")}`);
        }
        return { processed: 0, failed: operations.length, conflicts: 0, errors: uploadResult.errors };
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
