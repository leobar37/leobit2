import { useQuery } from "@tanstack/react-query";
import { useCustomerGroupService } from "~/lib/sync/service-provider";

export interface CustomerGroupBadgeItem {
  id: string;
  name: string;
  syncStatus: string;
}

const QUERY_KEYS = {
  customerGroupsWithDetails: (customerId: string) =>
    ["customer-groups-with-details", customerId] as const,
} as const;

export function useCustomerGroupsWithDetails(customerId: string | null) {
  const customerGroupService = useCustomerGroupService();

  return useQuery({
    queryKey: customerId
      ? QUERY_KEYS.customerGroupsWithDetails(customerId)
      : ["customer-groups-with-details", "none"],
    queryFn: async () => {
      if (!customerId) return [];

      return customerGroupService.getCustomerGroups(customerId) as Promise<CustomerGroupBadgeItem[]>;
    },
    enabled: !!customerId,
  });
}
