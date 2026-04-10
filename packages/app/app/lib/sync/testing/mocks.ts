/**
 * Mock Implementations for Sync System Tests
 * 
 * Provides mock implementations of sync interfaces for testing.
 */

import type { ISyncQueue } from "../types";
import type { ISyncHttpClient } from "../http/sync-http-client";
import type { SyncOperationRecord, DeadLetterOperationRecord, SyncStatus, EnqueueParams, BatchSyncResponse } from "../types";
import type { ConflictStrategy } from "../config";
import type { QueueOptions } from "../types";

export class MockSyncQueue implements ISyncQueue {
  private operations: Map<string, SyncOperationRecord> = new Map();
  private deadLetter: Map<string, DeadLetterOperationRecord> = new Map();

  async enqueue(params: EnqueueParams): Promise<string> {
    const id = crypto.randomUUID();
    const op: SyncOperationRecord = {
      id,
      business_id: "test-business-id",
      entity_type: params.entity_type,
      operation: params.operation,
      entity_id: params.entityId,
      payload: params.data,
      status: "pending",
      version: 1,
      sync_attempts: 0,
      last_error: null,
      last_attempt_at: null,
      idempotency_key: params.idempotencyKey ?? crypto.randomUUID(),
      sync_group_id: params.syncGroupId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.operations.set(id, op);
    return id;
  }

  async getPending(limit: number, _options?: QueueOptions): Promise<SyncOperationRecord[]> {
    return Array.from(this.operations.values())
      .filter((op) => op.status === "pending" || op.status === "failed")
      .slice(0, limit);
  }

  async getById(id: string): Promise<SyncOperationRecord | null> {
    return this.operations.get(id) ?? null;
  }

  async getByEntityType(entityType: string, entityId: string, statuses: string[]): Promise<SyncOperationRecord[]> {
    return Array.from(this.operations.values()).filter(
      (op) =>
        op.entity_type === entityType &&
        op.entity_id === entityId &&
        statuses.includes(op.status)
    );
  }

  async markProcessing(id: string): Promise<void> {
    const op = this.operations.get(id);
    if (op) op.status = "processing";
  }

  async markCompleted(id: string): Promise<void> {
    const op = this.operations.get(id);
    if (op) op.status = "completed";
  }

  async markFailed(id: string, error: string, attempts: number): Promise<void> {
    const op = this.operations.get(id);
    if (op) {
      op.status = "failed";
      op.last_error = error;
      op.sync_attempts = attempts;
    }
  }

  async markConflict(id: string, conflictData: unknown): Promise<void> {
    const op = this.operations.get(id);
    if (op) {
      op.status = "conflict";
      op.last_error = JSON.stringify(conflictData);
    }
  }

  async moveToDeadLetter(operation: SyncOperationRecord, error: string): Promise<void> {
    this.operations.delete(operation.id);
    this.deadLetter.set(operation.id, {
      id: crypto.randomUUID(),
      business_id: operation.business_id,
      operation_id: operation.id,
      entity_type: operation.entity_type,
      operation: operation.operation,
      entity_id: operation.entity_id,
      data: JSON.stringify(operation.payload),
      error: "Max retries exceeded",
      sync_attempts: operation.sync_attempts + 1,
      original_error: error,
      created_at: new Date().toISOString(),
    });
  }

  async getStatus(): Promise<SyncStatus> {
    const ops = Array.from(this.operations.values());
    return {
      pending: ops.filter((o) => o.status === "pending").length,
      processing: ops.filter((o) => o.status === "processing").length,
      syncing: ops.filter((o) => o.status === "syncing").length,
      completed: ops.filter((o) => o.status === "completed").length,
      failed: ops.filter((o) => o.status === "failed").length,
      conflict: ops.filter((o) => o.status === "conflict").length,
      deadLetter: this.deadLetter.size,
      total: ops.length + this.deadLetter.size,
    };
  }

  async deleteOperation(id: string): Promise<boolean> {
    return this.operations.delete(id);
  }

  async retryOperation(id: string): Promise<boolean> {
    const op = this.operations.get(id);
    if (op && op.status === "failed") {
      op.status = "pending";
      op.sync_attempts = 0;
      op.last_error = null;
      return true;
    }
    return false;
  }

  async getFailedOperations(limit: number): Promise<SyncOperationRecord[]> {
    return Array.from(this.operations.values())
      .filter((op) => op.status === "failed")
      .slice(0, limit);
  }

  async getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord[]> {
    return Array.from(this.deadLetter.values()).slice(0, limit);
  }

  async cleanupCompleted(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const cutoffISO = cutoff.toISOString();

    const toDelete: string[] = [];
    for (const op of this.operations.values()) {
      if (op.status === "completed" && op.updated_at < cutoffISO) {
        toDelete.push(op.id);
      }
    }

    for (const id of toDelete) {
      this.operations.delete(id);
    }

    return toDelete.length;
  }

  clear(): void {
    this.operations.clear();
    this.deadLetter.clear();
  }
}

export class MockSyncHttpClient implements ISyncHttpClient {
  private shouldFail = false;
  private failCount = 0;
  private responseDelay = 0;

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  setFailCount(count: number): void {
    this.failCount = count;
  }

  setResponseDelay(ms: number): void {
    this.responseDelay = ms;
  }

  async sendBatch(operations: SyncOperationRecord[]): Promise<BatchSyncResponse> {
    if (this.responseDelay > 0) {
      await new Promise((r) => setTimeout(r, this.responseDelay));
    }

    if (this.shouldFail && this.failCount > 0) {
      this.failCount--;
      throw new Error("Network error");
    }

    return {
      results: operations.map((op) => ({
        idempotencyKey: op.idempotency_key ?? op.id,
        success: true,
      })),
    };
  }

  async getConflicts(): Promise<{ success: boolean; data: { conflicts: unknown[]; pendingCount: number; pagination: { limit: number; offset: number; hasMore: boolean } } }> {
    return {
      success: true,
      data: {
        conflicts: [],
        pendingCount: 0,
        pagination: { limit: 50, offset: 0, hasMore: false },
      },
    };
  }

  async getConflict(conflictId: string): Promise<{ success: boolean; data: unknown }> {
    return {
      success: true,
      data: { id: conflictId },
    };
  }

  async resolveConflict(conflictId: string, resolution: string, mergedData?: Record<string, unknown>): Promise<{ success: boolean; data: unknown }> {
    return {
      success: true,
      data: { id: conflictId, resolution, mergedData },
    };
  }

  abort(): void {
    // No-op for tests
  }
}

/**
 * Factory function to create a mock sync service with all dependencies
 */
export function createMockSyncService() {
  const queue = new MockSyncQueue();
  const httpClient = new MockSyncHttpClient();
  
  return {
    mocks: {
      queue,
      httpClient,
    },
    service: {
      queue,
      httpClient,
    },
  };
}
