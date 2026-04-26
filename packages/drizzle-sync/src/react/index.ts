/**
 * @avileo/drizzle-sync/react
 *
 * React integration for the sync library.
 *
 * ## Usage
 *
 * ```tsx
 * import { SyncProvider, useSyncState, useSyncStatus } from "@avileo/drizzle-sync/react";
 *
 * // Create runtime from your sync services
 * const runtime = createSyncRuntime(syncService, pullService);
 *
 * // Wrap your app with the provider
 * <SyncProvider runtime={runtime}>
 *   <App />
 * </SyncProvider>
 *
 * // Use hooks in components
 * function MyComponent() {
 *   const { isSyncing, isOnline, pendingCount } = useSyncState();
 *   const { hasPending, hasFailed } = useSyncStatus();
 *   // ...
 * }
 * ```
 */

// Types
export type {
  SyncStateSnapshot,
  PushStateSnapshot,
  PullStateSnapshot,
  SyncLogEntry,
  SyncConflictRecord,
  SyncReactRuntime,
  SyncEventSource,
  SyncReactRuntimeFactory,
} from "./types";

// Context
export {
  SyncRuntimeContext,
  SyncStateContext,
  useSyncRuntime,
  useSyncStateContext,
} from "./context";

// Hooks
export {
  useSyncState,
  useSyncStatus,
  useSyncEngine,
  useSyncEngineReady,
  useSyncInit,
  useEngineService,
  useServices,
  useSyncOperations,
  useSyncLifecycle,
  useSyncEvent,
  useSyncLogs,
  useSyncConflicts,
  useHasPendingSync,
  useHasFailedSync,
  useIsSyncStuck,
  // Clearer aliases for disambiguation
  useSyncState as useSyncStateSnapshot,
  useSyncStatus as useSyncStatusFlags,
} from "./hooks";

export type { SyncInitProgress, SyncInitState } from "./hooks";

// Provider
export { SyncProvider, type SyncProviderProps } from "./provider";

// Runtime factory
export {
  createSyncReactRuntime,
  type CreateSyncReactRuntimeOptions,
} from "./create-sync-runtime";
