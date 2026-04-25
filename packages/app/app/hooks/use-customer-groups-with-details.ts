import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEngineService } from "@avileo/drizzle-sync/react";
import { CustomerGroupService } from "~/lib/services/customer-group-service";

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
 * Get groups that a customer belongs to (local-first, offline-ready)
 */
export function useCustomerGroupsWithDetails(customerId: string | null) {
  const customerGroupService = useEngineService<CustomerGroupService>("customerGroups");

  return useQuery({
    queryKey: customerId
      ? QUERY_KEYS.customerGroupsWithDetails(customerId)
      : ["customer-groups-with-details", "none"],
    queryFn: async () => {
      if (!customerId) return [];

      return customerGroupService.getCustomerGroups(customerId);
    },
    enabled: !!customerId,
  });
}

export function useCustomerGroupsSummary(customerIds: string[]) {
  const customerGroupService = useEngineService<CustomerGroupService>("customerGroups");

  return useQuery({
    queryKey: ["customer-groups-summary", customerIds],
    queryFn: async () => customerGroupService.getCustomerGroupsForCustomers(customerIds),
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
