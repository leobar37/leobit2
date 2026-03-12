import { useMemo } from "react";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { customerCollection } from "~/lib/db/collections/customer.collection";
import { paymentCollection } from "~/lib/db/collections/payment.collection";
import { saleCollection } from "~/lib/db/collections/sale.collection";
import { getStoredBusinessId } from "~/lib/session-storage";
import { useBusiness } from "./use-business";
import type { Customer, Payment } from "~/lib/db/schema";
import type { Sale } from "~/lib/db/schemas/sale";

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

function saleCountsTowardDebt(sale: Pick<Sale, "saleType" | "status">) {
  return (
    sale.saleType === "credito" &&
    sale.status !== "draft" &&
    sale.status !== "cancelled"
  );
}

export function useAccountsReceivable(filters: AccountsReceivableFilters = {}) {
  const { data: business } = useBusiness();
  const businessId = business?.id || getStoredBusinessId();

  const customersQuery = useLiveQuery(
    (q) =>
      q
        .from({ customer: customerCollection })
        .where(({ customer }) =>
          businessId ? eq(customer.businessId, businessId) : eq(customer.businessId, "__pending_business__")
        )
        .orderBy(({ customer }) => customer.name, "asc"),
    [businessId]
  );

  const salesQuery = useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) =>
          businessId ? eq(sale.businessId, businessId) : eq(sale.businessId, "__pending_business__")
        )
        .orderBy(({ sale }) => sale.createdAt, "desc"),
    [businessId]
  );

  const paymentsQuery = useLiveQuery(
    (q) =>
      q
        .from({ payment: paymentCollection })
        .where(({ payment }) =>
          businessId ? eq(payment.businessId, businessId) : eq(payment.businessId, "__pending_business__")
        )
        .orderBy(({ payment }) => payment.createdAt, "desc"),
    [businessId]
  );

  const data = useMemo(() => {
    const customers = (customersQuery.data ?? []) as Customer[];
    const sales = (salesQuery.data ?? []) as Sale[];
    const payments = (paymentsQuery.data ?? []) as Payment[];
    const normalizedSearch = filters.search?.trim().toLowerCase();

    const salesByCustomer = new Map<
      string,
      { totalSales: number; lastSaleDate: Date | null }
    >();
    const paymentsByCustomer = new Map<string, number>();

    for (const sale of sales) {
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

    for (const payment of payments) {
      if (filters.customerId && payment.customerId !== filters.customerId) {
        continue;
      }

      paymentsByCustomer.set(
        payment.customerId,
        (paymentsByCustomer.get(payment.customerId) ?? 0) +
          Number(payment.amount ?? 0)
      );
    }

    const accounts = customers
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
  }, [
    customersQuery.data,
    salesQuery.data,
    paymentsQuery.data,
    filters.customerId,
    filters.limit,
    filters.minBalance,
    filters.search,
  ]);

  return {
    data,
    isLoading:
      customersQuery.data === undefined ||
      salesQuery.data === undefined ||
      paymentsQuery.data === undefined,
  };
}

export function useTotalAccountsReceivable(filters: AccountsReceivableFilters = {}) {
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
