/**
 * usePullSync Hook
 * Periodically pulls changes from the server and invalidates TanStack Query when new data arrives
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { PullService, type PullResult } from "~/lib/sync/pull-service";
import { PULL_INTERVAL_MS } from "~/lib/sync/config";

export interface UsePullSyncOptions {
  /** Enable/disable the pull sync */
  enabled?: boolean;
  /** Custom interval in milliseconds (default: from config) */
  interval?: number;
  /** Entity types to watch for changes */
  watchedEntities?: string[];
}

export interface UsePullSyncResult {
  isPulling: boolean;
  lastPullResult: PullResult | null;
  lastPullTime: Date | null;
  forcePull: () => Promise<PullResult>;
}

/**
 * Hook to periodically pull changes from the server
 * Invalidates TanStack Query when new data arrives
 */
export function usePullSync(
  pg: PGlite | null,
  db: ReturnType<typeof drizzle> | null,
  businessId: string | null,
  authToken: string | null,
  options: UsePullSyncOptions = {}
): UsePullSyncResult {
  const { enabled = true, interval = PULL_INTERVAL_MS, watchedEntities = [] } = options;

  const queryClient = useQueryClient();
  const [isPulling, setIsPulling] = useState(false);
  const [lastPullResult, setLastPullResult] = useState<PullResult | null>(null);
  const [lastPullTime, setLastPullTime] = useState<Date | null>(null);

  const pullServiceRef = useRef<PullService | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create query key map for different entity types
  const getQueryKeysForEntity = useCallback((entityType: string) => {
    switch (entityType) {
      case "sales":
      case "sale_items":
        return [["sales-new"], ["sales-new", "filtered"]];
      case "customers":
        return [["customers"]];
      case "products":
        return [["products"]];
      case "abonos":
        return [["abonos"]];
      case "distribuciones":
        return [["distribuciones"]];
      default:
        return [];
    }
  }, []);

  // Callback when changes are applied
  const handleChangesApplied = useCallback(
    (entityTypes: string[]) => {
      console.log("[usePullSync] Changes applied for entities:", entityTypes);

      // Filter to watched entities if specified
      const entitiesToInvalidate =
        watchedEntities.length > 0
          ? entityTypes.filter((e) => watchedEntities.includes(e))
          : entityTypes;

      // Invalidate queries for affected entities
      for (const entityType of entitiesToInvalidate) {
        const queryKeys = getQueryKeysForEntity(entityType);
        for (const queryKey of queryKeys) {
          queryClient.invalidateQueries({ queryKey });
        }
      }
    },
    [queryClient, watchedEntities, getQueryKeysForEntity]
  );

  // Initialize pull service
  useEffect(() => {
    if (!pg || !db || !businessId || !authToken) {
      return;
    }

    pullServiceRef.current = new PullService(pg, db, businessId, authToken);
    pullServiceRef.current.setOnChangesApplied(handleChangesApplied);

    return () => {
      pullServiceRef.current?.stopAutoPull();
      pullServiceRef.current = null;
    };
  }, [pg, db, businessId, authToken, handleChangesApplied]);

  // Start/stop periodic pull
  useEffect(() => {
    if (!enabled || !pullServiceRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start auto pull
    pullServiceRef.current.startAutoPull();

    return () => {
      pullServiceRef.current?.stopAutoPull();
    };
  }, [enabled]);

  // Force pull function
  const forcePull = useCallback(async (): Promise<PullResult> => {
    if (!pullServiceRef.current) {
      return { success: false, changesApplied: 0, error: "Pull service not initialized" };
    }

    setIsPulling(true);
    try {
      const result = await pullServiceRef.current.forcePullNow();
      setLastPullResult(result);
      setLastPullTime(new Date());
      return result;
    } finally {
      setIsPulling(false);
    }
  }, []);

  return {
    isPulling,
    lastPullResult,
    lastPullTime,
    forcePull,
  };
}
