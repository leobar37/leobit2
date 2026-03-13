import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSaleService } from "~/lib/sync/service-provider";
import { useCustomerService } from "~/lib/sync/service-provider";
import { usePaymentService } from "~/lib/sync/service-provider";
import type { Customer } from "@avileo/shared";

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
  customerId?: string;
}

// Sale interface for local calculations
interface SaleData {
  id: string;
  customerId: string | null;
  saleType: string;
  status: string;
  totalAmount: string;
  saleDate: string | null;
}

// Payment interface for local calculations (matches Abono from service)
interface PaymentData {
  id: string;
  customer_id: string;
  amount: string;
}

function saleCountsTowardDebt(sale: Pick<SaleData, "saleType" | "status">) {
  return (
    sale.saleType === "credito" &&
    sale.status !== "draft" &&
    sale.status !== "cancelled"
  );
}

export function useAccountsReceivable(filters: AccountsReceivableFilters = {}) {
  const saleService = useSaleService();
  const customerService = useCustomerService();
  const paymentService = usePaymentService();

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["accounts-receivable", "customers"],
    queryFn: () => customerService.findByBusiness(),
  });

  const { data: sales = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ["accounts-receivable", "sales"],
    queryFn: () => saleService.findByBusiness(),
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["accounts-receivable", "payments"],
    queryFn: () => paymentService.findByBusiness(),
  });

  const data = useMemo(() => {
    const normalizedSearch = filters.search?.trim().toLowerCase();

    const salesByCustomer = new Map<
      string,
      { totalSales: number; lastSaleDate: Date | null }
    >();
    const paymentsByCustomer = new Map<string, number>();

    for (const sale of sales as SaleData[]) {
      if (!sale.customerId || !saleCountsTowardDebt(sale)) {
        continue;
      }

      if (filters.customerId && sale.customerId !== filters.customerId) {
        continue;
      }

      const current = salesByCustomer.get(sale.customerId) ?? {
        totalSales: 0,
        lastSaleDate: null,
      };
      const saleDate = sale.saleDate ? new Date(sale.saleDate) : null;

      salesByCustomer.set(sale.customerId, {
        totalSales: current.totalSales + Number(sale.totalAmount ?? 0),
        lastSaleDate:
          current.lastSaleDate && saleDate
            ? current.lastSaleDate > saleDate
              ? current.lastSaleDate
              : saleDate
            : current.lastSaleDate ?? saleDate,
      });
    }

    for (const payment of payments as PaymentData[]) {
      if (filters.customerId && payment.customer_id !== filters.customerId) {
        continue;
      }

      paymentsByCustomer.set(
        payment.customer_id,
        (paymentsByCustomer.get(payment.customer_id) ?? 0) +
          Number(payment.amount ?? 0)
      );
    }

    const accounts = (customers as Customer[])
      .filter((customer) => {
        if (filters.customerId) {
          return customer.id === filters.customerId;
        }

        if (!normalizedSearch) {
          return true;
        }

        return customer.name.toLowerCase().includes(normalizedSearch);
      })
      .map<AccountsReceivableItem>((customer) => {
        const customerSales = salesByCustomer.get(customer.id);
        const totalSales = customerSales?.totalSales ?? 0;
        const totalPayments = paymentsByCustomer.get(customer.id) ?? 0;
        const totalDebt = Math.max(totalSales - totalPayments, 0);

        return {
          customer,
          totalDebt,
          totalSales,
          totalPayments,
          lastSaleDate: customerSales?.lastSaleDate ?? null,
        };
      })
      .filter((account) => {
        if (filters.customerId) {
          return true;
        }

        if (filters.minBalance !== undefined) {
          return account.totalDebt >= filters.minBalance;
        }

        return account.totalDebt > 0;
      })
      .sort((a, b) => {
        if (b.totalDebt !== a.totalDebt) {
          return b.totalDebt - a.totalDebt;
        }

        return (
          (b.lastSaleDate?.getTime() ?? 0) - (a.lastSaleDate?.getTime() ?? 0)
        );
      });

    if (filters.limit && filters.limit > 0) {
      return accounts.slice(0, filters.limit);
    }

    return accounts;
  }, [customers, sales, payments, filters]);

  return {
    data,
    isLoading: isLoadingCustomers || isLoadingSales || isLoadingPayments,
  };
}

export function useTotalAccountsReceivable(
  filters: AccountsReceivableFilters = {}
) {
  const { data: accounts, isLoading } = useAccountsReceivable(filters);

  const totalDebt = useMemo(
    () => accounts.reduce((sum, account) => sum + account.totalDebt, 0),
    [accounts]
  );

  return {
    data: totalDebt,
    isLoading,
  };
}
