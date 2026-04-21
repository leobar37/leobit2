/**
 * Queue Repository
 * Handles all SQL operations for the sync queue using parameterized queries
 */

import type { SqlExecutor } from "./sql-executor";
import type { SyncOperationRecord, SyncStatus, DeadLetterOperationRecord } from "../core";
import { OPERATION_STATUS } from "./queue-types";

export class QueueRepository {
  constructor(
    private executor: SqlExecutor,
    private businessId: string
  ) {}

  async insert(operation: SyncOperationRecord): Promise<void> {
    await this.executor.exec(
      `INSERT INTO sync_operations (
         id, business_id, entity_type, operation, entity_id,
         payload, status, version, sync_attempts, last_error,
         last_attempt_at, idempotency_key, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 0, NULL, NULL, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        operation.id,
        this.businessId,
        operation.entity_type,
        operation.operation,
        operation.entity_id,
        JSON.stringify(operation.payload),
        OPERATION_STATUS.PENDING,
        operation.version,
        operation.idempotency_key,
      ]
    );
  }

  async findPending(limit: number): Promise<SyncOperationRecord[]> {
    const result = await this.executor.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1
         AND status IN ($2, $3)
       ORDER BY created_at ASC
       LIMIT $4`,
      [this.businessId, OPERATION_STATUS.PENDING, OPERATION_STATUS.FAILED, limit]
    );
    return result.rows;
  }

  async findById(id: string): Promise<SyncOperationRecord | null> {
    const result = await this.executor.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations WHERE id = $1 AND business_id = $2`,
      [id, this.businessId]
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<void> {
    const updates: string[] = [`status = $1`, `updated_at = CURRENT_TIMESTAMP`];
    const params: unknown[] = [status];
    
    if (extra) {
      let paramIndex = 2;
      for (const [key, val] of Object.entries(extra)) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(val);
        paramIndex++;
      }
    }
    
    params.push(id, this.businessId);
    
    await this.executor.exec(
      `UPDATE sync_operations
       SET ${updates.join(', ')}
       WHERE id = $${params.length - 1} AND business_id = $${params.length}`,
      params
    );
  }

  async delete(id: string): Promise<void> {
    await this.executor.exec(
      `DELETE FROM sync_operations WHERE id = $1 AND business_id = $2`,
      [id, this.businessId]
    );
  }

  async getStatus(): Promise<SyncStatus> {
    const result = await this.executor.query<{ status: string; count: string }>(
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
      switch (row.status) {
        case OPERATION_STATUS.PENDING: status.pending = count; break;
        case OPERATION_STATUS.PROCESSING: status.processing = count; break;
        case OPERATION_STATUS.SYNCING: status.syncing = count; break;
        case OPERATION_STATUS.COMPLETED: status.completed = count; break;
        case OPERATION_STATUS.FAILED: status.failed = count; break;
        case OPERATION_STATUS.CONFLICT: status.conflict = count; break;
        case OPERATION_STATUS.DEAD_LETTER: status.deadLetter = count; break;
      }
      status.total += count;
    }

    return status;
  }

  async moveToDeadLetter(operation: SyncOperationRecord, error: string): Promise<void> {
    await this.executor.exec(
      `INSERT INTO sync_dead_letter (
         id, business_id, operation_id, entity_type, operation,
         entity_id, data, error, sync_attempts, original_error, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        crypto.randomUUID(),
        this.businessId,
        operation.id,
        operation.entity_type,
        operation.operation,
        operation.entity_id,
        JSON.stringify(operation.payload),
        "Max retries exceeded",
        operation.sync_attempts + 1,
        error,
        new Date().toISOString(),
      ]
    );

    await this.executor.exec(
      `UPDATE sync_operations
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND business_id = $3`,
      [OPERATION_STATUS.DEAD_LETTER, operation.id, this.businessId]
    );
  }

  async getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord[]> {
    const result = await this.executor.query<DeadLetterOperationRecord>(
      `SELECT * FROM sync_dead_letter WHERE business_id = $1 LIMIT $2`,
      [this.businessId, limit]
    );
    return result.rows;
  }
}
