/**
 * PGlite Sync Queue Implementation
 *
 * Implements ISyncQueue using PGlite for local storage.
 * Extracted from SyncService to enable testing and separation of concerns.
 *
 * This implementation is designed to work with the Avileo app's sync operations
 * table schema and provides:
 * - Idempotent operation enqueueing
 * - Operation coalescing (merge/cancel/replace)
 * - Dead letter queue support
 * - Priority-based ordering
 */

import type { PGlite } from "@electric-sql/pglite";
import type {
  ISyncQueue,
  QueueOptions,
  SyncOperationRecord,
  SyncStatus,
  EnqueueParams,
  DeadLetterOperationRecord,
  CoalescePlan,
} from "../core";
import { normalizeDatesToISO, parsePayload, getCoalescePlan } from "../core";
import { syncLogger } from "./sync-logger";

/**
 * Operation status constants.
 * These match the values in the app's sync/config.ts.
 */
export const OPERATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SYNCING: "syncing",
  COMPLETED: "completed",
  FAILED: "failed",
  CONFLICT: "conflict",
  DEAD_LETTER: "dead_letter",
} as const;

/**
 * Priority configuration for entity ordering.
 * Lower number = higher priority (processed first).
 */
export interface EntityPriorityConfig {
  /** Map of entity type to priority level */
  [entityType: string]: number;
}

/**
 * Options for PgSyncQueue construction.
 */
export interface PgSyncQueueOptions {
  /** Function to generate unique IDs (defaults to crypto.randomUUID) */
  generateId?: () => string;
  /** Entity priority configuration for ordering */
  entityPriorities?: EntityPriorityConfig;
}

/**
 * Normalize status key for SyncStatus object
 */
function normalizeStatusKey(status: string): keyof SyncStatus | null {
  switch (status) {
    case OPERATION_STATUS.PENDING:
      return "pending";
    case OPERATION_STATUS.PROCESSING:
      return "processing";
    case OPERATION_STATUS.SYNCING:
      return "syncing";
    case OPERATION_STATUS.COMPLETED:
      return "completed";
    case OPERATION_STATUS.FAILED:
      return "failed";
    case OPERATION_STATUS.CONFLICT:
      return "conflict";
    case OPERATION_STATUS.DEAD_LETTER:
      return "deadLetter";
    default:
      return null;
  }
}

/**
 * Build ORDER BY clause for priority-based ordering.
 */
function buildPriorityOrderByClause(
  priorities: EntityPriorityConfig | undefined
): string {
  if (!priorities || Object.keys(priorities).length === 0) {
    return "ORDER BY created_at ASC";
  }

  const caseStatements = Object.entries(priorities)
    .map(([entityType, priority]) => `WHEN '${entityType}' THEN ${priority}`)
    .join("\n          ");

  return `ORDER BY
          CASE entity_type
            ${caseStatements}
            ELSE 999
          END,
          created_at ASC`;
}

/**
 * PGlite-based implementation of ISyncQueue
 */
export class PgSyncQueue implements ISyncQueue {
  private readonly generateId: () => string;
  private readonly entityPriorities: EntityPriorityConfig;

  constructor(
    private pg: PGlite,
    private businessId: string,
    options?: PgSyncQueueOptions
  ) {
    this.generateId = options?.generateId ?? (() => crypto.randomUUID());
    this.entityPriorities = options?.entityPriorities ?? {};
  }

  async enqueue(params: EnqueueParams): Promise<string> {
    const enqueueStart = performance.now();
    const id = this.generateId();
    const idempotencyKey = params.idempotencyKey || this.generateId();

    syncLogger.info(`[PgSyncQueue]`, `Enqueuing operation`, {
      entityType: params.entity_type,
      operation: params.operation,
      entityId: params.entityId,
      idempotencyKey,
      syncGroupId: params.syncGroupId,
      fastPath: !!params.fastPath,
    });

    if (params.fastPath) {
      const insertStart = performance.now();
      await this.insertOperation({
        id,
        businessId: this.businessId,
        entityType: params.entity_type,
        operation: params.operation,
        entityId: params.entityId,
        payload: normalizeDatesToISO(params.data) as Record<string, unknown>,
        idempotencyKey,
        syncGroupId: params.syncGroupId,
        version: (params.data?._localVersion as number) ?? 1,
      });

      syncLogger.info(
        `[PgSyncQueue]`,
        `Enqueued operation (fastPath) ${params.operation} for ${params.entity_type}:${params.entityId} -> ${id}`
      );
      syncLogger.info(`[Perf][SyncQueue]`, `enqueue fastPath timing`, {
        entityType: params.entity_type,
        operation: params.operation,
        entityId: params.entityId,
        insertMs: Number((performance.now() - insertStart).toFixed(2)),
        totalMs: Number((performance.now() - enqueueStart).toFixed(2)),
      });
      return id;
    }

    // Step 1: Check idempotency - if same key exists with non-completed status, return it
    const idempotencyStart = performance.now();
    const existingByKey = await this.getByIdempotencyKey(idempotencyKey);
    const idempotencyMs = performance.now() - idempotencyStart;
    if (existingByKey && existingByKey.status !== OPERATION_STATUS.COMPLETED) {
      syncLogger.info(
        `[PgSyncQueue]`,
        `Idempotency hit for ${params.entity_type}:${params.entityId} -> ${existingByKey.id}`
      );
      syncLogger.info(`[Perf][SyncQueue]`, `enqueue timing`, {
        entityType: params.entity_type,
        operation: params.operation,
        entityId: params.entityId,
        idempotencyLookupMs: Number(idempotencyMs.toFixed(2)),
        pendingLookupMs: 0,
        coalesceMs: 0,
        insertMs: 0,
        totalMs: Number((performance.now() - enqueueStart).toFixed(2)),
      });
      return existingByKey.id;
    }

    // Step 2: Find existing pending/failed operation for same entity
    const pendingLookupStart = performance.now();
    const existingOp = await this.getPendingForEntity(
      params.entity_type,
      params.entityId
    );
    const pendingLookupMs = performance.now() - pendingLookupStart;

    // Step 3: Apply coalescing logic (pure JS, testable)
    const coalesceStart = performance.now();
    if (existingOp) {
      const plan = getCoalescePlan(existingOp, params);
      const coalesceMs = performance.now() - coalesceStart;

      if (plan.type === "cancel") {
        // create + delete = cancel (entity never reached server)
        await this.deleteOperation(existingOp.id);
        syncLogger.info(
          `[PgSyncQueue]`,
          `Coalesced (cancelled) operation for ${params.entity_type}:${params.entityId}`
        );
        syncLogger.info(`[Perf][SyncQueue]`, `enqueue timing`, {
          entityType: params.entity_type,
          operation: params.operation,
          entityId: params.entityId,
          idempotencyLookupMs: Number(idempotencyMs.toFixed(2)),
          pendingLookupMs: Number(pendingLookupMs.toFixed(2)),
          coalesceMs: Number(coalesceMs.toFixed(2)),
          insertMs: 0,
          totalMs: Number((performance.now() - enqueueStart).toFixed(2)),
        });
        return existingOp.id;
      }

      if (
        (plan.type === "merge" || plan.type === "replace") &&
        plan.operation &&
        plan.payload
      ) {
        // Merge/replace existing operation
        await this.updateOperationCoalesced(existingOp.id, {
          operation: plan.operation,
          payload: plan.payload,
          idempotencyKey,
        });
        syncLogger.info(
          `[PgSyncQueue]`,
          `Coalesced (${plan.type}) operation for ${params.entity_type}:${params.entityId} -> ${existingOp.id}`
        );
        syncLogger.info(`[Perf][SyncQueue]`, `enqueue timing`, {
          entityType: params.entity_type,
          operation: params.operation,
          entityId: params.entityId,
          idempotencyLookupMs: Number(idempotencyMs.toFixed(2)),
          pendingLookupMs: Number(pendingLookupMs.toFixed(2)),
          coalesceMs: Number(coalesceMs.toFixed(2)),
          insertMs: 0,
          totalMs: Number((performance.now() - enqueueStart).toFixed(2)),
        });
        return existingOp.id;
      }
    }

    const coalesceMs = performance.now() - coalesceStart;

    // Step 4: Insert new operation
    const insertStart = performance.now();
    await this.insertOperation({
      id,
      businessId: this.businessId,
      entityType: params.entity_type,
      operation: params.operation,
      entityId: params.entityId,
      payload: normalizeDatesToISO(params.data) as Record<string, unknown>,
      idempotencyKey,
      syncGroupId: params.syncGroupId,
      version: (params.data?._localVersion as number) ?? 1,
    });
    const insertMs = performance.now() - insertStart;

    syncLogger.info(
      `[PgSyncQueue]`,
      `Enqueued operation ${params.operation} for ${params.entity_type}:${params.entityId} -> ${id}`
    );
    syncLogger.info(`[Perf][SyncQueue]`, `enqueue timing`, {
      entityType: params.entity_type,
      operation: params.operation,
      entityId: params.entityId,
      idempotencyLookupMs: Number(idempotencyMs.toFixed(2)),
      pendingLookupMs: Number(pendingLookupMs.toFixed(2)),
      coalesceMs: Number(coalesceMs.toFixed(2)),
      insertMs: Number(insertMs.toFixed(2)),
      totalMs: Number((performance.now() - enqueueStart).toFixed(2)),
    });
    return id;
  }

  /**
   * Get operation by idempotency key (excluding completed)
   */
  private async getByIdempotencyKey(
    key: string
  ): Promise<SyncOperationRecord | null> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1
         AND idempotency_key = $2
         AND status != $3
       LIMIT 1`,
      [this.businessId, key, OPERATION_STATUS.COMPLETED]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Get pending or failed operation for a specific entity
   */
  private async getPendingForEntity(
    entityType: string,
    entityId: string
  ): Promise<SyncOperationRecord | null> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1
         AND entity_type = $2
         AND entity_id = $3
         AND status IN ($4, $5)
       ORDER BY created_at ASC
       LIMIT 1`,
      [
        this.businessId,
        entityType,
        entityId,
        OPERATION_STATUS.PENDING,
        OPERATION_STATUS.FAILED,
      ]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Update an existing operation during coalescing
   */
  private async updateOperationCoalesced(
    id: string,
    data: {
      operation: "create" | "update" | "delete";
      payload: Record<string, unknown>;
      idempotencyKey: string;
    }
  ): Promise<void> {
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
        data.operation,
        JSON.stringify(data.payload),
        data.idempotencyKey,
        OPERATION_STATUS.PENDING,
        id,
        this.businessId,
      ]
    );
  }

  /**
   * Insert a new operation
   */
  private async insertOperation(data: {
    id: string;
    businessId: string;
    entityType: string;
    operation: "create" | "update" | "delete";
    entityId: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    syncGroupId?: string;
    version: number;
  }): Promise<void> {
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
        data.id,
        data.businessId,
        data.entityType,
        data.operation,
        data.entityId,
        JSON.stringify(data.payload),
        OPERATION_STATUS.PENDING,
        data.version,
        data.idempotencyKey,
        data.syncGroupId ?? null,
      ]
    );
  }

  async getPending(
    limit: number,
    options?: QueueOptions
  ): Promise<SyncOperationRecord[]> {
    const orderByClause =
      options?.includePriority && Object.keys(this.entityPriorities).length > 0
        ? buildPriorityOrderByClause(this.entityPriorities)
        : "ORDER BY created_at ASC";

    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1
         AND status IN ($2, $3)
       ${orderByClause}
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

  async moveToDeadLetter(
    operation: SyncOperationRecord,
    error: string
  ): Promise<void> {
    const dlqId = this.generateId();

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
      pending: 0,
      processing: 0,
      syncing: 0,
      completed: 0,
      failed: 0,
      conflict: 0,
      deadLetter: 0,
      total: 0,
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

  async getDeadLetterOperations(
    limit: number
  ): Promise<DeadLetterOperationRecord[]> {
    const result = await this.pg.query<DeadLetterOperationRecord>(
      `SELECT * FROM sync_dead_letter
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [this.businessId, limit]
    );
    return result.rows;
  }

  async cleanupCompleted(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.pg.query(
      `DELETE FROM sync_operations
       WHERE business_id = $1
         AND status = $2
         AND updated_at < $3`,
      [this.businessId, OPERATION_STATUS.COMPLETED, cutoff.toISOString()]
    );

    return result.affectedRows ?? 0;
  }
}
