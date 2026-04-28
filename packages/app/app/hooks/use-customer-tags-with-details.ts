/**
 * Customer Tags Hook with Tag Details
 * Returns customer tags enriched with tag name and color
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";

export interface CustomerTagWithDetails {
  tagId: string;
  tagName: string;
  tagColor: string;
  assignedAt: string;
}

const QUERY_KEYS = {
  customerTagsWithDetails: (customerId: string) => ["customer-tags-with-details", customerId] as const,
} as const;

/**
 * Get all tags for a specific customer with tag details (name, color)
 */
export function useCustomerTagsWithDetails(customerId: string | null) {
  return useQuery({
    queryKey: customerId ? QUERY_KEYS.customerTagsWithDetails(customerId) : ["customer-tags-with-details", "none"],
    queryFn: async () => {
      if (!customerId) return [];
      const response = await api.customers({ id: customerId }).tags.get();
      return extractData(response) as unknown as CustomerTagWithDetails[];
    },
    enabled: !!customerId,
  });
}

/**
 * Invalidate customer tags with details query
 */
export function useInvalidateCustomerTagsWithDetails() {
  const queryClient = useQueryClient();

  return (customerId: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.customerTagsWithDetails(customerId),
    });
  };
}
