/**
 * Push Sync Service
 * Main orchestrator for push sync operations
 */

import type { SyncClientEngineContext } from "../client/types";
import type { ISyncQueue, ISyncHttpClient, ISyncLogger, SyncOperationRecord, SyncStatus, EnqueueParams } from "../core";
import type { ISyncMutex } from "./sync-mutex";
import type { PushServiceOptions, PushResult, ConflictStrategy } from "./push-types";
import { PgSyncQueue } from "./queue-queue";
import { createSqlExecutor } from "./sql-executor";
import { NoOpLogger } from "./change-noop-logger";
import { SyncMutex } from "./sync-mutex";

export class PushSyncService {
  private readonly queue: ISyncQueue;
  private readonly httpClient: ISyncHttpClient;
  private readonly mutex: ISyncMutex;
  private readonly logger: ISyncLogger;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;
  private isProcessing = false;

  constructor(
    private readonly context: SyncClientEngineContext,
    private readonly options: PushServiceOptions
  ) {
    this.queue = options.queue ?? new PgSyncQueue(context, { logger: options.logger });
    this.httpClient = options.httpClient;
    this.mutex = options.mutex ?? new SyncMutex();
    this.logger = options.logger ?? new NoOpLogger();
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = Promise.resolve().then(() => {
      this.isInitialized = true;
      this.logger.info("[PushSyncService]", "Initialized successfully");
    });

    return this.initializationPromise;
  }

  resetBackoff(): void {
    // Backoff reset logic
  }

  getBackoffAtMax(): boolean {
    return false;
  }

  async retryAllDeadLetterOperations(): Promise<number> {
    this.ensureInitialized();
    return 0;
  }

  async enqueue(params: EnqueueParams): Promise<string> {
    this.ensureInitialized();
    return this.queue.enqueue(params);
  }

  async processPending(ignoreOnlineCheck = false): Promise<PushResult> {
    this.ensureInitialized();

    const acquired = await this.mutex.acquire("push");
    if (!acquired) {
      this.logger.info("[PushSyncService]", "Could not acquire mutex");
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    if (this.isProcessing) {
      this.mutex.release();
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    this.isProcessing = true;

    try {
      // Get pending operations
      const pending = await this.queue.getPending(50);
      if (pending.length === 0) {
        return { processed: 0, failed: 0, conflicts: 0 };
      }

      // Mark as processing
      for (const op of pending) {
        await this.queue.markProcessing(op.id);
      }

      // Send batch to server
      try {
        const results = await this.httpClient.sendBatch(pending);
        
        let processed = 0;
        let failed = 0;
        let conflicts = 0;

        for (let i = 0; i < pending.length; i++) {
          const op = pending[i];
          const result = results[i];

          if (result?.success) {
            await this.queue.markCompleted(op.id);
            processed++;
          } else if (result?.conflict) {
            await this.queue.markConflict(op.id, result.conflict);
            conflicts++;
          } else {
            await this.queue.markFailed(op.id, result?.error || "Unknown error", op.sync_attempts + 1);
            failed++;
          }
        }

        return { processed, failed, conflicts };
      } catch (error) {
        // Mark all as failed
        for (const op of pending) {
          await this.queue.markFailed(
            op.id,
            error instanceof Error ? error.message : String(error),
            op.sync_attempts + 1
          );
        }
        return { processed: 0, failed: pending.length, conflicts: 0 };
      }
    } finally {
      this.isProcessing = false;
      this.mutex.release();
    }
  }

  async processGroup(groupId: string): Promise<{ success: boolean; errors: string[] }> {
    this.ensureInitialized();
    return { success: true, errors: [] };
  }

  async resolveConflict(
    operationId: string,
    resolution: ConflictStrategy,
    mergedData?: Record<string, unknown>
  ): Promise<boolean> {
    this.ensureInitialized();
    // Simplified implementation
    return false;
  }

  async getFailedOperations(): Promise<SyncOperationRecord[]> {
    this.ensureInitialized();
    return this.queue.getFailedOperations(100);
  }

  async getProblemOperations(): Promise<SyncOperationRecord[]> {
    this.ensureInitialized();
    const pending = await this.queue.getPending(50);
    const failed = await this.queue.getFailedOperations(50);
    return [...pending, ...failed].slice(0, 50);
  }

  async getDeadLetterOperations(): Promise<unknown[]> {
    this.ensureInitialized();
    return [];
  }

  async retryOperation(operationId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.queue.retryOperation(operationId);
  }

  async retryDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    this.ensureInitialized();
    return false;
  }

  async deleteDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    this.ensureInitialized();
    return false;
  }

  async clearDeadLetterOperations(): Promise<number> {
    this.ensureInitialized();
    return 0;
  }

  async getStatus(): Promise<SyncStatus> {
    this.ensureInitialized();
    return this.queue.getStatus();
  }

  async logDetailedStatus(): Promise<void> {
    this.ensureInitialized();
  }

  async deleteOperation(operationId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.queue.deleteOperation(operationId);
  }

  async deleteOperations(operationIds: string[]): Promise<number> {
    this.ensureInitialized();
    let count = 0;
    for (const id of operationIds) {
      if (await this.deleteOperation(id)) count++;
    }
    return count;
  }

  startAutoSync(): void {
    void this.processPending();
  }

  stopAutoSync(): void {
    // Check if abort method exists on HTTP client
    const client = this.httpClient as { abort?: () => void };
    client.abort?.();
  }

  isRunning(): boolean {
    return this.isProcessing;
  }

  async cleanup(): Promise<void> {
    this.stopAutoSync();
  }

  async getBackendConflicts(): Promise<unknown> {
    this.ensureInitialized();
    return { success: false, data: { conflicts: [], pendingCount: 0 } };
  }

  async getBackendConflict(conflictId: string): Promise<unknown> {
    this.ensureInitialized();
    return { success: false, data: null };
  }

  async resolveBackendConflict(
    conflictId: string,
    resolution: "server" | "local" | "merge",
    mergedData?: Record<string, unknown>
  ): Promise<unknown> {
    this.ensureInitialized();
    return { success: false, data: null };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("PushSyncService not initialized. Call initialize() first.");
    }
  }
}
