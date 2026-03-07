import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface SalesTodayStats {
  today: {
    amount: number;
    kilos: number;
    count: number;
  };
  yesterday: {
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

export interface WeeklySalesData {
  labels: string[];
  data: number[];
}

export function useSalesTodayStats() {
  return useQuery({
    queryKey: ["dashboard", "sales-today"],
    queryFn: async () => {
      const { data, error } = await api.reports["sales-today"].get();
      if (error) throw new Error(String(error.value));
      return (data as { data: SalesTodayStats }).data;
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

export function useWeeklySales() {
  return useQuery({
    queryKey: ["dashboard", "sales-weekly"],
    queryFn: async () => {
      const { data, error } = await api.reports["sales-weekly"].get();
      if (error) throw new Error(String(error.value));
      return (data as { data: WeeklySalesData }).data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
