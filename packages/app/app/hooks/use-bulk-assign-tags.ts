/**
 * Bulk Assign Tags Hook (Service-based)
 * Reactively assign tags to multiple customers using PGlite services
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerTagService } from "~/lib/sync/service-provider";
import { customerTagsKeys } from "./use-customer-tags";

export interface BulkAssignTagsInput {
  customerIds: string[];
  tagIds: string[];
}

/**
 * Hook to assign tags to multiple customers at once
 */
export function useBulkAssignTags() {
  const customerTagService = useCustomerTagService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerIds, tagIds }: BulkAssignTagsInput): Promise<void> => {
      return customerTagService.bulkAssignTags(customerIds, tagIds);
    },
    onSuccess: (_, { customerIds }) => {
      // Invalidate tags for all affected customers
      for (const customerId of customerIds) {
        queryClient.invalidateQueries({ queryKey: customerTagsKeys.customerTags(customerId) });
      }
    },
  });
}
