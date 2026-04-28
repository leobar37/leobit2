import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

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
 * Get groups that a customer belongs to
 */
export function useCustomerGroupsWithDetails(customerId: string | null) {
  return useQuery({
    queryKey: customerId
      ? QUERY_KEYS.customerGroupsWithDetails(customerId)
      : ["customer-groups-with-details", "none"],
    queryFn: async () => {
      if (!customerId) return [];
      const response = await api.customers({ id: customerId }).groups.get();
      const groups = extractData(response) as Array<{ id: string; name: string }>;
      return groups.map((g) => ({ ...g, syncStatus: "synced" })) as CustomerGroupBadgeItem[];
    },
    enabled: !!customerId,
  });
}

export interface CustomerGroupSummaryItem extends CustomerGroupBadgeItem {
  customerId: string;
}

export function useCustomerGroupsSummary(customerIds: string[]) {
  return useQuery({
    queryKey: ["customer-groups-summary", customerIds],
    queryFn: async () => {
      if (customerIds.length === 0) return [];
      const results = await Promise.all(
        customerIds.map(async (customerId) => {
          const response = await api.customers({ id: customerId }).groups.get();
          const groups = extractData(response) as Array<{ id: string; name: string }>;
          return groups.map((g) => ({
            customerId,
            id: g.id,
            name: g.name,
            syncStatus: "synced",
          })) as CustomerGroupSummaryItem[];
        })
      );
      return results.flat();
    },
    enabled: customerIds.length > 0,
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
