/**
 * Sync Provider Component
 *
 * Provides the SyncReactRuntime to React components via context.
 * Manages state subscription and updates.
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { SyncReactRuntime, SyncStateSnapshot } from "./types";
import { SyncRuntimeContext, SyncStateContext } from "./context";

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
 * Props for SyncProvider
 */
export interface SyncProviderProps {
  /** Factory function that creates the runtime */
  runtime: SyncReactRuntime | (() => SyncReactRuntime) | (() => Promise<SyncReactRuntime>);
  /** Children to render */
  children: ReactNode;
}

/**
 * Provider component that exposes sync runtime to React components.
 *
 * @example
 * ```tsx
 * const runtime = createSyncRuntime(syncService, pullService);
 *
 * <SyncProvider runtime={runtime}>
 *   <App />
 * </SyncProvider>
 * ```
 */
export function SyncProvider({ runtime: runtimeInput, children }: SyncProviderProps): ReactNode {
  const [runtime, setRuntime] = useState<SyncReactRuntime | null>(null);
  const [state, setState] = useState<SyncStateSnapshot>(DEFAULT_SYNC_STATE);
  const [error, setError] = useState<Error | null>(null);

  // Initialize runtime
  useEffect(() => {
    let mounted = true;
    let resolvedRuntime: SyncReactRuntime | null = null;

    const initRuntime = async () => {
      try {
        // Handle different input types
        if (typeof runtimeInput === "function") {
          const result = (runtimeInput as () => SyncReactRuntime | Promise<SyncReactRuntime>)();
          resolvedRuntime = result instanceof Promise ? await result : result;
        } else {
          resolvedRuntime = runtimeInput;
        }

        if (!mounted) return;

        setRuntime(resolvedRuntime);
        setState(resolvedRuntime.getState() ?? DEFAULT_SYNC_STATE);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    initRuntime();

    return () => {
      mounted = false;
      if (resolvedRuntime?.dispose) {
        resolvedRuntime.dispose();
      }
    };
  }, [runtimeInput]);

  // Subscribe to state changes
  useEffect(() => {
    if (!runtime) return;

    const unsubscribe = runtime.subscribe(() => {
      setState(runtime.getState() ?? DEFAULT_SYNC_STATE);
    });

    // Set initial state
    setState(runtime.getState() ?? DEFAULT_SYNC_STATE);

    return unsubscribe;
  }, [runtime]);

  // Memoized context values
  const runtimeContextValue = useMemo(
    () => (runtime ? { runtime } : null),
    [runtime]
  );

  // Handle error state
  if (error) {
    // Re-throw error to be caught by error boundary
    throw error;
  }

  // If runtime is not yet initialized, render nothing or a loading state
  if (!runtimeContextValue) {
    return null;
  }

  return (
    <SyncRuntimeContext.Provider value={runtimeContextValue}>
      <SyncStateContext.Provider value={state}>
        {children}
      </SyncStateContext.Provider>
    </SyncRuntimeContext.Provider>
  );
}
