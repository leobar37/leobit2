/**
 * Dashboard Hooks
 * Hybrid queries that try API first, fallback to local PGlite
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { SaleService } from "~/lib/services/sale-service";
import type { PeriodType } from "~/components/dashboard/period-selector";

export interface PeriodParams {
  type: PeriodType;
  startDate?: string;
  endDate?: string;
}

export interface SalesStats {
  current: {
    amount: number;
    kilos: number;
    count: number;
  };
  previous: {
    amount: number;
    kilos: number;
    count: number;
  };
  change: {
    amount: number;
    kilos: number;
    count: number;
  };
}

export interface DebtorsSummary {
  totalDebt: number;
  debtorsCount: number;
}

export interface ChartData {
  labels: string[];
  data: number[];
}

/**
 * Sales stats - hybrid query (API with local fallback)
 */
export function useSalesStats(period: PeriodParams) {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));

  return useQuery({
    queryKey: ["dashboard", "sales-stats", period],
    queryFn: async () => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          const params: Record<string, string> = { type: period.type };
          if (period.startDate) params.startDate = period.startDate;
          if (period.endDate) params.endDate = period.endDate;

          const { data, error } = await api.reports["sales-stats"].get({
            query: params,
          });
          if (!error && data) {
            return (data as { data: SalesStats }).data;
          }
        } catch (e) {
          console.warn("[useSalesStats] API failed, falling back to local");
        }
      }

      // Fallback: calculate from local PGlite
      const currentStats = await saleService.getSalesStats(period);

      // For now, return the current stats with empty previous/change
      // (matching the API response structure)
      return {
        current: currentStats,
        previous: { amount: 0, kilos: 0, count: 0 },
        change: { amount: 0, kilos: 0, count: 0 },
      } as SalesStats;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}

/**
 * Debtors summary - hybrid query (API with local fallback)
 */
export function useDebtorsSummary() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));

  return useQuery({
    queryKey: ["dashboard", "debtors-summary"],
    queryFn: async () => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          const { data, error } = await api.reports["debtors-summary"].get();
          if (!error && data) {
            return (data as { data: DebtorsSummary }).data;
          }
        } catch (e) {
          console.warn("[useDebtorsSummary] API failed, falling back to local");
        }
      }

      // Fallback: calculate from local PGlite
      return saleService.getDebtorsSummary();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Sales chart - hybrid query (API with local fallback)
 */
export function useSalesChart(period: PeriodParams) {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));

  return useQuery({
    queryKey: ["dashboard", "sales-chart", period],
    queryFn: async () => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          const params: Record<string, string> = { type: period.type };
          if (period.startDate) params.startDate = period.startDate;
          if (period.endDate) params.endDate = period.endDate;

          const { data, error } = await api.reports["sales-chart"].get({
            query: params,
          });
          if (!error && data) {
            return (data as { data: ChartData }).data;
          }
        } catch (e) {
          console.warn("[useSalesChart] API failed, falling back to local");
        }
      }

      // Fallback: calculate from local PGlite
      return saleService.getSalesChart(period);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Legacy hooks for backward compatibility
export function useSalesTodayStats() {
  return useSalesStats({ type: "day" });
}

export function useWeeklySales() {
  return useSalesChart({ type: "week" });
}
