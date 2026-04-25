import { useQuery } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { PaymentService } from "~/lib/services/payment-service";
import type { Customers as Customer } from "~/lib/sync/generated/schema";

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
  customerId?: string;
}

export interface AccountsReceivablePage {
  items: AccountsReceivableItem[];
  total: number;
}

export function useAccountsReceivable(filters: AccountsReceivableFilters = {}) {
  const engine = useSyncEngine();
  const paymentService = engine.use("payments", () => new PaymentService(engine));

  const limit = filters.limit ?? (filters.customerId ? 1 : 100);
  const offset = filters.offset ?? 0;

  const query = useQuery({
    queryKey: ["accounts-receivable", { ...filters, limit, offset }],
    queryFn: async (): Promise<AccountsReceivablePage> => {
      const page = await paymentService.findAccountsReceivablePage({
        search: filters.search,
        minBalance: filters.minBalance,
        customerId: filters.customerId,
        limit,
        offset,
      });

      return {
        items: page.items.map((item) => ({
          customer: {
            id: item.customerId,
            name: item.customerName,
            phone: item.customerPhone,
          } as Customer,
          totalDebt: Number(item.totalDebt ?? 0),
          totalSales: Number(item.totalSales ?? 0),
          totalPayments: Number(item.totalPayments ?? 0),
          lastSaleDate: item.lastSaleDate ? new Date(item.lastSaleDate) : null,
        })),
        total: page.total,
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
  const engine = useSyncEngine();
  const paymentService = engine.use("payments", () => new PaymentService(engine));

  const { data: totalDebt = 0, isLoading } = useQuery({
    queryKey: ["accounts-receivable", "total", filters],
    queryFn: () =>
      paymentService.getAccountsReceivableTotal({
        search: filters.search,
        minBalance: filters.minBalance,
        customerId: filters.customerId,
      }),
  });

  return {
    data: totalDebt,
    isLoading,
  };
}
