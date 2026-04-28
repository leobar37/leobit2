/**
 * Sync Status Adapter
 * Legacy adapter that maps framework sync state to local sync interface.
 * All sync state now comes from @avileo/drizzle-sync/react useSyncState().
 */

import { useSyncState } from "@avileo/drizzle-sync/react";

interface SyncAdapterValue {
  isOnline: boolean;
  actualIsOnline: boolean;
  lastSync: Date | null;
}

export function useSync(): SyncAdapterValue {
  const state = useSyncState();

  return {
    isOnline: state.isOnline,
    actualIsOnline: state.isOnline,
    lastSync: state.lastSyncTime ? new Date(state.lastSyncTime) : null,
  };
}

export function SyncStatus() {
  return null;
}
