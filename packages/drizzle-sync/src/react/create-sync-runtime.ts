/**
 * Factory for creating a SyncReactRuntime from a SyncClientEngine.
 *
 * Bridges the engine's event system and services to the React runtime
 * interface used by SyncProvider. Generic — no app-specific logic.
 */

import type {
  SyncReactRuntime,
  SyncStateSnapshot,
  PushStateSnapshot,
  PullStateSnapshot,
  SyncLogEntry,
  SyncConflictRecord,
} from "./types";
import type {
  BackendConflict,
  BackendConflictListResponse,
  SyncClientEngine,
  SyncClientServicePort,
} from "../client";
import { syncLogger } from "../pglite/compat";

/**
 * Options for creating the runtime.
 */
export interface CreateSyncReactRuntimeOptions {
  /** The sync client engine */
  engine: SyncClientEngine;
  /** Whether to start auto-sync on mount (default: true) */
  startOnMount?: boolean;
  /**
   * Called when pull applies changes for specific entity types.
   * Use this for cache invalidation (e.g. TanStack Query).
   */
  onEntityTypesChanged?: (entityTypes: string[]) => void;
}

const DEFAULT_STATE: SyncStateSnapshot = {
  isSyncing: false,
  isOnline: true,
  isStuck: false,
  lastSyncTime: null,
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  deadLetterCount: 0,
};

class EngineSyncReactRuntime implements SyncReactRuntime {
  private listeners = new Set<() => void>();
  private logListeners = new Set<() => void>();
  private conflictListeners = new Set<() => void>();
  private currentState: SyncStateSnapshot;
  private cachedPushStatus: Awaited<
    ReturnType<SyncClientServicePort["getStatus"]>
  > | null = null;
  private cachedConflicts: SyncConflictRecord[] = [];
  private conflictsLoading = false;
  private disposed = false;

  constructor(
    private engine: SyncClientEngine,
    private startOnMount: boolean,
    private onEntityTypesChanged?: (entityTypes: string[]) => void,
  ) {
    this.currentState = { ...DEFAULT_STATE };
    void this.initialize();
  }

  getState(): SyncStateSnapshot {
    return this.currentState;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get eventSource() {
    return this.engine.getEventEmitter();
  }

  getLogs(): SyncLogEntry[] {
    const entries = syncLogger.getEntries() ?? [];
    return entries.map((entry) => ({
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : String(entry.timestamp),
      level: entry.level as "debug" | "info" | "warn" | "error",
      message: entry.prefix
        ? `[${entry.prefix}] ${entry.message}`
        : entry.message,
      data: entry.data as Record<string, unknown> | undefined,
    }));
  }

  subscribeLogs(listener: () => void): () => void {
    this.logListeners.add(listener);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  getConflicts(): SyncConflictRecord[] {
    return this.cachedConflicts;
  }

  subscribeConflicts(listener: () => void): () => void {
    this.conflictListeners.add(listener);
    return () => {
      this.conflictListeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    this.logListeners.clear();
    this.conflictListeners.clear();
    void this.engine.stop();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async initialize(): Promise<void> {
    try {
      await this.engine.initialize();
      if (this.startOnMount) {
        await this.engine.start();
      }
      const syncOperations = this.engine.getSyncOperations();
      this.cachedPushStatus = syncOperations
        ? await syncOperations.getStatus()
        : null;
      this.updateState();
      await this.refreshConflicts();
    } catch (error) {
      console.error(
        "[EngineSyncReactRuntime] Failed to load initial state:",
        error,
      );
    }
  }

  private async refreshConflicts(): Promise<void> {
    if (this.conflictsLoading || this.disposed) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    this.conflictsLoading = true;
    try {
      const syncOperations = this.engine.getSyncOperations();
      if (!syncOperations) return;
      const result = (await syncOperations.getBackendConflicts({
        status: "pending",
        limit: 50,
      })) as BackendConflictListResponse;
      if (result.success && result.data?.conflicts) {
        this.cachedConflicts = result.data.conflicts.map(
          (c: BackendConflict) => ({
            id: c.id,
            entityType: c.entityType,
            entityId: c.entityId,
            localData: c.localData as Record<string, unknown>,
            serverData: c.serverData as Record<string, unknown>,
            localVersion: c.localVersion,
            serverVersion: c.serverVersion,
            status: c.status as "pending" | "resolved",
            resolution: c.resolution as
              | "server"
              | "local"
              | "merge"
              | null,
            createdAt: c.createdAt,
            resolvedAt: c.resolvedAt,
          }),
        );
        this.notifyConflictListeners();
      }
    } catch (error) {
      if (
        error instanceof Error &&
        !error.message.includes("not initialized")
      ) {
        console.warn(
          "[EngineSyncReactRuntime] Failed to refresh conflicts:",
          error.message,
        );
      }
    } finally {
      this.conflictsLoading = false;
    }
  }

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

    const pushSnapshot: PushStateSnapshot = {
      isProcessing:
        pushStatus.processing > 0 || pushStatus.syncing > 0,
      pendingCount: pushStatus.pending,
      processingCount: pushStatus.processing,
      syncingCount: pushStatus.syncing,
      completedCount: pushStatus.completed,
      failedCount: pushStatus.failed,
      conflictCount: pushStatus.conflict,
      deadLetterCount: pushStatus.deadLetter,
      totalCount: pushStatus.total,
    };

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
      isSyncing:
        pullStatus.isPulling ||
        pushStatus.processing > 0 ||
        pushStatus.syncing > 0,
      isOnline:
        typeof navigator !== "undefined" ? navigator.onLine : true,
      isStuck: pullStatus.isStuck,
      lastSyncTime: pullStatus.lastPullTime,
      pendingCount: pushStatus.pending + pushStatus.processing,
      failedCount: pushStatus.failed,
      conflictCount: pushStatus.conflict,
      deadLetterCount: pushStatus.deadLetter,
      push: pushSnapshot,
      pull: pullSnapshot,
    };
  }

  private updateState(
    partial?: Partial<SyncStateSnapshot>,
  ): void {
    const newState = { ...this.computeState(), ...partial };
    this.currentState = newState;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error(
          "[EngineSyncReactRuntime] Error in listener:",
          error,
        );
      }
    }
  }

  private notifyLogListeners(): void {
    for (const listener of this.logListeners) {
      try {
        listener();
      } catch (error) {
        console.error(
          "[EngineSyncReactRuntime] Error in log listener:",
          error,
        );
      }
    }
  }

  private notifyConflictListeners(): void {
    for (const listener of this.conflictListeners) {
      try {
        listener();
      } catch (error) {
        console.error(
          "[EngineSyncReactRuntime] Error in conflict listener:",
          error,
        );
      }
    }
  }
}

/**
 * Create a SyncReactRuntime from a SyncClientEngine.
 *
 * Handles state computation, event bridging, conflict refresh,
 * and log access. Call `onEntityTypesChanged` for cache invalidation.
 *
 * @example
 * ```typescript
 * const runtime = createSyncReactRuntime({
 *   engine,
 *   startOnMount: true,
 *   onEntityTypesChanged: (types) => {
 *     for (const t of types) {
 *       queryClient.invalidateQueries({ queryKey: [t] });
 *     }
 *   },
 * });
 * ```
 */
export function createSyncReactRuntime(
  options: CreateSyncReactRuntimeOptions,
): SyncReactRuntime {
  const { engine, startOnMount = true, onEntityTypesChanged } = options;

  const runtime = new EngineSyncReactRuntime(
    engine,
    startOnMount,
    onEntityTypesChanged,
  );

  const events = engine.getEventEmitter();

  events.on("pull:complete", async (event: any) => {
    const syncOperations = engine.getSyncOperations();
    if (syncOperations) {
      (runtime as any).cachedPushStatus =
        await syncOperations.getStatus();
    }
    onEntityTypesChanged?.(event.entityTypes);
    (runtime as any).updateState();
    (runtime as any).notifyLogListeners();
  });

  events.on("pull:error", () => {
    (runtime as any).updateState();
    (runtime as any).notifyLogListeners();
  });

  events.on("pull:stale", () => {
    (runtime as any).updateState();
  });

  events.on("sync:online", () => {
    (runtime as any).updateState({ isOnline: true });
    void (runtime as any).refreshConflicts();
  });

  events.on("sync:offline", () => {
    (runtime as any).updateState({ isOnline: false });
  });

  events.on("push:complete", async () => {
    const syncOperations = engine.getSyncOperations();
    if (syncOperations) {
      (runtime as any).cachedPushStatus =
        await syncOperations.getStatus();
    }
    (runtime as any).updateState();
    (runtime as any).notifyLogListeners();
  });

  return runtime;
}
