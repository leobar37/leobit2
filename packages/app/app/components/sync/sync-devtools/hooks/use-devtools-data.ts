import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "~/engine";
import { useSyncService } from "~/lib/sync/service-provider";
import type {
  SyncStatus,
  SyncOperation,
  DeadLetterOperation,
  EntitySyncSummary,
  initialSyncStatus,
} from "../types";
import { ENTITY_SUMMARY_CONFIG } from "../types";

export interface UseDevToolsDataReturn {
  status: SyncStatus;
  operations: SyncOperation[];
  deadLetterOperations: DeadLetterOperation[];
  entitySummaries: EntitySyncSummary[];
  isLoading: boolean;
  lastSync: Date | null;
  refetch: () => Promise<void>;
}

export function useDevToolsData(isOpen: boolean, isInitialized: boolean): UseDevToolsDataReturn {
  const syncService = useSyncService();
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    processing: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
    conflict: 0,
    deadLetter: 0,
    total: 0,
  });
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [deadLetterOperations, setDeadLetterOperations] = useState<DeadLetterOperation[]>([]);
  const [entitySummaries, setEntitySummaries] = useState<EntitySyncSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!isInitialized) return;

    try {
      const newStatus = syncService ? await syncService.getStatus() : status;
      setStatus(newStatus);

      if (syncService) {
        const [problemOps, deadLetterOps] = await Promise.all([
          syncService.getProblemOperations(),
          syncService.getDeadLetterOperations(),
        ]);

        setOperations(problemOps as unknown as SyncOperation[]);
        setDeadLetterOperations(deadLetterOps as unknown as DeadLetterOperation[]);
      }

      const { db } = getDatabase();
      const summaryResults = await Promise.all(
        ENTITY_SUMMARY_CONFIG.map(async ({ table, label, hasSyncStatus }) => {
          if (hasSyncStatus) {
            const result = await db.execute(`
              SELECT
                '${table}' AS table_name,
                '${label}' AS label,
                COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE sync_status = 'pending')::text AS pending,
                COUNT(*) FILTER (WHERE sync_status = 'synced')::text AS synced,
                COUNT(*) FILTER (WHERE sync_status = 'error')::text AS error
              FROM ${table}
            `);

            const row = result.rows[0];
            return {
              table: String(row.table_name),
              label: String(row.label),
              total: parseInt(String(row.total), 10),
              pending: parseInt(String(row.pending), 10),
              synced: parseInt(String(row.synced), 10),
              error: parseInt(String(row.error), 10),
            };
          }

          const result = await db.execute(`
            SELECT
              '${table}' AS table_name,
              '${label}' AS label,
              COUNT(*)::text AS total
            FROM ${table}
          `);

          const row = result.rows[0];
          return {
            table: String(row.table_name),
            label: String(row.label),
            total: parseInt(String(row.total), 10),
            pending: 0,
            synced: parseInt(String(row.total), 10),
            error: 0,
          };
        }),
      );

      setEntitySummaries(summaryResults);
    } catch (error) {
      console.error("[SyncDevTools] Error fetching data:", error);
    }
  }, [isInitialized, syncService]);

  useEffect(() => {
    if (!isOpen || !isInitialized) return;

    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchData, isOpen, isInitialized]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchData();
      setLastSync(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [fetchData]);

  return {
    status,
    operations,
    deadLetterOperations,
    entitySummaries,
    isLoading,
    lastSync,
    refetch,
  };
}

export function useRefreshAfterAction(
  refetch: () => Promise<void>,
  ...invalidateKeys: string[]
) {
  return useCallback(async () => {
    await refetch();
  }, [refetch]);
}