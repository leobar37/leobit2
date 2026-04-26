/**
 * React Hooks for Sync Runtime
 *
 * Provides hooks for accessing sync state, subscribing to events,
 * and managing sync lifecycle.
 */

import { useState, useEffect, useMemo, useContext } from "react";
import type {
  SyncReactRuntime,
  SyncStateSnapshot,
  SyncLogEntry,
  SyncConflictRecord,
} from "./types";
import { useSyncRuntime, useSyncStateContext, SyncRuntimeContext } from "./context";
import type { SyncClientEngine } from "../client";

/**
 * Default sync state snapshot for fallback
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
 * Hook to get current sync state
 * Returns default state if used outside of SyncProvider
 *
 * Prefers SyncStateContext when available, falls back to default state
 * when outside provider. This simplifies the implementation by avoiding
 * local subscription state management.
 */
export function useSyncState(): SyncStateSnapshot {
  const stateFromContext = useSyncStateContext();
  // Prefer context state (provided by SyncProvider), fall back to default
  return stateFromContext ?? DEFAULT_SYNC_STATE;
}

/**
 * Hook to get sync status flags
 */
export function useSyncStatus(): {
  isSyncing: boolean;
  isOnline: boolean;
  isStuck: boolean;
  hasPending: boolean;
  hasFailed: boolean;
  hasConflicts: boolean;
  hasDeadLetter: boolean;
} {
  const state = useSyncState();

  return useMemo(
    () => ({
      isSyncing: state.isSyncing,
      isOnline: state.isOnline,
      isStuck: state.isStuck,
      hasPending: state.pendingCount > 0,
      hasFailed: state.failedCount > 0,
      hasConflicts: state.conflictCount > 0,
      hasDeadLetter: state.deadLetterCount > 0,
    }),
    [state]
  );
}

/**
 * Hook to manage sync lifecycle
 * Calls runtime.dispose() on unmount
 */
export function useSyncLifecycle(runtime: SyncReactRuntime): void {
  useEffect(() => {
    return () => {
      runtime.dispose?.();
    };
  }, [runtime]);
}

/**
 * Hook to subscribe to sync events
 * @param eventType - Event type to subscribe to
 * @param handler - Handler function
 */
export function useSyncEvent(
  eventType: string,
  handler: (event: unknown) => void
): void {
  const runtime = useSyncRuntime();

  useEffect(() => {
    if (!runtime.eventSource) {
      return;
    }

    const unsubscribe = runtime.eventSource.on(eventType, handler);
    return unsubscribe;
  }, [runtime, eventType, handler]);
}

/**
 * Hook to get sync logs (if available)
 */
export function useSyncLogs(): SyncLogEntry[] {
  const runtimeContext = useContext(SyncRuntimeContext);
  const runtime = runtimeContext?.runtime;
  const [logs, setLogs] = useState<SyncLogEntry[]>(() => {
    return runtime?.getLogs?.() ?? [];
  });

  useEffect(() => {
    if (!runtime?.subscribeLogs) {
      return;
    }

    const unsubscribe = runtime.subscribeLogs(() => {
      setLogs(runtime.getLogs?.() ?? []);
    });

    // Set initial logs
    setLogs(runtime.getLogs?.() ?? []);

    return unsubscribe;
  }, [runtime]);

  return logs;
}

/**
 * Hook to get sync conflicts (if available)
 */
export function useSyncConflicts(): SyncConflictRecord[] {
  const runtimeContext = useContext(SyncRuntimeContext);
  const runtime = runtimeContext?.runtime;
  const [conflicts, setConflicts] = useState<SyncConflictRecord[]>(() => {
    return runtime?.getConflicts?.() ?? [];
  });

  useEffect(() => {
    if (!runtime?.subscribeConflicts) {
      return;
    }

    const unsubscribe = runtime.subscribeConflicts(() => {
      setConflicts(runtime.getConflicts?.() ?? []);
    });

    // Set initial conflicts
    setConflicts(runtime.getConflicts?.() ?? []);

    return unsubscribe;
  }, [runtime]);

  return conflicts;
}

/**
 * Hook to check if there are pending operations to sync
 */
export function useHasPendingSync(): boolean {
  const { pendingCount } = useSyncState();
  return pendingCount > 0;
}

/**
 * Hook to check if there are failed sync operations
 */
export function useHasFailedSync(): boolean {
  const { failedCount, deadLetterCount } = useSyncState();
  return failedCount > 0 || deadLetterCount > 0;
}

/**
 * Hook to check if sync is stuck
 */
export function useIsSyncStuck(): boolean {
  const { isStuck } = useSyncState();
  return isStuck;
}

export function useSyncEngine(): SyncClientEngine {
  const runtimeContext = useContext(SyncRuntimeContext);
  const engine = runtimeContext?.engine;
  if (!engine) {
    throw new Error("useSyncEngine must be used within a SyncProvider with an engine");
  }
  return engine;
}

export function useEngineService<T = unknown>(name: string): T {
  const engine = useSyncEngine();
  return (engine as any).getService(name) as T;
}

export function useServices<T extends Record<string, any> = Record<string, any>>(): T {
  const engine = useSyncEngine() as SyncClientEngine<T>;
  return engine.getServices();
}

export function useSyncOperations() {
  const engine = useSyncEngine();
  const operations = engine.getSyncOperations();
  if (!operations) {
    throw new Error("Sync operations are not available on the current engine");
  }
  return operations;
}

export function useSyncEngineReady(): { isReady: boolean; error: Error | null } {
  const runtimeContext = useContext(SyncRuntimeContext);
  return {
    isReady: !!runtimeContext?.engine,
    error: null,
  };
}

interface SyncEngineInitState {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  schemaError: Error | null;
  hasInitTimeout: boolean;
}

/**
 * Hook to initialize a SyncClientEngine automatically.
 * Handles database initialization, timeout detection, and schema error detection.
 *
 * @param engine - The SyncClientEngine instance to initialize
 * @param options - Initialization options
 * @returns Initialization state
 *
 * @example
 * ```tsx
 * const engine = createSyncClientEngine({ databaseConfig: {...}, ... });
 * const { isReady, error, schemaError, hasInitTimeout } = useSyncEngineInit(engine, { timeoutMs: 30000 });
 * ```
 */
export interface SyncInitProgress {
  stage: string;
  status: "pending" | "loading" | "complete" | "error";
  changesApplied: number;
  message?: string;
}

export interface SyncInitState {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  schemaError: Error | null;
  hasInitTimeout: boolean;
  progress: SyncInitProgress | null;
  totalChanges: number;
}

/**
 * Hook to initialize sync engine and perform initial sync.
 * Handles database initialization, staged pull, and progress tracking.
 *
 * @param engine - The SyncClientEngine instance
 * @param options - Initialization options
 * @returns Initialization state with progress
 *
 * @example
 * ```tsx
 * const engine = createSyncClientEngine({ databaseConfig: {...}, ... });
 * const { isReady, progress, error, totalChanges } = useSyncInit(engine);
 *
 * if (!isReady) return <LoadingScreen progress={progress} />;
 * return <App />;
 * ```
 */
export function useSyncInit(
  engine: SyncClientEngine | null,
  options?: { timeoutMs?: number; autoStart?: boolean }
): SyncInitState {
  const [state, setState] = useState<SyncInitState>({
    isReady: false,
    isLoading: false,
    error: null,
    schemaError: null,
    hasInitTimeout: false,
    progress: null,
    totalChanges: 0,
  });

  const timeoutMs = options?.timeoutMs ?? 30000;
  const autoStart = options?.autoStart ?? true;

  useEffect(() => {
    if (!engine || state.isReady || state.isLoading || !autoStart) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    const init = async () => {
      try {
        timeoutId = setTimeout(() => {
          if (mounted) {
            setState({
              isReady: false,
              isLoading: false,
              error: new Error(`Engine initialization timed out after ${timeoutMs}ms`),
              schemaError: null,
              hasInitTimeout: true,
              progress: null,
              totalChanges: 0,
            });
          }
        }, timeoutMs);

        // Step 1: Initialize engine (database, services)
        await engine.initialize();

        if (!mounted) return;

        // Step 2: Perform initial sync (staged or quick)
        const result = await engine.performInitialSync((progress) => {
          if (!mounted) return;
          setState((prev) => ({
            ...prev,
            progress: {
              stage: progress.stage,
              status: progress.status,
              changesApplied: progress.changesApplied,
              message: `${progress.stage}: ${progress.status}`,
            },
            totalChanges: progress.changesApplied,
          }));
        });

        if (!mounted) return;
        if (timeoutId) clearTimeout(timeoutId);

        setState({
          isReady: result.success,
          isLoading: false,
          error: result.success ? null : new Error("Initial sync failed"),
          schemaError: null,
          hasInitTimeout: false,
          progress: null,
          totalChanges: result.totalChanges,
        });
      } catch (err) {
        if (!mounted) return;
        if (timeoutId) clearTimeout(timeoutId);

        const error = err instanceof Error ? err : new Error(String(err));
        const isSchemaError =
          error.message?.includes("column") ||
          error.message?.includes("does not exist") ||
          error.message?.includes("no existe");

        setState({
          isReady: false,
          isLoading: false,
          error: isSchemaError ? null : error,
          schemaError: isSchemaError ? error : null,
          hasInitTimeout: false,
          progress: null,
          totalChanges: 0,
        });
      }
    };

    init();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [engine, timeoutMs, autoStart]); // Intentionally not depending on state to avoid loops

  return state;
}
