import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useBusiness } from "./use-business";

export interface AccountReceivable {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalPayments: number;
  balance: number;
}

export function useAccountsReceivable() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["accounts-receivable"],
    queryFn: async () => {
      if (!business?.id) return [];
      const res = await api.reports["accounts-receivable"].get();
      if (res.data?.success) {
        return res.data.data as AccountReceivable[];
      }
      return [];
    },
    enabled: !!business?.id,
  });
}
