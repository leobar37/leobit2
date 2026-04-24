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
import { SyncAutoRunner } from "./auto-runner";
import { SyncEntityStatusUpdater } from "./entity-status-updater";
import { SyncOperationLifecycleService } from "./operation-lifecycle";
import { SyncBatchProcessor } from "./batch-processor";

export class PushSyncService {
  private readonly queue: ISyncQueue;
  private readonly httpClient: ISyncHttpClient;
  private readonly mutex: ISyncMutex;
  private readonly logger: ISyncLogger;
  private readonly autoRunner: SyncAutoRunner;
  private readonly lifecycleService: SyncOperationLifecycleService | null;
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
    this.autoRunner = options.autoRunner ?? new SyncAutoRunner();
    
    if (options.lifecycleService) {
      this.lifecycleService = options.lifecycleService;
    } else {
      // Create default lifecycle service with minimal configuration
      const entityStatusUpdater = new SyncEntityStatusUpdater(context.pg, context.tenantId, {
        tenantColumn: context.tenantColumn,
      });
      this.lifecycleService = new SyncOperationLifecycleService(
        context.pg,
        context.tenantId,
        this.queue,
        entityStatusUpdater,
        {
          tenantColumn: context.tenantColumn,
        }
      );
    }
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
    this.autoRunner.resetBackoff();
  }

  getBackoffAtMax(): boolean {
    return this.autoRunner.getBackoffAtMax();
  }

  async retryAllDeadLetterOperations(): Promise<number> {
    this.ensureInitialized();
    if (!this.lifecycleService) {
      return 0;
    }

    const operations = await this.queue.getDeadLetterOperations(100);
    let retried = 0;
    for (const op of operations) {
      if (await this.lifecycleService.retryDeadLetterOperation(op.id)) {
        retried++;
      }
    }
    return retried;
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
      const batchProcessor = new SyncBatchProcessor(
        this.context.pg,
        this.context.tenantId,
        this.httpClient,
        this.lifecycleService!,
        this.autoRunner,
        {
          tenantColumn: this.context.tenantColumn,
        }
      );

      return await batchProcessor.processPending(ignoreOnlineCheck);
    } finally {
      this.isProcessing = false;
      this.mutex.release();
    }
  }

  async processGroup(_groupId: string): Promise<{ success: boolean; errors: string[] }> {
    return { success: true, errors: [] };
  }

  async resolveConflict(
    operationId: string,
    resolution: ConflictStrategy,
    mergedData?: Record<string, unknown>
  ): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const operation = await this.queue.getById(operationId);
      if (!operation) {
        return false;
      }

      if (resolution === "server") {
        // Accept server version - delete local operation
        await this.queue.deleteOperation(operationId);
        return true;
      } else if (resolution === "local") {
        // Retry local operation
        await this.queue.retryOperation(operationId);
        return true;
      } else if (resolution === "merge" && mergedData) {
        // Update operation with merged data and retry
        await this.queue.retryOperation(operationId);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error("[PushSyncService]", "Failed to resolve conflict", { operationId, error });
      return false;
    }
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
    return this.queue.getDeadLetterOperations(100);
  }

  async retryOperation(operationId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.queue.retryOperation(operationId);
  }

  async retryDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    this.ensureInitialized();
    if (!this.lifecycleService) {
      return false;
    }
    return this.lifecycleService.retryDeadLetterOperation(deadLetterId);
  }

  async deleteDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    this.ensureInitialized();
    if (!this.lifecycleService) {
      return false;
    }
    return this.lifecycleService.deleteDeadLetterOperation(deadLetterId);
  }

  async clearDeadLetterOperations(): Promise<number> {
    this.ensureInitialized();
    if (!this.lifecycleService) {
      return 0;
    }
    return this.lifecycleService.clearDeadLetterOperations();
  }

  async getStatus(): Promise<SyncStatus> {
    this.ensureInitialized();
    return this.queue.getStatus();
  }

  async logDetailedStatus(): Promise<void> {
    this.ensureInitialized();
    
    const status = await this.queue.getStatus();
    this.logger.info("[PushSyncService]", "Queue status", status);
    
    this.logger.info("[PushSyncService]", "Backoff state", {
      atMax: this.autoRunner.getBackoffAtMax(),
    });
    
    this.logger.info("[PushSyncService]", "Mutex state", {
      busy: this.mutex.isBusy(),
      queueLength: this.mutex.getQueueLength(),
      currentOperation: this.mutex.getCurrentOperation(),
    });

    if (this.lifecycleService) {
      await this.lifecycleService.logDetailedStatus();
    }
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
    if (this.autoRunner.isRunning()) {
      return;
    }
    
    this.autoRunner.start(() => {
      void this.processPending();
    });
  }

  stopAutoSync(): void {
    this.autoRunner.stop();
    
    // Check if abort method exists on HTTP client
    const client = this.httpClient as { abort?: () => void };
    client.abort?.();
  }

  isRunning(): boolean {
    return this.isProcessing || this.autoRunner.isRunning();
  }

  async cleanup(): Promise<void> {
    this.stopAutoSync();
    this.autoRunner.stop();
  }

  async getBackendConflicts(options?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<unknown> {
    this.ensureInitialized();
    try {
      const client = this.httpClient as { getConflicts?: (opts?: typeof options) => Promise<unknown> };
      if (client.getConflicts) {
        return await client.getConflicts(options);
      }
      return { success: false, data: { conflicts: [], pendingCount: 0 } };
    } catch (error) {
      this.logger.error("[PushSyncService]", "Failed to get backend conflicts", { error });
      return { success: false, data: { conflicts: [], pendingCount: 0 } };
    }
  }

  async getBackendConflict(conflictId: string): Promise<unknown> {
    this.ensureInitialized();
    try {
      const client = this.httpClient as { getConflict?: (id: string) => Promise<unknown> };
      if (client.getConflict) {
        return await client.getConflict(conflictId);
      }
      return { success: false, data: null };
    } catch (error) {
      this.logger.error("[PushSyncService]", "Failed to get backend conflict", { conflictId, error });
      return { success: false, data: null };
    }
  }

  async resolveBackendConflict(
    conflictId: string,
    resolution: "server" | "local" | "merge",
    mergedData?: Record<string, unknown>
  ): Promise<unknown> {
    this.ensureInitialized();
    try {
      const client = this.httpClient as { 
        resolveConflict?: (id: string, resolution: string, mergedData?: Record<string, unknown>) => Promise<unknown> 
      };
      if (client.resolveConflict) {
        return await client.resolveConflict(conflictId, resolution, mergedData);
      }
      return { success: false, data: null };
    } catch (error) {
      this.logger.error("[PushSyncService]", "Failed to resolve backend conflict", { conflictId, error });
      return { success: false, data: null };
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("PushSyncService not initialized. Call initialize() first.");
    }
  }
}
