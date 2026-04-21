import type { PGlite } from "@electric-sql/pglite";
import { MAX_RETRIES, OPERATION_STATUS } from "@avileo/drizzle-sync/shared";
import type { ISyncQueue } from "./types";
import type {
  DeadLetterOperationRecord,
  SyncOperationRecord,
} from "./types";
import { SELF_HEAL_INSERTABLE_ENTITIES, classifyError, parsePayload } from "./types";
import { buildPlaceholders } from "./types";
import { syncLogger } from "@avileo/drizzle-sync/pglite";
import { SyncEntityStatusUpdater } from "./sync-entity-status-updater";

export class SyncOperationLifecycleService {
  constructor(
    private pg: PGlite,
    private businessId: string,
    private queue: ISyncQueue,
    private entityStatusUpdater: SyncEntityStatusUpdater
  ) {}

  async getOperation(id: string): Promise<SyncOperationRecord | null> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT *
       FROM sync_operations
       WHERE id = $1
         AND business_id = $2`,
      [id, this.businessId]
    );

    return result.rows[0] ?? null;
  }

  async markProcessing(id: string): Promise<void> {
    await this.queue.markProcessing(id);
  }

  async markCompleted(id: string): Promise<void> {
    const operation = await this.getOperation(id);
    await this.queue.markCompleted(id);

    if (!operation) {
      return;
    }

    console.log(
      `[SYNC] Completed: ${operation.entity_type}:${operation.entity_id} (${operation.operation})`
    );

    await this.entityStatusUpdater.markSynced(operation);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const operation = await this.getOperation(id);
    const payloadStr =
      typeof operation?.payload === "string"
        ? operation.payload
        : JSON.stringify(operation?.payload);

    syncLogger.error("[SYNC]", "Operation marked as FAILED", {
      operationId: id,
      entityType: operation?.entity_type,
      operation: operation?.operation,
      entityId: operation?.entity_id,
      error,
      attempts: operation?.sync_attempts,
      payload: payloadStr ? payloadStr.substring(0, 1000) : undefined,
    });

    if (!operation) {
      return;
    }

    const selfHealed = await this.trySelfHealOperation(operation, error);
    if (selfHealed) {
      return;
    }

    const attempts = operation.sync_attempts + 1;
    if (attempts >= MAX_RETRIES) {
      await this.queue.moveToDeadLetter(operation, error);
      return;
    }

    await this.queue.markFailed(id, error, attempts);
  }

  async markConflict(
    id: string,
    conflictData: {
      serverData: Record<string, unknown>;
      suggestedMerge: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.queue.markConflict(id, conflictData);
  }

  async retryDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    const record = await this.getDeadLetterOperation(deadLetterId);
    if (!record) {
      return false;
    }

    const updated = await this.pg.query<{ id: string }>(
      `UPDATE sync_operations
       SET status = $1,
           sync_attempts = 0,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND business_id = $3
       RETURNING id`,
      [OPERATION_STATUS.PENDING, record.operation_id, this.businessId]
    );

    if (updated.rows.length === 0) {
      return false;
    }

    const deleted = await this.pg.query<{ id: string }>(
      `DELETE FROM sync_dead_letter
       WHERE id = $1
         AND business_id = $2
       RETURNING id`,
      [deadLetterId, this.businessId]
    );

    return deleted.rows.length > 0;
  }

  async deleteDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    const deleted = await this.pg.query<{ id: string }>(
      `DELETE FROM sync_dead_letter
       WHERE id = $1
         AND business_id = $2
       RETURNING id`,
      [deadLetterId, this.businessId]
    );

    return deleted.rows.length > 0;
  }

  async clearDeadLetterOperations(): Promise<number> {
    const deleted = await this.pg.query<{ id: string }>(
      `DELETE FROM sync_dead_letter
       WHERE business_id = $1
       RETURNING id`,
      [this.businessId]
    );

    return deleted.rows.length;
  }

  async deleteOperation(operationId: string): Promise<boolean> {
    try {
      return this.queue.deleteOperation(operationId);
    } catch (error) {
      syncLogger.error("[SYNC]", "Failed to delete operation", { operationId });
      return false;
    }
  }

  async deleteOperations(operationIds: string[]): Promise<number> {
    if (operationIds.length === 0) {
      return 0;
    }

    try {
      const placeholders = buildPlaceholders(operationIds.length, 2);
      const deleted = await this.pg.query<{ id: string }>(
        `DELETE FROM sync_operations
         WHERE business_id = $1
           AND id IN (${placeholders})
         RETURNING id`,
        [this.businessId, ...operationIds]
      );

      return deleted.rows.length;
    } catch (error) {
      syncLogger.error("[SYNC]", "Failed to delete operations", {
        count: operationIds.length,
      });
      return 0;
    }
  }

  async logDetailedStatus(): Promise<void> {
    console.log(`[SYNC] Detailed Queue Status for business: ${this.businessId}`);

    const status = await this.queue.getStatus();
    console.log("[SYNC] Summary:", status);

    const byEntity = await this.pg.query<{
      entity_type: string;
      status: string;
      count: string;
    }>(
      `SELECT entity_type, status, COUNT(*) as count
       FROM sync_operations
       WHERE business_id = $1
       GROUP BY entity_type, status
       ORDER BY entity_type, status`,
      [this.businessId]
    );

    const entityStatus: Record<string, Record<string, number>> = {};
    for (const row of byEntity.rows) {
      entityStatus[row.entity_type] ??= {};
      entityStatus[row.entity_type][row.status] = parseInt(row.count, 10);
    }
    console.log("[SYNC] By Entity:", entityStatus);

    const recentOps = await this.pg.query<SyncOperationRecord>(
      `SELECT *
       FROM sync_operations
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [this.businessId]
    );

    console.log(
      "[SYNC] Recent Operations:",
      recentOps.rows.map((operation) => ({
        id: operation.id.slice(0, 8),
        entity: operation.entity_type,
        operation: operation.operation,
        status: operation.status,
        createdAt: operation.created_at,
      }))
    );
  }

  private async trySelfHealOperation(
    operation: SyncOperationRecord,
    error: string
  ): Promise<boolean> {
    const classifiedError = classifyError(error);

    if (
      operation.operation !== "update" ||
      !SELF_HEAL_INSERTABLE_ENTITIES.has(operation.entity_type) ||
      !classifiedError.isSelfHealable
    ) {
      return false;
    }

    console.log(
      `[SYNC] Self-healing: converting ${operation.entity_type} update to create for ${operation.entity_id} (${classifiedError.code})`
    );

    await this.pg.query(
      `UPDATE sync_operations
       SET operation = $1,
           status = $2,
           sync_attempts = 0,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
         AND business_id = $4`,
      ["create", OPERATION_STATUS.PENDING, operation.id, this.businessId]
    );

    return true;
  }

  private async getDeadLetterOperation(
    deadLetterId: string
  ): Promise<DeadLetterOperationRecord | null> {
    const result = await this.pg.query<DeadLetterOperationRecord>(
      `SELECT *
       FROM sync_dead_letter
       WHERE id = $1
         AND business_id = $2`,
      [deadLetterId, this.businessId]
    );

    return result.rows[0] ?? null;
  }
}
