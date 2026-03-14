import type { PGlite } from "@electric-sql/pglite";
import {
  MAX_RETRIES,
  BATCH_SIZE,
  SYNC_INTERVAL_MS,
  OPERATION_STATUS,
  CONFLICT_STRATEGY,
  type OperationStatus,
  type ConflictStrategy,
} from "./config";

export interface EnqueueParams {
  entity_type: string;
  operation: "insert" | "update" | "delete";
  entityId: string;
  data: Record<string, unknown>;
  idempotencyKey?: string;
  syncGroupId?: string;
}

export interface SyncOperationRecord {
  id: string;
  entity_type: string;
  operation: "insert" | "update" | "delete";
  entity_id: string;
  payload: unknown;
  status: OperationStatus;
  version: number;
  sync_attempts: number;
  last_error: string | null;
  last_attempt_at: string | null;
  idempotency_key: string | null;
  sync_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncStatus {
  pending: number;
  processing: number;
  syncing: number;
  completed: number;
  failed: number;
  conflict: number;
  deadLetter: number;
  total: number;
}

export interface BatchSyncResponse {
  results: Array<{
    idempotencyKey: string;
    success: boolean;
    error?: string;
    conflict?: {
      serverData: Record<string, unknown>;
      suggestedMerge: Record<string, unknown>;
    };
  }>;
}

export interface ConflictResolution {
  resolution: ConflictStrategy;
  mergedData?: Record<string, unknown>;
}

type SyncApiResult = {
  idempotencyKey: string;
  success: boolean;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
};

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function parsePayload(payload: unknown): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof payload === "object") {
    return payload as Record<string, unknown>;
  }
  return {};
}

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

export class SyncService {
  private pg: PGlite;
  private businessId: string;
  private authToken: string;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  constructor(pg: PGlite, businessId: string, authToken: string) {
    this.pg = pg;
    this.businessId = businessId;
    this.authToken = authToken;
    void this.initTables();
  }

  private async initTables(): Promise<void> {
    await this.pg.exec(`
      CREATE TABLE IF NOT EXISTS sync_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        sync_group_id TEXT,
        operation TEXT NOT NULL,
        payload JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        version INTEGER NOT NULL DEFAULT 1,
        sync_attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        last_attempt_at TIMESTAMP,
        idempotency_key TEXT UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS entity_id TEXT;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS sync_group_id TEXT;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS payload JSONB;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS last_error TEXT;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_group ON sync_operations(sync_group_id);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_idempotency ON sync_operations(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_created ON sync_operations(created_at);
    `);

    await this.pg.exec(`
      CREATE TABLE IF NOT EXISTS sync_dead_letter (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        operation TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        error TEXT NOT NULL,
        sync_attempts INTEGER NOT NULL,
        original_error TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_operation_id ON sync_dead_letter(operation_id);
    `);
  }

  async enqueue(params: EnqueueParams): Promise<string> {
    // Always generate a proper UUID for the operation ID
    const id = crypto.randomUUID();
    const idempotencyKey = params.idempotencyKey || crypto.randomUUID();

    const existingOp = await this.pg.query<{ id: string }>(
      `SELECT id
       FROM sync_operations
       WHERE idempotency_key = '${escapeSqlString(idempotencyKey)}'
         AND status != '${OPERATION_STATUS.COMPLETED}'
       LIMIT 1`
    );

    if (existingOp.rows.length > 0) {
      return existingOp.rows[0].id;
    }

    await this.pg.exec(`
      INSERT INTO sync_operations (
        id,
        entity_type,
        operation,
        entity_id,
        payload,
        status,
        version,
        sync_attempts,
        last_error,
        last_attempt_at,
        idempotency_key,
        sync_group_id,
        created_at,
        updated_at
      ) VALUES (
        '${escapeSqlString(id)}',
        '${escapeSqlString(params.entity_type)}',
        '${params.operation}',
        '${escapeSqlString(params.entityId)}',
        '${escapeSqlString(JSON.stringify(params.data))}'::jsonb,
        '${OPERATION_STATUS.PENDING}',
        1,
        0,
        NULL,
        NULL,
        ${params.idempotencyKey ? `'${escapeSqlString(params.idempotencyKey)}'` : "NULL"},
        ${params.syncGroupId ? `'${escapeSqlString(params.syncGroupId)}'` : "NULL"},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);

    return id;
  }

  async processPending(): Promise<{ processed: number; failed: number; conflicts: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      const pendingOps = await this.pg.query<SyncOperationRecord>(`
        SELECT *
        FROM sync_operations
        WHERE status IN ('pending', 'failed')
          AND sync_attempts < ${MAX_RETRIES}
        ORDER BY created_at ASC
        LIMIT ${BATCH_SIZE}
      `);

      for (const op of pendingOps.rows) {
        try {
          await this.markProcessing(op.id);
          const result = await this.syncOperation(op);

          if (result.conflict) {
            await this.markConflict(op.id, result.conflict);
            conflicts++;
          } else if (result.success) {
            await this.markCompleted(op.id);
            processed++;
          } else {
            await this.markFailed(op.id, result.error || "Unknown error");
            failed++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.markFailed(op.id, errorMessage);
          failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed, conflicts };
  }

  async processGroup(groupId: string): Promise<{ success: boolean; errors: string[] }> {
    const groupOps = await this.pg.query<SyncOperationRecord>(
      `SELECT *
       FROM sync_operations
       WHERE sync_group_id = '${escapeSqlString(groupId)}'
         AND status IN ('pending', 'failed')
       ORDER BY created_at ASC`
    );

    if (groupOps.rows.length === 0) {
      return { success: true, errors: [] };
    }

    try {
      const response = await this.sendBatchToServer(groupOps.rows);
      const errors: string[] = [];

      for (const op of groupOps.rows) {
        const result = response.results.find(
          (item) => item.idempotencyKey === (op.idempotency_key ?? op.id)
        );

        if (!result) {
          await this.markFailed(op.id, "Batch sync returned no result for operation");
          errors.push("Batch sync returned no result for operation");
          continue;
        }

        if (result.success) {
          await this.markCompleted(op.id);
        } else if (result.conflict) {
          await this.markConflict(op.id, result.conflict);
        } else {
          const error = result.error || "Batch sync failed";
          await this.markFailed(op.id, error);
          errors.push(error);
        }
      }

      return { success: errors.length === 0, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      for (const op of groupOps.rows) {
        await this.markFailed(op.id, errorMessage);
      }

      return { success: false, errors: [errorMessage] };
    }
  }

  async resolveConflict(
    operationId: string,
    resolution: ConflictStrategy,
    mergedData?: Record<string, unknown>
  ): Promise<boolean> {
    const op = await this.getOperation(operationId);
    if (!op || op.status !== OPERATION_STATUS.CONFLICT) {
      return false;
    }

    switch (resolution) {
      case CONFLICT_STRATEGY.SERVER_WINS:
        await this.markCompleted(operationId);
        return true;

      case CONFLICT_STRATEGY.CLIENT_WINS:
        await this.markProcessing(operationId);
        try {
          const result = await this.syncOperation({
            ...op,
            payload: mergedData || parsePayload(op.payload),
          });
          if (result.success) {
            await this.markCompleted(operationId);
            return true;
          }
          await this.markFailed(operationId, result.error || "Client-wins resolution failed");
          return false;
        } catch (error) {
          await this.markFailed(operationId, error instanceof Error ? error.message : String(error));
          return false;
        }

      case CONFLICT_STRATEGY.FIELD_MERGE:
        if (!mergedData) {
          return false;
        }
        await this.markProcessing(operationId);
        try {
          const result = await this.syncOperation({
            ...op,
            payload: mergedData,
          });
          if (result.success) {
            await this.markCompleted(operationId);
            return true;
          }
          await this.markFailed(operationId, result.error || "Field-merge resolution failed");
          return false;
        } catch (error) {
          await this.markFailed(operationId, error instanceof Error ? error.message : String(error));
          return false;
        }

      case CONFLICT_STRATEGY.MANUAL:
        return false;

      default:
        return false;
    }
  }

  async getFailedOperations(): Promise<SyncOperationRecord[]> {
    const result = await this.pg.query<SyncOperationRecord>(`
      SELECT *
      FROM sync_operations
      WHERE status = 'failed'
      ORDER BY sync_attempts DESC, updated_at DESC
      LIMIT 100
    `);
    return result.rows;
  }

  async retryOperation(operationId: string): Promise<boolean> {
    const op = await this.getOperation(operationId);
    if (!op || op.status !== OPERATION_STATUS.FAILED) {
      return false;
    }

    await this.markProcessing(operationId);

    try {
      const result = await this.syncOperation(op);
      if (result.success) {
        await this.markCompleted(operationId);
        return true;
      }
      await this.markFailed(operationId, result.error || "Retry failed");
      return false;
    } catch (error) {
      await this.markFailed(operationId, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async getStatus(): Promise<SyncStatus> {
    const result = await this.pg.query<{ status: string; count: string }>(`
      SELECT status, COUNT(*) as count
      FROM sync_operations
      GROUP BY status
    `);

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
      if (!key) continue;
      status[key] = count;
      status.total += count;
    }

    return status;
  }

  async deleteOperation(operationId: string): Promise<boolean> {
    try {
      await this.pg.exec(`
        DELETE FROM sync_operations WHERE id = '${escapeSqlString(operationId)}'
      `);
      return true;
    } catch (error) {
      console.error("Failed to delete operation:", error);
      return false;
    }
  }

  async deleteOperations(operationIds: string[]): Promise<number> {
    if (operationIds.length === 0) {
      return 0;
    }

    try {
      const idsSql = operationIds
        .map((id) => escapeSqlString(id))
        .join("', '");

      await this.pg.exec(`
        DELETE FROM sync_operations WHERE id IN ('${idsSql}')
      `);

      return operationIds.length;
    } catch (error) {
      console.error("Failed to delete operations:", error);
      return 0;
    }
  }

  startAutoSync(): void {
    if (this.syncIntervalId) {
      return;
    }

    this.syncIntervalId = setInterval(async () => {
      if (navigator.onLine) {
        await this.processPending();
      }
    }, SYNC_INTERVAL_MS);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  private async getOperation(id: string): Promise<SyncOperationRecord | null> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  private async markProcessing(id: string): Promise<void> {
    await this.pg.exec(`
      UPDATE sync_operations
      SET status = '${OPERATION_STATUS.PROCESSING}',
          last_attempt_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = '${escapeSqlString(id)}'
    `);
  }

  private async markCompleted(id: string): Promise<void> {
    // Get operation details to update the entity's sync_status
    const op = await this.getOperation(id);

    await this.pg.exec(`
      UPDATE sync_operations
      SET status = '${OPERATION_STATUS.COMPLETED}',
          last_error = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = '${escapeSqlString(id)}'
    `);

    // Update the entity's sync_status to synced
    if (op && (op.entity_type === 'sales' || op.entity_type === 'customers')) {
      try {
        await this.pg.exec(`
          UPDATE ${op.entity_type}
          SET sync_status = 'synced',
              sync_attempts = 0,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = '${escapeSqlString(op.entity_id)}'
        `);
      } catch (error) {
        // Log error but don't fail the sync operation
        console.warn(`Failed to update ${op.entity_type} sync_status for ${op.entity_id}:`, error);
      }
    }
  }

  private async markFailed(id: string, error: string): Promise<void> {
    const op = await this.getOperation(id);
    if (!op) return;

    const newAttempts = op.sync_attempts + 1;

    if (newAttempts >= MAX_RETRIES) {
      await this.moveToDeadLetter(id, error);
      return;
    }

    await this.pg.exec(`
      UPDATE sync_operations
      SET status = '${OPERATION_STATUS.FAILED}',
          sync_attempts = ${newAttempts},
          last_error = '${escapeSqlString(error)}',
          last_attempt_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = '${escapeSqlString(id)}'
    `);
  }

  private async markConflict(
    id: string,
    conflictData: {
      serverData: Record<string, unknown>;
      suggestedMerge: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.pg.exec(`
      UPDATE sync_operations
      SET status = '${OPERATION_STATUS.CONFLICT}',
          last_error = '${escapeSqlString(JSON.stringify(conflictData))}',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = '${escapeSqlString(id)}'
    `);
  }

  private async moveToDeadLetter(operationId: string, originalError: string): Promise<void> {
    const op = await this.getOperation(operationId);
    if (!op) return;

    const dlqId = crypto.randomUUID();

    await this.pg.exec(`
      INSERT INTO sync_dead_letter (
        id,
        operation_id,
        entity_type,
        operation,
        entity_id,
        data,
        error,
        sync_attempts,
        original_error,
        created_at
      ) VALUES (
        '${escapeSqlString(dlqId)}',
        '${escapeSqlString(operationId)}',
        '${escapeSqlString(op.entity_type)}',
        '${op.operation}',
        '${escapeSqlString(op.entity_id)}',
        '${escapeSqlString(JSON.stringify(parsePayload(op.payload)))}',
        'Max retries exceeded',
        ${op.sync_attempts},
        '${escapeSqlString(originalError)}',
        ${Date.now()}
      )
    `);

    await this.pg.exec(`
      UPDATE sync_operations
      SET status = '${OPERATION_STATUS.DEAD_LETTER}',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = '${escapeSqlString(operationId)}'
    `);
  }

  private async syncOperation(
    op: SyncOperationRecord
  ): Promise<{
    success: boolean;
    error?: string;
    conflict?: {
      serverData: Record<string, unknown>;
      suggestedMerge: Record<string, unknown>;
    };
  }> {
    try {
      const response = await this.sendBatchToServer([op]);
      const result = response.results.find(
        (item) => item.idempotencyKey === (op.idempotency_key ?? op.id)
      );

      if (!result) {
        return { success: false, error: "Sync batch returned no result for operation" };
      }

      if (result.conflict) {
        return { success: false, conflict: result.conflict };
      }

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async sendBatchToServer(
    operations: SyncOperationRecord[]
  ): Promise<BatchSyncResponse> {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5201";

    const response = await fetch(`${apiUrl}/sync/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
        "x-business-id": this.businessId,
      },
      body: JSON.stringify({
        operations: operations.map((op) => ({
          idempotencyKey: op.idempotency_key ?? op.id,
          entityType: op.entity_type,
          entityId: op.entity_id,
          operation: op.operation === "insert" ? "create" : op.operation,
          payload: parsePayload(op.payload),
          localVersion: op.version,
          localTimestamp: new Date(op.updated_at).toISOString(),
          ...(op.sync_group_id ? { syncGroupId: op.sync_group_id } : {}),
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync batch failed: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as {
      success?: boolean;
      data?: {
        results?: SyncApiResult[];
      };
    };

    if (!body.success || !body.data?.results) {
      throw new Error("Sync batch returned an invalid response");
    }

    return {
      results: body.data.results.map((result) => ({
        idempotencyKey: result.idempotencyKey,
        success: result.success,
        error: result.error,
        conflict: result.conflict
          ? {
              serverData: result.conflict.serverData,
              suggestedMerge: result.conflict.serverData,
            }
          : undefined,
      })),
    };
  }
}
