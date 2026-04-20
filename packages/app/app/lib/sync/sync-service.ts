import type { PGlite } from "@electric-sql/pglite";
import {
  CONFLICT_STRATEGY,
  SYNC_INTERVAL_MS,
  type ConflictStrategy,
} from "./config";
import type { ISyncQueue } from "./types";
import type { ISyncHttpClient } from "./http/sync-http-client";
import { PgSyncQueue } from "./queue/pg-sync-queue";
import { FetchSyncHttpClient } from "./http/fetch-sync-http-client";
import { parsePayload } from "./types";
import type {
  EnqueueParams,
  SyncOperationRecord,
  SyncStatus,
  BatchSyncResponse,
  DeadLetterOperationRecord,
  BackendConflict,
  BackendConflictListResponse,
  BackendConflictResponse,
  ConflictResolution,
  SyncApiResult,
  ClassifiedError,
} from "./types";
import { SyncErrorCode, classifyError } from "./types";
import { SyncInitializationService } from "./sync-initialization-service";
import { SyncAutoRunner } from "./sync-auto-runner";
import { SyncEntityStatusUpdater } from "./sync-entity-status-updater";
import { SyncOperationLifecycleService } from "./sync-operation-lifecycle-service";
import { SyncBatchProcessor } from "./sync-batch-processor";
import { SyncCleanupService } from "./cleanup-service";
import { syncMutex } from "./sync-mutex";

export class SyncService {
  private readonly queue: ISyncQueue;
  private readonly httpClient: ISyncHttpClient;
  private readonly initializationService: SyncInitializationService;
  private readonly autoRunner: SyncAutoRunner;
  private readonly lifecycle: SyncOperationLifecycleService;
  private readonly batchProcessor: SyncBatchProcessor;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;
  private isProcessing = false;

  constructor(
    private pg: PGlite,
    private businessId: string,
    authToken: string,
    options?: {
      queue?: ISyncQueue;
      httpClient?: ISyncHttpClient;
    }
  ) {
    this.queue = (options?.queue ?? new PgSyncQueue(pg, businessId)) as ISyncQueue;
    this.httpClient =
      options?.httpClient ?? new FetchSyncHttpClient(authToken, businessId);
    this.initializationService = new SyncInitializationService(pg, businessId);
    this.autoRunner = new SyncAutoRunner();

    const entityStatusUpdater = new SyncEntityStatusUpdater(pg, businessId);
    this.lifecycle = new SyncOperationLifecycleService(
      pg,
      businessId,
      this.queue,
      entityStatusUpdater
    );
    this.batchProcessor = new SyncBatchProcessor(
      pg,
      businessId,
      this.httpClient,
      this.lifecycle,
      this.autoRunner
    );
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializationService
      .initialize()
      .then(() => {
        this.isInitialized = true;
        console.log("[SyncService] Initialized successfully");
      })
      .catch((error) => {
        this.initializationPromise = null;
        this.isInitialized = false;
        throw error;
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

    const deadLetterOperations = await this.queue.getDeadLetterOperations(1000);
    let retried = 0;

    for (const operation of deadLetterOperations) {
      const success = await this.retryDeadLetterOperation(operation.id);
      if (success) {
        retried += 1;
      }
    }

    return retried;
  }

  async enqueue(params: EnqueueParams): Promise<string> {
    this.ensureInitialized();
    return this.queue.enqueue(params);
  }

  async processPending(
    ignoreOnlineCheck = false
  ): Promise<{ processed: number; failed: number; conflicts: number }> {
    this.ensureInitialized();

    // Acquire mutex to coordinate with pull operations
    const acquired = await syncMutex.acquire("push");
    if (!acquired) {
      console.log("[SYNC] Could not acquire mutex, another operation in progress");
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    if (this.isProcessing) {
      console.log("[SYNC] Already processing, skipping");
      syncMutex.release();
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    this.isProcessing = true;

    try {
      return await this.batchProcessor.processPending(ignoreOnlineCheck);
    } finally {
      this.isProcessing = false;
      syncMutex.release();
    }
  }

  async processGroup(
    groupId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    this.ensureInitialized();

    // Acquire mutex to coordinate with pull operations
    const acquired = await syncMutex.acquire("push");
    if (!acquired) {
      return { success: false, errors: ["Could not acquire sync mutex"] };
    }

    try {
      return await this.batchProcessor.processGroup(groupId);
    } finally {
      syncMutex.release();
    }
  }

  async resolveConflict(
    operationId: string,
    resolution: ConflictStrategy,
    mergedData?: Record<string, unknown>
  ): Promise<boolean> {
    this.ensureInitialized();

    const operation = await this.lifecycle.getOperation(operationId);
    if (!operation || operation.status !== "conflict") {
      return false;
    }

    switch (resolution) {
      case CONFLICT_STRATEGY.SERVER_WINS:
        await this.lifecycle.markCompleted(operationId);
        return true;

      case CONFLICT_STRATEGY.CLIENT_WINS:
      case CONFLICT_STRATEGY.FIELD_MERGE: {
        if (
          resolution === CONFLICT_STRATEGY.FIELD_MERGE &&
          !mergedData
        ) {
          return false;
        }

        // Acquire mutex to coordinate with pull operations
        const acquired = await syncMutex.acquire("push");
        if (!acquired) {
          return false;
        }

        await this.lifecycle.markProcessing(operationId);

        try {
          const result = await this.batchProcessor.syncOperation({
            ...operation,
            payload:
              resolution === CONFLICT_STRATEGY.CLIENT_WINS
                ? mergedData || parsePayload(operation.payload)
                : mergedData,
          });

          if (result.conflict) {
            await this.lifecycle.markConflict(operationId, result.conflict);
            return false;
          }

          if (result.success) {
            await this.lifecycle.markCompleted(operationId);
            return true;
          }

          await this.lifecycle.markFailed(
            operationId,
            result.error ||
              (resolution === CONFLICT_STRATEGY.CLIENT_WINS
                ? "Client-wins resolution failed"
                : "Field-merge resolution failed")
          );
          return false;
        } catch (error) {
          await this.lifecycle.markFailed(
            operationId,
            error instanceof Error ? error.message : String(error)
          );
          return false;
        } finally {
          syncMutex.release();
        }
      }

      case CONFLICT_STRATEGY.MANUAL:
      default:
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
    const seen = new Set<string>();

    return [...pending, ...failed]
      .filter((operation) => {
        if (seen.has(operation.id)) {
          return false;
        }

        seen.add(operation.id);
        return true;
      })
      .slice(0, 50);
  }

  async getDeadLetterOperations(): Promise<DeadLetterOperationRecord[]> {
    this.ensureInitialized();
    return this.queue.getDeadLetterOperations(100);
  }

  async retryOperation(operationId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.queue.retryOperation(operationId);
  }

  async retryDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.lifecycle.retryDeadLetterOperation(deadLetterId);
  }

  async deleteDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.lifecycle.deleteDeadLetterOperation(deadLetterId);
  }

  async clearDeadLetterOperations(): Promise<number> {
    this.ensureInitialized();
    return this.lifecycle.clearDeadLetterOperations();
  }

  async getStatus(): Promise<SyncStatus> {
    this.ensureInitialized();
    return this.queue.getStatus();
  }

  async logDetailedStatus(): Promise<void> {
    this.ensureInitialized();
    return this.lifecycle.logDetailedStatus();
  }

  async deleteOperation(operationId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.lifecycle.deleteOperation(operationId);
  }

  async deleteOperations(operationIds: string[]): Promise<number> {
    this.ensureInitialized();
    return this.lifecycle.deleteOperations(operationIds);
  }

  startAutoSync(): void {
    this.autoRunner.start(() => this.processPending(), SYNC_INTERVAL_MS);
    // Kick one immediate processing pass on startup/restart to avoid waiting full interval.
    void this.processPending();
  }

  stopAutoSync(): void {
    this.autoRunner.stop();
    this.httpClient.abort();
  }

  isRunning(): boolean {
    return this.autoRunner.isRunning();
  }

  async cleanup(): Promise<void> {
    this.stopAutoSync();
    const cleanupService = new SyncCleanupService(
      this.pg,
      this.businessId,
      this.queue
    );
    await cleanupService.cleanup("logout");
  }

  async getBackendConflicts(options?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<BackendConflictListResponse> {
    this.ensureInitialized();
    const result = await this.httpClient.getConflicts(options);
    return result as BackendConflictListResponse;
  }

  async getBackendConflict(
    conflictId: string
  ): Promise<BackendConflictResponse> {
    this.ensureInitialized();
    const result = await this.httpClient.getConflict(conflictId);
    return result as BackendConflictResponse;
  }

  async resolveBackendConflict(
    conflictId: string,
    resolution: "server" | "local" | "merge",
    mergedData?: Record<string, unknown>
  ): Promise<BackendConflictResponse> {
    this.ensureInitialized();
    const result = await this.httpClient.resolveConflict(
      conflictId,
      resolution,
      mergedData
    );
    return result as BackendConflictResponse;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("SyncService not initialized. Call initialize() first.");
    }
  }
}

export type {
  EnqueueParams,
  SyncOperationRecord,
  SyncStatus,
  BatchSyncResponse,
  DeadLetterOperationRecord,
  BackendConflict,
  BackendConflictListResponse,
  BackendConflictResponse,
  ConflictResolution,
  SyncApiResult,
  ClassifiedError,
};
export { SyncErrorCode, classifyError };
