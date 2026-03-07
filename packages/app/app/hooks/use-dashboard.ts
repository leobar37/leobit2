import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
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

export function useSalesStats(period: PeriodParams) {
  return useQuery({
    queryKey: ["dashboard", "sales-stats", period],
    queryFn: async () => {
      const params: Record<string, string> = { type: period.type };
      if (period.startDate) params.startDate = period.startDate;
      if (period.endDate) params.endDate = period.endDate;

      const { data, error } = await api.reports["sales-stats"].get({
        query: params,
      });
      if (error) throw new Error(String(error.value));
      return (data as { data: SalesStats }).data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useDebtorsSummary() {
  return useQuery({
    queryKey: ["dashboard", "debtors-summary"],
    queryFn: async () => {
      const { data, error } = await api.reports["debtors-summary"].get();
      if (error) throw new Error(String(error.value));
      return (data as { data: DebtorsSummary }).data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSalesChart(period: PeriodParams) {
  return useQuery({
    queryKey: ["dashboard", "sales-chart", period],
    queryFn: async () => {
      const params: Record<string, string> = { type: period.type };
      if (period.startDate) params.startDate = period.startDate;
      if (period.endDate) params.endDate = period.endDate;

      const { data, error } = await api.reports["sales-chart"].get({
        query: params,
      });
      if (error) throw new Error(String(error.value));
      return (data as { data: ChartData }).data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Legacy hooks for backward compatibility
export function useSalesTodayStats() {
  return useSalesStats({ type: "day" });
}

export function useWeeklySales() {
  return useSalesChart({ type: "week" });
}
