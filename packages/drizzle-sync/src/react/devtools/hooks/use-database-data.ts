import { useState, useEffect, useCallback } from "react";
import { useSyncEngine, useSyncState } from "../../hooks";

export interface DatabaseInfo {
  totalRecords: number;
  tableCount: number;
  tableSizes: { table: string; count: number }[];
  lastPullTime: Date | null;
  lastPushTime: Date | null;
  isOnline: boolean;
  isPulling: boolean;
  isStuck: boolean;
  consecutiveFailures: number;
}

const DEFAULT_TABLES = [
  "customers", "products", "product_variants", "suppliers", "sales",
  "sale_items", "purchases", "purchase_items", "abonos",
  "distribuciones", "distribucion_items", "tags", "customer_tags",
  "sync_operations", "dead_letter_operations",
];

export function useDatabaseData(isOpen: boolean, isInitialized: boolean) {
  const engine = useSyncEngine();
  const syncState = useSyncState();
  const [dbInfo, setDbInfo] = useState<DatabaseInfo>({
    totalRecords: 0,
    tableCount: 0,
    tableSizes: [],
    lastPullTime: null,
    lastPushTime: null,
    isOnline: syncState.isOnline,
    isPulling: false,
    isStuck: syncState.isStuck,
    consecutiveFailures: 0,
  });

  const fetchDbInfo = useCallback(async () => {
    const pg = engine.getService<{ query: (sql: string) => Promise<{ rows: unknown[] }> }>("pg");
    if (!pg || !isInitialized) return;

    try {
      const sizeResults = await Promise.all(
        DEFAULT_TABLES.map(async (table) => {
          try {
            const result = await pg.query(`SELECT COUNT(*)::text AS count FROM ${table}`);
            const row = result.rows[0] as Record<string, string> | undefined;
            return { table, count: parseInt(String(row?.count ?? 0), 10) };
          } catch {
            return { table, count: 0 };
          }
        })
      );

      const existingTables = sizeResults.filter((r) => r.count > 0);
      const totalRecords = sizeResults.reduce((acc, r) => acc + r.count, 0);

      setDbInfo({
        totalRecords,
        tableCount: existingTables.length,
        tableSizes: sizeResults,
        lastPullTime: null,
        lastPushTime: syncState.lastSyncTime,
        isOnline: syncState.isOnline,
        isPulling: false,
        isStuck: syncState.isStuck,
        consecutiveFailures: 0,
      });
    } catch (error) {
      console.error("[useDatabaseData] Error fetching database info:", error);
    }
  }, [engine, isInitialized, syncState]);

  useEffect(() => {
    if (!isOpen || !isInitialized) return;
    void fetchDbInfo();
    const interval = setInterval(() => void fetchDbInfo(), 5000);
    return () => clearInterval(interval);
  }, [fetchDbInfo, isOpen, isInitialized]);

  return { dbInfo, refetch: fetchDbInfo };
}
