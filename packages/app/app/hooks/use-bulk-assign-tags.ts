/**
 * Bulk Assign Tags Hook (API-based)
 * Reactively assign tags to multiple customers using Eden Treaty API
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { customerTagsKeys } from "./use-customer-tags";

export interface BulkAssignTagsInput {
  customerIds: string[];
  tagIds: string[];
}

/**
 * Hook to assign tags to multiple customers at once
 */
export function useBulkAssignTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerIds, tagIds }: BulkAssignTagsInput): Promise<void> => {
      const response = await api.customers.bulk.tags.post({ customerIds, tagIds });
      extractData(response);
    },
    onSuccess: (_, { customerIds }) => {
      // Invalidate tags for all affected customers
      for (const customerId of customerIds) {
        queryClient.invalidateQueries({ queryKey: customerTagsKeys.customerTags(customerId) });
        queryClient.invalidateQueries({ queryKey: ["customer-tags-with-details", customerId] });
      }
    },
  });
}
