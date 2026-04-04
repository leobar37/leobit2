/**
 * PGlite Sync Queue Implementation
 * 
 * Implements ISyncQueue using PGlite for local storage.
 * Extracted from SyncService to enable testing and separation of concerns.
 */

import type { PGlite } from "@electric-sql/pglite";
import type { ISyncQueue } from "./sync-queue";
import type { SyncOperationRecord, DeadLetterOperationRecord, SyncStatus, EnqueueParams } from "../sync-service";
import { OPERATION_STATUS } from "../config";

/**
 * Coalescing plan for merging operations
 */
type CoalescePlan =
  | { type: "merge"; operation: "create" | "update" | "delete"; payload: Record<string, unknown> }
  | { type: "replace"; operation: "create" | "update" | "delete"; payload: Record<string, unknown> }
  | { type: "cancel" }
  | { type: "none" };

/**
 * Normalize dates in payload to ISO strings
 */
function normalizeDatesToISO(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(normalizeDatesToISO);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = normalizeDatesToISO(value);
    }
    return result;
  }
  return obj;
}

/**
 * Parse payload from string or object
 */
function parsePayload(payload: unknown): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof payload === "object") return payload as Record<string, unknown>;
  return {};
}

/**
 * Get coalescing plan for merging operations
 */
function getCoalescePlan(
  existing: SyncOperationRecord,
  incoming: EnqueueParams
): CoalescePlan {
  const existingPayload = parsePayload(existing.payload);

  if (existing.operation === "create") {
    if (incoming.operation === "create" || incoming.operation === "update") {
      return {
        type: "merge",
        operation: "create",
        payload: { ...existingPayload, ...incoming.data },
      };
    }
    if (incoming.operation === "delete") {
      return { type: "cancel" };
    }
  }

  if (existing.operation === "update") {
    if (incoming.operation === "update") {
      return {
        type: "merge",
        operation: "update",
        payload: { ...existingPayload, ...incoming.data },
      };
    }
    if (incoming.operation === "delete") {
      return {
        type: "replace",
        operation: "delete",
        payload: incoming.data,
      };
    }
  }

  return { type: "none" };
}

/**
 * Normalize status key for SyncStatus object
 */
function normalizeStatusKey(status: string): keyof SyncStatus | null {
  switch (status) {
    case OPERATION_STATUS.PENDING: return "pending";
    case OPERATION_STATUS.PROCESSING: return "processing";
    case OPERATION_STATUS.SYNCING: return "syncing";
    case OPERATION_STATUS.COMPLETED: return "completed";
    case OPERATION_STATUS.FAILED: return "failed";
    case OPERATION_STATUS.CONFLICT: return "conflict";
    case OPERATION_STATUS.DEAD_LETTER: return "deadLetter";
    default: return null;
  }
}

/**
 * PGlite-based implementation of ISyncQueue
 */
export class PgSyncQueue implements ISyncQueue {
  constructor(
    private pg: PGlite,
    private businessId: string
  ) {}

  async enqueue(params: EnqueueParams): Promise<string> {
    const id = crypto.randomUUID();
    const idempotencyKey = params.idempotencyKey || crypto.randomUUID();

    console.log(`[PgSyncQueue] Enqueuing operation:`, {
      entityType: params.entity_type,
      operation: params.operation,
      entityId: params.entityId,
      idempotencyKey,
      syncGroupId: params.syncGroupId,
    });

    // Check for existing pending/failed operation on same entity
    const existingOp = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1
         AND entity_type = $2
         AND entity_id = $3
         AND status IN ($4, $5)
       ORDER BY created_at ASC
       LIMIT 1`,
      [
        this.businessId,
        params.entity_type,
        params.entityId,
        OPERATION_STATUS.PENDING,
        OPERATION_STATUS.FAILED,
      ]
    );

    if (existingOp.rows.length > 0) {
      const existing = existingOp.rows[0];
      const plan = getCoalescePlan(existing, params);

      if (plan.type === "cancel") {
        await this.pg.query(
          `DELETE FROM sync_operations WHERE id = $1 AND business_id = $2`,
          [existing.id, this.businessId]
        );
        console.log(`[PgSyncQueue] Cancelled coalesced operations for ${params.entity_type}:${params.entityId}`);
        return existing.id;
      }

      if (plan.type === "merge" || plan.type === "replace") {
        await this.pg.query(
          `UPDATE sync_operations
           SET operation = $1,
               payload = $2::jsonb,
               idempotency_key = $3,
               status = $4,
               last_error = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 AND business_id = $6`,
          [
            plan.operation,
            JSON.stringify(normalizeDatesToISO(plan.payload)),
            idempotencyKey,
            OPERATION_STATUS.PENDING,
            existing.id,
            this.businessId,
          ]
        );
        console.log(`[PgSyncQueue] Coalesced ${existing.operation}+${params.operation} for ${params.entity_type}:${params.entityId}`);
        return existing.id;
      }
    }

    // Check for existing idempotent operation
    const existingIdempotent = await this.pg.query<{ id: string }>(
      `SELECT id FROM sync_operations
       WHERE business_id = $1
         AND idempotency_key = $2
         AND status != $3
       LIMIT 1`,
      [this.businessId, idempotencyKey, OPERATION_STATUS.COMPLETED]
    );

    if (existingIdempotent.rows.length > 0) {
      return existingIdempotent.rows[0].id;
    }

    // Insert new operation
    await this.pg.query(
      `INSERT INTO sync_operations (
         id, business_id, entity_type, operation, entity_id,
         payload, status, version, sync_attempts, last_error,
         last_attempt_at, idempotency_key, sync_group_id, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6::jsonb, $7, $8, 0, NULL,
         NULL, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )`,
      [
        id,
        this.businessId,
        params.entity_type,
        params.operation,
        params.entityId,
        JSON.stringify(normalizeDatesToISO(params.data)),
        OPERATION_STATUS.PENDING,
        (params.data?._localVersion as number) ?? 1,
        params.idempotencyKey ?? null,
        params.syncGroupId ?? null,
      ]
    );

    return id;
  }

  async getPending(limit: number): Promise<SyncOperationRecord[]> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1
         AND status IN ($2, $3)
       ORDER BY created_at ASC
       LIMIT $4`,
      [this.businessId, OPERATION_STATUS.PENDING, OPERATION_STATUS.FAILED, limit]
    );
    return result.rows;
  }

  async getById(id: string): Promise<SyncOperationRecord | null> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations WHERE id = $1 AND business_id = $2`,
      [id, this.businessId]
    );
    return result.rows[0] ?? null;
  }

  async getByEntityType(
    entityType: string,
    entityId: string,
    statuses: string[]
  ): Promise<SyncOperationRecord[]> {
    const placeholders = statuses.map((_, i) => `$${i + 4}`).join(", ");
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1
         AND entity_type = $2
         AND entity_id = $3
         AND status IN (${placeholders})
       ORDER BY created_at ASC`,
      [this.businessId, entityType, entityId, ...statuses]
    );
    return result.rows;
  }

  async markProcessing(id: string): Promise<void> {
    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           last_attempt_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND business_id = $3`,
      [OPERATION_STATUS.PROCESSING, id, this.businessId]
    );
  }

  async markCompleted(id: string): Promise<void> {
    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND business_id = $3`,
      [OPERATION_STATUS.COMPLETED, id, this.businessId]
    );
  }

  async markFailed(id: string, error: string, attempts: number): Promise<void> {
    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           sync_attempts = $2,
           last_error = $3,
           last_attempt_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND business_id = $5`,
      [OPERATION_STATUS.FAILED, attempts, error, id, this.businessId]
    );
  }

  async markConflict(id: string, conflictData: unknown): Promise<void> {
    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           last_error = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND business_id = $4`,
      [OPERATION_STATUS.CONFLICT, JSON.stringify(conflictData), id, this.businessId]
    );
  }

  async moveToDeadLetter(operation: SyncOperationRecord, error: string): Promise<void> {
    const dlqId = crypto.randomUUID();

    await this.pg.query(
      `INSERT INTO sync_dead_letter (
         id, business_id, operation_id, entity_type, operation,
         entity_id, data, error, sync_attempts, original_error, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        dlqId,
        this.businessId,
        operation.id,
        operation.entity_type,
        operation.operation,
        operation.entity_id,
        JSON.stringify(parsePayload(operation.payload)),
        "Max retries exceeded",
        operation.sync_attempts + 1,
        error,
        new Date().toISOString(),
      ]
    );

    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND business_id = $3`,
      [OPERATION_STATUS.DEAD_LETTER, operation.id, this.businessId]
    );
  }

  async getStatus(): Promise<SyncStatus> {
    const result = await this.pg.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count
       FROM sync_operations
       WHERE business_id = $1
       GROUP BY status`,
      [this.businessId]
    );

    const status: SyncStatus = {
      pending: 0, processing: 0, syncing: 0, completed: 0,
      failed: 0, conflict: 0, deadLetter: 0, total: 0,
    };

    for (const row of result.rows) {
      const count = parseInt(row.count, 10);
      const key = normalizeStatusKey(row.status);
      if (!key || key === "deadLetter") continue;
      status[key] = count;
      status.total += count;
    }

    const dlqResult = await this.pg.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM sync_dead_letter WHERE business_id = $1`,
      [this.businessId]
    );
    status.deadLetter = parseInt(dlqResult.rows[0]?.count || "0", 10);
    status.total += status.deadLetter;

    return status;
  }

  async deleteOperation(id: string): Promise<boolean> {
    const result = await this.pg.query(
      `DELETE FROM sync_operations WHERE id = $1 AND business_id = $2`,
      [id, this.businessId]
    );
    return (result.affectedRows ?? 0) > 0;
  }

  async retryOperation(id: string): Promise<boolean> {
    const result = await this.pg.query(
      `UPDATE sync_operations
       SET status = $1, sync_attempts = 0, last_error = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND business_id = $3 AND status = $4`,
      [OPERATION_STATUS.PENDING, id, this.businessId, OPERATION_STATUS.FAILED]
    );
    return (result.affectedRows ?? 0) > 0;
  }

  async getFailedOperations(limit: number): Promise<SyncOperationRecord[]> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1 AND status = $2
       ORDER BY sync_attempts DESC, updated_at DESC
       LIMIT $3`,
      [this.businessId, OPERATION_STATUS.FAILED, limit]
    );
    return result.rows;
  }

  async getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord[]> {
    const result = await this.pg.query<DeadLetterOperationRecord>(
      `SELECT * FROM sync_dead_letter
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [this.businessId, limit]
    );
    return result.rows;
  }
}
