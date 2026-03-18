import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";

export interface CustomerGroupBadgeItem {
  id: string;
  name: string;
  syncStatus: string;
}

const QUERY_KEYS = {
  customerGroupsWithDetails: (customerId: string) =>
    ["customer-groups-with-details", customerId] as const,
} as const;

/**
 * Get groups that a customer belongs to (online-only)
 */
export function useCustomerGroupsWithDetails(customerId: string | null) {
  return useQuery({
    queryKey: customerId
      ? QUERY_KEYS.customerGroupsWithDetails(customerId)
      : ["customer-groups-with-details", "none"],
    queryFn: async () => {
      if (!customerId) return [];

      const response = await api.customers({ id: customerId }).groups.get();
      return extractData<CustomerGroupBadgeItem[]>(response, "Error al cargar grupos del cliente");
    },
    enabled: !!customerId,
  });
}

/**
 * Invalidate customer groups queries for a specific customer
 * Call this after adding/removing members from groups
 */
export function useInvalidateCustomerGroups() {
  const queryClient = useQueryClient();

  return (customerId: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.customerGroupsWithDetails(customerId),
    });
  };
}