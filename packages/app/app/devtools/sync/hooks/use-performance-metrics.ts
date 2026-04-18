import { useState, useEffect, useCallback } from "react";
import { useSyncState } from "~/lib/sync/service-provider";

export interface PerformanceMetricsData {
  memoryUsage: number | null;
  storageUsage: number | null;
  storageQuota: number | null;
  tableCount: number;
  totalRecords: number;
  lastUpdated: Date;
}

export interface UsePerformanceMetricsReturn {
  metrics: PerformanceMetricsData;
  isLoading: boolean;
  refresh: () => void;
}

export function usePerformanceMetrics(): UsePerformanceMetricsReturn {
  const syncState = useSyncState();
  const [metrics, setMetrics] = useState<PerformanceMetricsData>({
    memoryUsage: null,
    storageUsage: null,
    storageQuota: null,
    tableCount: 0,
    totalRecords: 0,
    lastUpdated: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);

    try {
      let memoryUsage: number | null = null;
      if ("memory" in performance && (performance as any).memory) {
        memoryUsage = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024));
      }

      let storageUsage: number | null = null;
      let storageQuota: number | null = null;
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        storageUsage = estimate.usage ? Math.round(estimate.usage / (1024 * 1024)) : null;
        storageQuota = estimate.quota ? Math.round(estimate.quota / (1024 * 1024)) : null;
      }

      setMetrics({
        memoryUsage,
        storageUsage,
        storageQuota,
        tableCount: 18,
        totalRecords: syncState.push.total,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("[PerformanceMetrics] Error loading metrics:", error);
    }

    setIsLoading(false);
  }, [syncState.push.total]);

  useEffect(() => {
    loadMetrics();

    const interval = setInterval(loadMetrics, 5000);

    return () => clearInterval(interval);
  }, [loadMetrics]);

  return {
    metrics,
    isLoading,
    refresh: loadMetrics,
  };
}

export function formatBytes(mb: number | null): string {
  if (mb === null) return "N/A";
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}
