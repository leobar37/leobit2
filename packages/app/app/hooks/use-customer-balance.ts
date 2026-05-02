import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";

export interface CustomerBalance {
  totalSales: number;
  totalPayments: number;
  balanceDue: number;
}

export function useCustomerBalance(customerId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["customers", customerId, "balance"],
    queryFn: async () => {
      const response = await api.customers({ id: customerId! }).balance.get();
      return extractData<CustomerBalance>(response);
    },
    enabled: !!customerId,
  });

  return {
    data: data ?? { totalSales: 0, totalPayments: 0, balanceDue: 0 },
    isLoading,
  };
}
