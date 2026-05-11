/**
 * Dashboard Hooks
 * API-based queries using Eden Treaty
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
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

export interface WaterPaymentBreakdown {
  efectivo: number;
  yape: number;
  plin: number;
  transferencia: number;
  tarjeta: number;
}

export interface WaterRouteReportRow {
  distribucionId: string | null;
  routeName: string;
  sellerId: string | null;
  sellerLabel: string;
  stopsTotal: number;
  stopsPending: number;
  stopsCompleted: number;
  deliveredContainers: number;
  salesCount: number;
  totalRevenue: number;
  paymentBreakdown: WaterPaymentBreakdown;
}

export interface WaterOperationalReport {
  summary: {
    soldContainers: number;
    deliveredContainers: number;
    stopsTotal: number;
    stopsPending: number;
    stopsCompleted: number;
    totalRevenue: number;
    paymentBreakdown: WaterPaymentBreakdown;
  };
  routes: WaterRouteReportRow[];
}

/**
 * Sales stats - API query
 */
export function useSalesStats(period: PeriodParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(period),
    queryFn: async () => {
      const params: Record<string, string> = { type: period.type };
      if (period.startDate) params.startDate = period.startDate;
      if (period.endDate) params.endDate = period.endDate;

      const response = await api.reports["sales-stats"].get({
        query: params,
      });
      return extractData(response) as SalesStats;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}

/**
 * Debtors summary - API query
 */
export function useDebtorsSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.debtors,
    queryFn: async () => {
      const response = await api.reports["debtors-summary"].get();
      return extractData(response) as DebtorsSummary;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Sales chart - API query
 */
export function useSalesChart(period: PeriodParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.chart(period),
    queryFn: async () => {
      const params: Record<string, string> = { type: period.type };
      if (period.startDate) params.startDate = period.startDate;
      if (period.endDate) params.endDate = period.endDate;

      const response = await api.reports["sales-chart"].get({
        query: params,
      });
      return extractData(response) as ChartData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useWaterOperationalReport(
  period: PeriodParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.dashboard.water(period),
    queryFn: async () => {
      const params: Record<string, string> = { type: period.type };
      if (period.startDate) params.startDate = period.startDate;
      if (period.endDate) params.endDate = period.endDate;

      const response = await api.reports["water-operational"].get({
        query: params,
      });
      return extractData(response) as WaterOperationalReport;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 2,
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
