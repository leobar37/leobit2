/**
 * React Runtime Adapter for Avileo Sync
 *
 * Bridges the @avileo/drizzle-sync/react library to the app's existing
 * sync services (SyncService, PullService, syncEvents).
 *
 * This adapter:
 * - Implements SyncReactRuntime interface from the library
 * - Adapts app-specific sync state to the library's SyncStateSnapshot
 * - Bridges app-specific events to the library's SyncEventSource
 * - Keeps query invalidation logic in app (not in library)
 * - Provides reactive log/conflict support via syncLogger and syncService
 */

import type {
  SyncReactRuntime,
  SyncStateSnapshot,
  PushStateSnapshot,
  PullStateSnapshot,
  SyncLogEntry,
  SyncConflictRecord,
} from "@avileo/drizzle-sync/react";
import type { BackendConflict, SyncClientEngine, SyncClientServicePort } from "@avileo/drizzle-sync/client";
import { getQueryKeysForEntity } from "./query-keys";
import type { QueryClient } from "@tanstack/react-query";
import { syncLogger } from "@avileo/drizzle-sync/pglite";

/**
 * Default sync state snapshot
 */
const DEFAULT_SYNC_STATE: SyncStateSnapshot = {
  isSyncing: false,
  isOnline: true,
  isStuck: false,
  lastSyncTime: null,
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  deadLetterCount: 0,
};

/**
 * Adapter that implements SyncReactRuntime for the app.
 */
export class AvileoSyncReactRuntime implements SyncReactRuntime {
  private listeners = new Set<() => void>();
  private logListeners = new Set<() => void>();
  private conflictListeners = new Set<() => void>();
  private currentState: SyncStateSnapshot;
  private cachedPushStatus: Awaited<ReturnType<SyncClientServicePort["getStatus"]>> | null = null;
  private cachedConflicts: SyncConflictRecord[] = [];
  private conflictsLoading = false;
  private disposed = false;

  constructor(
    private engine: SyncClientEngine,
    private queryClient: QueryClient,
    private startOnMount: boolean
  ) {
    this.currentState = { ...DEFAULT_SYNC_STATE };
    void this.initialize();
  }

  /**
   * Get current sync state snapshot
   */
  getState(): SyncStateSnapshot {
    return this.currentState;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Event source for subscribing to specific events
   */
  get eventSource() {
    return this.engine.getEventEmitter();
  }

  /**
   * Get current logs from syncLogger
   */
  getLogs(): SyncLogEntry[] {
    const entries = syncLogger.getEntries() ?? [];
    // Map from core SyncLogEntry format to react SyncLogEntry format
    return entries.map((entry) => ({
      timestamp: entry.timestamp instanceof Date 
        ? entry.timestamp.toISOString() 
        : String(entry.timestamp),
      level: entry.level as "debug" | "info" | "warn" | "error",
      message: entry.prefix ? `[${entry.prefix}] ${entry.message}` : entry.message,
      data: entry.data as Record<string, unknown> | undefined,
    }));
  }

  /**
   * Subscribe to log changes
   * Logs are updated as part of the general sync runtime updates.
   */
  subscribeLogs(listener: () => void): () => void {
    this.logListeners.add(listener);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  /**
   * Get current conflicts from backend
   */
  getConflicts(): SyncConflictRecord[] {
    return this.cachedConflicts;
  }

  /**
   * Subscribe to conflict changes
   */
  subscribeConflicts(listener: () => void): () => void {
    this.conflictListeners.add(listener);
    return () => {
      this.conflictListeners.delete(listener);
    };
  }

  /**
   * Dispose of the runtime and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.listeners.clear();
    this.logListeners.clear();
    this.conflictListeners.clear();
    void this.engine.stop();
  }

  private async initialize(): Promise<void> {
    try {
      await this.engine.initialize();
      if (this.startOnMount) {
        await this.engine.start();
      }
      const syncOperations = this.engine.getSyncOperations();
      this.cachedPushStatus = syncOperations ? await syncOperations.getStatus() : null;
      this.updateState();
      await this.refreshConflicts();
    } catch (error) {
      console.error("[AvileoSyncReactRuntime] Failed to load initial state:", error);
    }
  }

  /**
   * Refresh conflicts from backend (resilient to errors)
   */
  private async refreshConflicts(): Promise<void> {
    if (this.conflictsLoading || this.disposed) return;
    
    // Skip if offline
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    this.conflictsLoading = true;
    try {
      const syncOperations = this.engine.getSyncOperations();
      if (!syncOperations) return;
      const result = await syncOperations.getBackendConflicts({ status: "pending", limit: 50 });
      if (result.success && result.data?.conflicts) {
        this.cachedConflicts = result.data.conflicts.map((c: BackendConflict) => ({
          id: c.id,
          entityType: c.entityType,
          entityId: c.entityId,
          localData: c.localData as Record<string, unknown>,
          serverData: c.serverData as Record<string, unknown>,
          localVersion: c.localVersion,
          serverVersion: c.serverVersion,
          status: c.status as "pending" | "resolved",
          resolution: c.resolution as "server" | "local" | "merge" | null,
          createdAt: c.createdAt,
          resolvedAt: c.resolvedAt,
        }));
        this.notifyConflictListeners();
      }
    } catch (error) {
      // Silently handle errors - conflicts are optional feature
      if (error instanceof Error && !error.message.includes("not initialized")) {
        console.warn("[AvileoSyncReactRuntime] Failed to refresh conflicts:", error.message);
      }
    } finally {
      this.conflictsLoading = false;
    }
  }

  /**
   * Compute current state from services
   */
  private computeState(): SyncStateSnapshot {
    const pullStatus = this.engine.getPullService()?.getStatus() ?? {
      isPulling: false,
      lastPullTime: null,
      lastError: null,
      consecutiveFailures: 0,
      cursor: null,
      isStuck: false,
      consecutiveStalePulls: 0,
    };
    const pushStatus = this.cachedPushStatus || {
      pending: 0,
      processing: 0,
      syncing: 0,
      completed: 0,
      failed: 0,
      conflict: 0,
      deadLetter: 0,
      total: 0,
    };

    // Build rich push snapshot
    const pushSnapshot: PushStateSnapshot = {
      isProcessing: pushStatus.processing > 0 || pushStatus.syncing > 0,
      pendingCount: pushStatus.pending,
      processingCount: pushStatus.processing,
      syncingCount: pushStatus.syncing,
      completedCount: pushStatus.completed,
      failedCount: pushStatus.failed,
      conflictCount: pushStatus.conflict,
      deadLetterCount: pushStatus.deadLetter,
      totalCount: pushStatus.total,
    };

    // Build rich pull snapshot
    const pullSnapshot: PullStateSnapshot = {
      isPulling: pullStatus.isPulling,
      lastPullTime: pullStatus.lastPullTime,
      lastError: pullStatus.lastError,
      consecutiveFailures: pullStatus.consecutiveFailures,
      cursor: pullStatus.cursor,
      isStuck: pullStatus.isStuck,
      consecutiveStalePulls: pullStatus.consecutiveStalePulls,
    };

    return {
      isSyncing: pullStatus.isPulling || pushStatus.processing > 0 || pushStatus.syncing > 0,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      isStuck: pullStatus.isStuck,
      lastSyncTime: pullStatus.lastPullTime,
      pendingCount: pushStatus.pending + pushStatus.processing,
      failedCount: pushStatus.failed,
      conflictCount: pushStatus.conflict,
      deadLetterCount: pushStatus.deadLetter,
      // Rich push/pull snapshots
      push: pushSnapshot,
      pull: pullSnapshot,
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(partial?: Partial<SyncStateSnapshot>): void {
    const newState = { ...this.computeState(), ...partial };
    this.currentState = newState;
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error("[AvileoSyncReactRuntime] Error in listener:", error);
      }
    }
  }

  /**
   * Notify all log listeners
   */
  private notifyLogListeners(): void {
    for (const listener of this.logListeners) {
      try {
        listener();
      } catch (error) {
        console.error("[AvileoSyncReactRuntime] Error in log listener:", error);
      }
    }
  }

  /**
   * Notify all conflict listeners
   */
  private notifyConflictListeners(): void {
    for (const listener of this.conflictListeners) {
      try {
        listener();
      } catch (error) {
        console.error("[AvileoSyncReactRuntime] Error in conflict listener:", error);
      }
    }
  }
}

/**
 * Factory function to create the Avileo sync runtime
 */
export function createAvileoSyncRuntime(
  engine: SyncClientEngine,
  queryClient: QueryClient,
  startOnMount = true
): SyncReactRuntime {
  const runtime = new AvileoSyncReactRuntime(engine, queryClient, startOnMount);
  const events = engine.getEventEmitter();

  const invalidateEntities = (entityTypes: string[]) => {
    for (const entityType of entityTypes) {
      const keys = getQueryKeysForEntity(entityType);
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    }
  };

  events.on("pull:complete", async (event) => {
    const syncOperations = engine.getSyncOperations();
    if (syncOperations) {
      runtime["cachedPushStatus"] = await syncOperations.getStatus();
    }
    invalidateEntities(event.entityTypes);
    runtime["updateState"]();
    runtime["notifyLogListeners"]();
  });

  events.on("pull:error", () => {
    runtime["updateState"]();
    runtime["notifyLogListeners"]();
  });

  events.on("pull:stale", () => {
    runtime["updateState"]();
  });

  events.on("sync:online", () => {
    runtime["updateState"]({ isOnline: true });
    void runtime["refreshConflicts"]();
  });

  events.on("sync:offline", () => {
    runtime["updateState"]({ isOnline: false });
  });

  events.on("push:complete", async () => {
    const syncOperations = engine.getSyncOperations();
    if (syncOperations) {
      runtime["cachedPushStatus"] = await syncOperations.getStatus();
    }
    runtime["updateState"]();
    runtime["notifyLogListeners"]();
  });

  return runtime;
}
