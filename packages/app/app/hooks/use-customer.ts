import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useBusiness } from "./use-business";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  dni: string | null;
  businessId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  creditLimit: string | null;
}

export function useCustomer(id: string | undefined) {
  const { currentBusiness } = useBusiness();
  
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!id || !currentBusiness?.id) return null;
      const res = await api.customers({ id }).get();
      if (res.data?.success) {
        return res.data.data as Customer;
      }
      return null;
    },
    enabled: !!id && !!currentBusiness?.id,
  });
}
