import { useMemo } from "react";
import { useAccountsReceivable } from "./use-accounts-receivable";

export interface CustomerBalance {
  totalSales: number;
  totalPayments: number;
  balanceDue: number;
}

export function useCustomerBalance(customerId: string | null) {
  const { data, isLoading } = useAccountsReceivable(
    customerId ? { customerId } : {}
  );

  const balance = useMemo<CustomerBalance>(() => {
    const account = data[0];

    if (!account) {
      return {
        totalSales: 0,
        totalPayments: 0,
        balanceDue: 0,
      };
    }

    return {
      totalSales: account.totalSales,
      totalPayments: account.totalPayments,
      balanceDue: account.totalDebt,
    };
  }, [data]);

  return {
    data: balance,
    isLoading,
  };
}
