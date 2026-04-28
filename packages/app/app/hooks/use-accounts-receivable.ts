import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export interface AccountsReceivableCustomer {
  id: string;
  name: string;
  phone: string | null;
}

export interface AccountsReceivableItem {
  customer: AccountsReceivableCustomer;
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
  customerId?: string;
}

export interface AccountsReceivablePage {
  items: AccountsReceivableItem[];
  total: number;
}

export function useAccountsReceivable(filters: AccountsReceivableFilters = {}) {
  const limit = filters.limit ?? (filters.customerId ? 1 : 100);
  const offset = filters.offset ?? 0;

  const query = useQuery({
    queryKey: queryKeys.reports.accountsReceivable({
      ...filters,
      limit,
      offset,
    } as Record<string, unknown>),
    queryFn: async (): Promise<AccountsReceivablePage> => {
      const response = await api.reports["accounts-receivable"].get({
        query: {
          search: filters.search,
          minBalance: filters.minBalance?.toString(),
          limit: limit.toString(),
          offset: offset.toString(),
        },
      });

      const items = extractData(response) as Array<{
        customer: AccountsReceivableCustomer;
        totalDebt: number;
        totalSales: number;
        totalPayments: number;
        lastSaleDate: string | null;
      }>;

      return {
        items: items.map((item) => ({
          customer: item.customer,
          totalDebt: Number(item.totalDebt ?? 0),
          totalSales: Number(item.totalSales ?? 0),
          totalPayments: Number(item.totalPayments ?? 0),
          lastSaleDate: item.lastSaleDate ? new Date(item.lastSaleDate) : null,
        })),
        total: items.length,
      };
    },
  });

  return {
    ...query,
    data: query.data?.items ?? [],
    total: query.data?.total ?? 0,
  };
}

export function useTotalAccountsReceivable(
  filters: AccountsReceivableFilters = {}
) {
  const { data: totalDebt = 0, isLoading } = useQuery({
    queryKey: queryKeys.reports.accountsReceivableTotal(filters as Record<string, unknown>),
    queryFn: async () => {
      const response = await api.reports["accounts-receivable"].total.get();
      const data = extractData(response) as { total: number };
      return data.total;
    },
  });

  return {
    data: totalDebt,
    isLoading,
  };
}
