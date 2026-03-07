/**
 * Bulk Assign Tags Hook
 * TanStack Query hook for bulk customer-tag assignments
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
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
    mutationFn: async ({ customerIds, tagIds }: BulkAssignTagsInput) => {
      const response = await api.customers.bulk.tags.post({
        customerIds,
        tagIds,
      });
      return extractData<{ success: boolean; message: string }>(
        response,
        "Error al asignar etiquetas"
      );
    },
    onSuccess: (_, { customerIds }) => {
      // Invalidate tags for all affected customers
      for (const customerId of customerIds) {
        queryClient.invalidateQueries({
          queryKey: customerTagsKeys.forCustomer(customerId),
        });
      }
    },
  });
}
