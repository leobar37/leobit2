/**
 * Pull Sync Service
 * Fetches changes from the server and applies them locally
 */

import type { SyncClientEngineContext } from "../client/types";
import type { ISyncLogger } from "../core";
import type { ISyncMutex } from "./sync-mutex";
import type { PullServiceOptions, PullResult, PullStatus, PullHttpClient, CursorStorage } from "./pull-types";
import { ChangeApplier } from "./change-applier";
import { MemoryCursorStorage } from "./pull-types";
import { SyncMutex } from "./sync-mutex";
import { NoOpLogger } from "./change-noop-logger";

export class PullSyncService {
  private readonly applier: ChangeApplier;
  private readonly cursorStorage: CursorStorage;
  private readonly logger: ISyncLogger;
  private readonly mutex: ISyncMutex;
  private readonly httpClient: PullHttpClient;
  private status: PullStatus;
  private autoPullInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly context: SyncClientEngineContext,
    private readonly options: PullServiceOptions
  ) {
    this.applier = options.applier ?? new ChangeApplier(context, {
      logger: options.logger,
      applierConfig: options.applierConfig,
    });
    this.cursorStorage = options.cursorStorage ?? new MemoryCursorStorage();
    this.logger = options.logger ?? new NoOpLogger();
    this.mutex = options.mutex ?? new SyncMutex();
    this.httpClient = options.httpClient;
    this.status = {
      isPulling: false,
      lastPullTime: null,
      lastError: null,
      consecutiveFailures: 0,
      cursor: null,
      isStuck: false,
      consecutiveStalePulls: 0,
    };
  }

  async initialize(): Promise<void> {
    this.status.cursor = this.cursorStorage.get("pull-cursor");
  }

  async pull(): Promise<PullResult> {
    const acquired = await this.mutex.acquire("pull");
    if (!acquired) {
      return { success: false, changesApplied: 0, hasMore: false, error: "Could not acquire mutex" };
    }

    this.status.isPulling = true;

    try {
      const cursor = this.cursorStorage.get("pull-cursor") ?? undefined;
      
      const response = await this.httpClient.getChanges({
        tenantId: this.context.tenantId,
        since: cursor,
        limit: 100,
      });

      if (response.changes.length > 0) {
        const changes = response.changes as any[];
        
        // Apply changes
        const applyResults = await this.applier.applyBatch(changes.map(c => ({
          idempotencyKey: c.idempotencyKey || crypto.randomUUID(),
          entityType: c.entityType,
          operation: c.operation,
          entityId: c.entityId,
          payload: c.payload,
          localTimestamp: c.localTimestamp || new Date().toISOString(),
          processedAt: c.processedAt || new Date().toISOString(),
        })));

        // Update cursor
        if (response.nextSince) {
          this.cursorStorage.set("pull-cursor", response.nextSince);
          this.status.cursor = response.nextSince;
        }

        this.status.lastPullTime = new Date();
        this.status.consecutiveFailures = 0;

        return {
          success: true,
          changesApplied: applyResults.summary.succeeded,
          hasMore: response.hasMore,
        };
      }

      // Update cursor even if no changes
      if (response.nextSince) {
        this.cursorStorage.set("pull-cursor", response.nextSince);
        this.status.cursor = response.nextSince;
      }

      this.status.lastPullTime = new Date();
      this.status.consecutiveFailures = 0;

      return {
        success: true,
        changesApplied: 0,
        hasMore: response.hasMore,
      };
    } catch (error) {
      this.status.consecutiveFailures++;
      this.status.lastError = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        changesApplied: 0,
        hasMore: false,
        error: this.status.lastError,
      };
    } finally {
      this.status.isPulling = false;
      this.mutex.release();
    }
  }

  startAutoPull(): void {
    if (this.autoPullInterval) return;
    
    this.autoPullInterval = setInterval(() => {
      void this.pull();
    }, 10000); // 10 seconds
  }

  stopAutoPull(): void {
    if (this.autoPullInterval) {
      clearInterval(this.autoPullInterval);
      this.autoPullInterval = null;
    }
  }

  isRunning(): boolean {
    return this.status.isPulling;
  }

  forceReset(): void {
    this.cursorStorage.remove("pull-cursor");
    this.status = {
      isPulling: false,
      lastPullTime: null,
      lastError: null,
      consecutiveFailures: 0,
      cursor: null,
      isStuck: false,
      consecutiveStalePulls: 0,
    };
  }

  getStatus(): PullStatus {
    return { ...this.status };
  }

  getIsStuck(): boolean {
    return this.status.isStuck;
  }
}
