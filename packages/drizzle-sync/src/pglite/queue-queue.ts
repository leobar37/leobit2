/**
 * PgSyncQueue
 * Implements ISyncQueue using SqlExecutor and repository pattern
 */

import type { SyncClientEngineContext } from "../client/types";
import type { ISyncQueue, SyncOperationRecord, SyncStatus, EnqueueParams, DeadLetterOperationRecord } from "../core";
import type { ISyncLogger } from "../core";
import type { QueueOptions } from "./queue-types";
import { createSqlExecutor } from "./sql-executor";
import { normalizeDatesToISO, parsePayload } from "../core";
import { QueueRepository } from "./queue-repository";
import { OPERATION_STATUS } from "./queue-types";
import { getCoalescePlan } from "./queue-coalescer";

export class PgSyncQueue implements ISyncQueue {
  private readonly context: SyncClientEngineContext;
  private readonly repository: QueueRepository;
  private readonly logger: ISyncLogger | undefined;

  constructor(
    context: SyncClientEngineContext,
    options?: QueueOptions
  ) {
    const ctx = context;
    const opts = options;

    this.context = ctx;
    this.repository = new QueueRepository(
      createSqlExecutor(ctx),
      ctx.tenantId,
      ctx.tenantColumn
    );
    this.logger = opts?.logger;
  }

  async enqueue(params: EnqueueParams): Promise<string> {
    const id = crypto.randomUUID();
    const operation: SyncOperationRecord = {
      id,
      tenant_id: this.context.tenantId,
      [this.context.tenantColumn]: this.context.tenantId,
      entity_type: params.entity_type,
      operation: params.operation,
      entity_id: params.entityId,
      payload: JSON.stringify(params.data || {}),
      status: OPERATION_STATUS.PENDING,
      version: 1,
      sync_attempts: 0,
      idempotency_key: params.idempotencyKey || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
      last_attempt_at: null,
    };

    await this.repository.insert(operation);
    return id;
  }

  async getPending(limit: number): Promise<SyncOperationRecord[]> {
    return this.repository.findPending(limit);
  }

  async getById(id: string): Promise<SyncOperationRecord | null> {
    return this.repository.findById(id);
  }

  async getByEntityType(
    entityType: string,
    entityId: string,
    statuses: string[]
  ): Promise<SyncOperationRecord[]> {
    // This is a simple implementation - could be optimized with specific SQL
    const pending = await this.getPending(1000);
    return pending.filter(
      (op) =>
        op.entity_type === entityType &&
        op.entity_id === entityId &&
        statuses.includes(op.status)
    );
  }

  async markProcessing(id: string): Promise<void> {
    await this.repository.updateStatus(id, OPERATION_STATUS.PROCESSING, {
      last_attempt_at: 'CURRENT_TIMESTAMP',
    });
  }

  async markCompleted(id: string): Promise<void> {
    await this.repository.updateStatus(id, OPERATION_STATUS.COMPLETED, {
      last_error: null,
    });
  }

  async markFailed(id: string, error: string, attempts: number): Promise<void> {
    await this.repository.updateStatus(id, OPERATION_STATUS.FAILED, {
      sync_attempts: attempts,
      last_error: error,
      last_attempt_at: 'CURRENT_TIMESTAMP',
    });
  }

  async markConflict(id: string, conflictData: unknown): Promise<void> {
    await this.repository.updateStatus(id, OPERATION_STATUS.CONFLICT, {
      last_error: JSON.stringify(conflictData),
    });
  }

  async moveToDeadLetter(operation: SyncOperationRecord, error: string): Promise<void> {
    await this.repository.moveToDeadLetter(operation, error);
  }

  async getStatus(): Promise<SyncStatus> {
    return this.repository.getStatus();
  }

  async deleteOperation(id: string): Promise<boolean> {
    try {
      await this.repository.delete(id);
      return true;
    } catch {
      return false;
    }
  }

  async cleanupCompleted(olderThanDays: number): Promise<number> {
    // Simple implementation
    return 0;
  }

  async retryOperation(id: string): Promise<boolean> {
    try {
      await this.repository.updateStatus(id, OPERATION_STATUS.PENDING, {
        sync_attempts: 0,
        last_error: null,
      });
      return true;
    } catch {
      return false;
    }
  }

  async getFailedOperations(limit: number): Promise<SyncOperationRecord[]> {
    const pending = await this.getPending(limit * 2);
    return pending.filter((op) => op.status === OPERATION_STATUS.FAILED).slice(0, limit);
  }

  async getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord[]> {
    return this.repository.getDeadLetterOperations(limit);
  }
}
