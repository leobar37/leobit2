import { useState, useEffect, useCallback } from "react";
import { useSyncOperations, useSyncEngine } from "../../hooks";
import type { SyncStatus, SyncOperation, DeadLetterOperation, EntitySyncSummary } from "../types";

export interface UseDevToolsDataReturn {
  status: SyncStatus;
  operations: SyncOperation[];
  deadLetterOperations: DeadLetterOperation[];
  entitySummaries: EntitySyncSummary[];
  isLoading: boolean;
  lastSync: Date | null;
  refetch: () => Promise<void>;
}

const DEFAULT_TABLES = [
  "customers", "products", "suppliers", "product_variants",
  "sales", "purchases", "abonos", "sale_items", "purchase_items",
  "distribuciones", "distribucion_items", "tags", "customer_tags",
];

export function useDevToolsData(isOpen: boolean, isInitialized: boolean): UseDevToolsDataReturn {
  const syncService = useSyncOperations();
  const engine = useSyncEngine();
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0, processing: 0, syncing: 0, completed: 0,
    failed: 0, conflict: 0, deadLetter: 0, total: 0,
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

      const db = engine.getService<{ execute: (sql: string) => Promise<{ rows: unknown[] }> }>("db");
      if (db) {
        const summaryResults = await Promise.all(
          DEFAULT_TABLES.map(async (table) => {
            try {
              const result = await db.execute(`
                SELECT
                  COUNT(*)::text AS total,
                  COUNT(*) FILTER (WHERE sync_status = 'pending')::text AS pending,
                  COUNT(*) FILTER (WHERE sync_status = 'synced')::text AS synced,
                  COUNT(*) FILTER (WHERE sync_status = 'error')::text AS error
                FROM ${table}
              `);
              const row = result.rows[0] as Record<string, string>;
              return {
                table,
                label: table,
                total: parseInt(String(row.total), 10),
                pending: parseInt(String(row.pending), 10),
                synced: parseInt(String(row.synced), 10),
                error: parseInt(String(row.error), 10),
              };
            } catch {
              return { table, label: table, total: 0, pending: 0, synced: 0, error: 0 };
            }
          })
        );
        setEntitySummaries(summaryResults);
      }
    } catch (error) {
      console.error("[SyncDevTools] Error fetching data:", error);
    }
  }, [isInitialized, syncService, engine, status]);

  useEffect(() => {
    if (!isOpen || !isInitialized) return;
    void fetchData();
    const interval = setInterval(() => void fetchData(), 2000);
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

  return { status, operations, deadLetterOperations, entitySummaries, isLoading, lastSync, refetch };
}
