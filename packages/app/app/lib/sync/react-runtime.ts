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
  SyncEventSource,
  PushStateSnapshot,
  PullStateSnapshot,
  SyncLogEntry,
  SyncConflictRecord,
} from "@avileo/drizzle-sync/react";
import type { SyncService, SyncStatus, BackendConflict } from "./sync-service";
import type { PullService } from "./pull-service";
import { syncEvents } from "./sync-events";
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
  private cachedPushStatus: SyncStatus | null = null;
  private cachedConflicts: SyncConflictRecord[] = [];
  private conflictsLoading = false;
  private unsubscribeFromEvents: (() => void) | null = null;
  private disposed = false;

  constructor(
    private syncService: SyncService,
    private pullService: PullService,
    private queryClient: QueryClient
  ) {
    this.currentState = { ...DEFAULT_SYNC_STATE };

    // Subscribe to app-specific sync events
    this.subscribeToEvents();

    // Load initial state asynchronously
    this.loadInitialState();
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
  eventSource: SyncEventSource = {
    on: (eventType: string, handler: (event: unknown) => void) => {
      // Map library event types to app-specific events
      return syncEvents.on(eventType as never, handler as never);
    },
  };

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

    if (this.unsubscribeFromEvents) {
      this.unsubscribeFromEvents();
      this.unsubscribeFromEvents = null;
    }

    this.listeners.clear();
    this.logListeners.clear();
    this.conflictListeners.clear();
  }

  /**
   * Load initial state asynchronously
   */
  private async loadInitialState(): Promise<void> {
    try {
      this.cachedPushStatus = await this.syncService.getStatus();
      this.updateState();
      // Load conflicts in background (non-blocking)
      this.refreshConflicts();
    } catch (error) {
      // Silently ignore "not initialized" errors during startup
      if (error instanceof Error && error.message.includes("not initialized")) {
        return;
      }
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
      const result = await this.syncService.getBackendConflicts({ status: "pending", limit: 50 });
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
    const pullStatus = this.pullService.getStatus();
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
   * Subscribe to app-specific sync events
   */
  private subscribeToEvents(): void {
    const handleStatusChanged = (status: {
      pending: number;
      failed: number;
      conflict: number;
      deadLetter: number;
    }) => {
      // Update cached push status from event
      if (this.cachedPushStatus) {
        this.cachedPushStatus = {
          ...this.cachedPushStatus,
          ...status,
        };
      }
      this.updateState();
      // Also notify log listeners since logs may have changed
      this.notifyLogListeners();
    };

    const handlePullCompleted = ({
      entityTypes,
    }: {
      changesApplied: number;
      entityTypes: string[];
    }) => {
      this.updateState();

      // Invalidate TanStack Query caches for affected entity types (app-specific logic)
      if (entityTypes && entityTypes.length > 0) {
        for (const entityType of entityTypes) {
          const keys = getQueryKeysForEntity(entityType);
          for (const key of keys) {
            this.queryClient.invalidateQueries({ queryKey: key });
          }
        }
      }

      // Notify log listeners
      this.notifyLogListeners();
    };

    const handlePullError = () => {
      this.updateState();
      this.notifyLogListeners();
    };

    const handlePullStale = () => {
      this.updateState();
    };

    const handleOnline = () => {
      this.updateState({ isOnline: true });
      // Refresh conflicts when coming back online
      this.refreshConflicts();
    };

    const handleOffline = () => {
      this.updateState({ isOnline: false });
    };

    const handleConflictDetected = () => {
      // Refresh conflicts when a conflict is detected
      this.refreshConflicts();
      this.updateState();
    };

    // Subscribe to all relevant events
    const unsubStatus = syncEvents.on("status:changed", handleStatusChanged);
    const unsubPullCompleted = syncEvents.on("pull:completed", handlePullCompleted);
    const unsubPullError = syncEvents.on("pull:error", handlePullError);
    const unsubPullStale = syncEvents.on("pull:stale", handlePullStale);
    const unsubOnline = syncEvents.on("sync:online", handleOnline);
    const unsubOffline = syncEvents.on("sync:offline", handleOffline);
    const unsubConflict = syncEvents.on("operation:conflict", handleConflictDetected);

    // Also listen to browser online/offline events
    const handleBrowserOnline = () => {
      this.updateState({ isOnline: true });
      this.refreshConflicts();
    };
    const handleBrowserOffline = () => this.updateState({ isOnline: false });
    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);

    this.unsubscribeFromEvents = () => {
      unsubStatus();
      unsubPullCompleted();
      unsubPullError();
      unsubPullStale();
      unsubOnline();
      unsubOffline();
      unsubConflict();
      window.removeEventListener("online", handleBrowserOnline);
      window.removeEventListener("offline", handleBrowserOffline);
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
  syncService: SyncService,
  pullService: PullService,
  queryClient: QueryClient
): SyncReactRuntime {
  return new AvileoSyncReactRuntime(syncService, pullService, queryClient);
}
