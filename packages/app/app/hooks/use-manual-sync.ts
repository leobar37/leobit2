/**
 * useManualSync Hook
 * Provides manual sync functionality using existing services
 */

import { useCallback, useState } from "react";
import { useSyncService, usePullService, useSyncState } from "~/lib/sync/engine-provider";

export interface ManualSyncResult {
  success: boolean;
  pushProcessed: number;
  pushFailed: number;
  pushConflicts: number;
  pullApplied: number;
  pullHasMore: boolean;
  error?: string;
}

export interface UseManualSyncResult {
  /** Trigger a manual sync (push + pull) */
  syncNow: () => Promise<ManualSyncResult>;
  /** Trigger a push sync only */
  pushNow: () => Promise<{ processed: number; failed: number; conflicts: number }>;
  /** Trigger a pull sync only */
  pullNow: () => Promise<{ changesApplied: number; hasMore: boolean }>;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Whether the app is online and can sync */
  canSync: boolean;
}

/**
 * Hook for manual sync operations
 * Uses the existing SyncService and PullService from context
 */
export function useManualSync(): UseManualSyncResult {
  const syncService = useSyncService();
  const pullService = usePullService();
  const { isOnline, isSyncing: contextSyncing } = useSyncState();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const canSync = isOnline && !!syncService && !!pullService;

  const pushNow = useCallback(async (): Promise<{ processed: number; failed: number; conflicts: number }> => {
    if (!syncService) {
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    try {
      const result = await syncService.processPending();
      return result;
    } catch (error) {
      console.error("[useManualSync] Push failed:", error);
      return { processed: 0, failed: 1, conflicts: 0 };
    }
  }, [syncService]);

  const pullNow = useCallback(async (): Promise<{ changesApplied: number; hasMore: boolean }> => {
    if (!pullService) {
      return { changesApplied: 0, hasMore: false };
    }

    try {
      const result = await pullService.forcePullNow();
      return {
        changesApplied: result.changesApplied,
        hasMore: result.hasMore,
      };
    } catch (error) {
      console.error("[useManualSync] Pull failed:", error);
      return { changesApplied: 0, hasMore: false };
    }
  }, [pullService]);

  const syncNow = useCallback(async (): Promise<ManualSyncResult> => {
    if (!canSync) {
      return {
        success: false,
        pushProcessed: 0,
        pushFailed: 0,
        pushConflicts: 0,
        pullApplied: 0,
        pullHasMore: false,
        error: "Cannot sync: offline or services not available",
      };
    }

    setIsManualSyncing(true);

    try {
      // Run push and pull in parallel for efficiency
      const [pushResult, pullResult] = await Promise.all([pushNow(), pullNow()]);

      const success = pushResult.failed === 0 && pullResult.changesApplied >= 0;

      return {
        success,
        pushProcessed: pushResult.processed,
        pushFailed: pushResult.failed,
        pushConflicts: pushResult.conflicts,
        pullApplied: pullResult.changesApplied,
        pullHasMore: pullResult.hasMore,
      };
    } catch (error) {
      console.error("[useManualSync] Sync failed:", error);
      return {
        success: false,
        pushProcessed: 0,
        pushFailed: 0,
        pushConflicts: 0,
        pullApplied: 0,
        pullHasMore: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsManualSyncing(false);
    }
  }, [canSync, pushNow, pullNow]);

  return {
    syncNow,
    pushNow,
    pullNow,
    isSyncing: isManualSyncing || contextSyncing,
    canSync,
  };
}
