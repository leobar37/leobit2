/**
 * React Context for Sync Runtime
 *
 * Provides the SyncReactRuntime to React components via context.
 */

import { createContext, useContext } from "react";
import type { SyncReactRuntime, SyncStateSnapshot } from "./types";
import type { SyncClientEngine } from "../client";

/**
 * Context value for the sync runtime
 */
export interface SyncRuntimeContextValue {
  runtime: SyncReactRuntime;
  engine?: SyncClientEngine;
}

/**
 * Context for the sync runtime
 */
export const SyncRuntimeContext = createContext<SyncRuntimeContextValue | null>(null);

/**
 * Context for the sync state (derived from runtime)
 */
export const SyncStateContext = createContext<SyncStateSnapshot | null>(null);

/**
 * Hook to get the sync runtime from context
 * @throws if used outside of SyncProvider
 */
export function useSyncRuntime(): SyncReactRuntime {
  const context = useContext(SyncRuntimeContext);
  if (!context) {
    throw new Error("useSyncRuntime must be used within a SyncProvider");
  }
  return context.runtime;
}

/**
 * Hook to get the sync state from context
 * Returns null if used outside of SyncProvider (for graceful degradation)
 */
export function useSyncStateContext(): SyncStateSnapshot | null {
  return useContext(SyncStateContext);
}
