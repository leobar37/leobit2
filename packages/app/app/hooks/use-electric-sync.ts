import { useEffect, useRef, useState, useCallback } from "react";
import type { PGliteWithElectric, SyncTableResult } from "~/lib/sync/sync-shapes";
import { syncTables, stopAllSyncs } from "~/lib/sync/sync-shapes";
import { SHAPES_CONFIG, getShapesByPriority } from "~/lib/sync/shape-config";

export interface SyncTableStatus {
  table: string;
  isReady: boolean;
  error?: string;
}

export interface UseElectricSyncResult {
  isReady: boolean;
  isSyncing: boolean;
  error: Error | null;
  tables: SyncTableStatus[];
  resync: () => Promise<void>;
}

/**
 * React hook for ElectricSQL sync
 * Automatically starts sync on mount and cleans up on unmount
 */
export function useElectricSync(
  pg: PGliteWithElectric | null,
  businessId: string,
  token: string
): UseElectricSyncResult {
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tables, setTables] = useState<SyncTableStatus[]>(
    SHAPES_CONFIG.map((s) => ({
      table: s.table,
      isReady: false,
    }))
  );

  const syncResultsRef = useRef<SyncTableResult[]>([]);
  const isMountedRef = useRef(true);

  // Perform sync
  const performSync = useCallback(async () => {
    if (!pg || !businessId || !token) {
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const shapes = getShapesByPriority();
      const result = await syncTables(pg, businessId, token, shapes);

      if (!isMountedRef.current) return;

      syncResultsRef.current = [...result.success, ...result.failed];

      // Update table statuses
      const newTableStatuses: SyncTableStatus[] = shapes.map((shape) => {
        const syncResult = result.success.find((r) => r.table === shape.table);
        const failedResult = result.failed.find((r) => r.table === shape.table);

        return {
          table: shape.table,
          isReady: !!syncResult,
          error: failedResult?.error,
        };
      });

      setTables(newTableStatuses);

      // Check if all enabled tables are ready
      const allReady = result.failed.length === 0 ||
        result.failed.every((f) =>
          shapes.find((s) => s.table === f.table)?.enabled === false
        );

      setIsReady(allReady);

      if (result.failed.length > 0) {
        console.warn(
          `[useElectricSync] ${result.failed.length} tables failed to sync`,
          result.failed
        );
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const syncError = err instanceof Error ? err : new Error(String(err));
      setError(syncError);
      console.error("[useElectricSync] Sync failed:", syncError);
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [pg, businessId, token]);

  // Initial sync on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (pg && businessId && token) {
      performSync();
    }

    return () => {
      isMountedRef.current = false;
      // Cleanup sync subscriptions
      if (syncResultsRef.current.length > 0) {
        stopAllSyncs(syncResultsRef.current);
        syncResultsRef.current = [];
      }
    };
  }, [pg, businessId, token, performSync]);

  // Resync function
  const resync = useCallback(async () => {
    // Stop existing syncs
    stopAllSyncs(syncResultsRef.current);
    syncResultsRef.current = [];

    // Reset state
    setIsReady(false);
    setTables(
      SHAPES_CONFIG.map((s) => ({
        table: s.table,
        isReady: false,
      }))
    );

    // Perform sync again
    await performSync();
  }, [performSync]);

  return {
    isReady,
    isSyncing,
    error,
    tables,
    resync,
  };
}
