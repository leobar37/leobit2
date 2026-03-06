import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface CustomerBalance {
  totalSales: number;
  totalPayments: number;
  balanceDue: number;
}

async function getCustomerBalance(customerId: string): Promise<CustomerBalance> {
  const { data, error } = await api.customers({ id: customerId }).balance.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as CustomerBalance;
}

export function useCustomerBalance(customerId: string | null) {
  return useQuery({
    queryKey: ["customers", customerId, "balance"],
    queryFn: () => getCustomerBalance(customerId!),
    enabled: !!customerId,
  });
}
