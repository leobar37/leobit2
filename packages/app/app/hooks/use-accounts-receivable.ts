import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import type { Customer } from "~/hooks/use-customers";

export interface AccountsReceivableItem {
  customer: Customer;
  totalDebt: number;
  totalSales: number;
  totalPayments: number;
  lastSaleDate: Date | null;
}

export interface AccountsReceivableFilters {
  search?: string;
  minBalance?: number;
  limit?: number;
  offset?: number;
}

async function getAccountsReceivable(
  filters: AccountsReceivableFilters = {}
): Promise<AccountsReceivableItem[]> {
  const params: Record<string, string> = {};
  
  if (filters.search) params.search = filters.search;
  if (filters.minBalance !== undefined) params.minBalance = filters.minBalance.toString();
  if (filters.limit !== undefined) params.limit = filters.limit.toString();
  if (filters.offset !== undefined) params.offset = filters.offset.toString();

  const { data, error } = await api.reports["accounts-receivable"].get({
    query: params,
  });

  if (error) {
    throw new Error(String(error.value));
  }

  return (data as { data: AccountsReceivableItem[] })?.data || [];
}

async function getTotalAccountsReceivable(): Promise<number> {
  const { data, error } = await api.reports["accounts-receivable"].total.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return (data as { data: { total: number } })?.data?.total || 0;
}

export function useAccountsReceivable(filters: AccountsReceivableFilters = {}) {
  return useQuery({
    queryKey: ["reports", "accounts-receivable", filters],
    queryFn: () => getAccountsReceivable(filters),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTotalAccountsReceivable() {
  return useQuery({
    queryKey: ["reports", "accounts-receivable", "total"],
    queryFn: getTotalAccountsReceivable,
    staleTime: 1000 * 60 * 5,
  });
}
