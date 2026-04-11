import { useState, useEffect, useCallback } from "react";
import { usePGlite, useSyncState } from "~/lib/sync/service-provider";

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

export function useDatabaseData(isOpen: boolean, isInitialized: boolean) {
  const pg = usePGlite();
  const syncState = useSyncState();
  const [dbInfo, setDbInfo] = useState<DatabaseInfo>({
    totalRecords: 0,
    tableCount: 0,
    tableSizes: [],
    lastPullTime: null,
    lastPushTime: null,
    isOnline: syncState.isOnline,
    isPulling: syncState.pull.isPulling,
    isStuck: syncState.isStuck,
    consecutiveFailures: syncState.pull.consecutiveFailures,
  });

  const fetchDbInfo = useCallback(async () => {
    if (!pg || !isInitialized) return;

    try {
      const tables = [
        "customers",
        "products",
        "product_variants",
        "suppliers",
        "sales",
        "sale_items",
        "purchases",
        "purchase_items",
        "abonos",
        "distribuciones",
        "distribucion_items",
        "tags",
        "customer_tags",
        "customer_groups",
        "customer_group_members",
        "visitas",
        "sync_operations",
        "dead_letter_operations",
      ];

      const sizeResults = await Promise.all(
        tables.map(async (table) => {
          try {
            const result = await pg.query(`SELECT COUNT(*)::text AS count FROM ${table}`);
            const row = result.rows[0] as Record<string, string> | undefined;
            return { table, count: parseInt(String(row?.count ?? 0), 10) };
          } catch {
            return { table, count: 0 };
          }
        }),
      );

      const existingTables = sizeResults.filter((r) => r.count > 0);
      const totalRecords = sizeResults.reduce((acc, r) => acc + r.count, 0);

      setDbInfo({
        totalRecords,
        tableCount: existingTables.length,
        tableSizes: sizeResults,
        lastPullTime: syncState.pull.lastPullTime,
        lastPushTime: syncState.lastSyncTime,
        isOnline: syncState.isOnline,
        isPulling: syncState.pull.isPulling,
        isStuck: syncState.isStuck,
        consecutiveFailures: syncState.pull.consecutiveFailures,
      });
    } catch (error) {
      console.error("[useDatabaseData] Error fetching database info:", error);
    }
  }, [pg, isInitialized, syncState]);

  useEffect(() => {
    if (!isOpen || !isInitialized) return;

    void fetchDbInfo();
    const interval = setInterval(() => {
      void fetchDbInfo();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDbInfo, isOpen, isInitialized]);

  return { dbInfo, refetch: fetchDbInfo };
}
