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
