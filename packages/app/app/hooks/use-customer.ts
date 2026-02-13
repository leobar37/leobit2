import { useQuery } from "@tanstack/react-query";
import { loadCustomers } from "~/lib/db/collections";

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const customers = await loadCustomers();
      return customers.find((c) => c.id === id) || null;
    },
    enabled: !!id,
  });
}
