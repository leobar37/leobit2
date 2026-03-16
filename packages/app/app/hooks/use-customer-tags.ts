/**
 * Customer Tags Hook (Service-based)
 * Reactively fetch and mutate customer-tag assignments using PGlite services
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomerTagService, useTagService } from "~/lib/sync/service-provider";
import type { CustomerTag, Tag } from "@avileo/shared";

export const customerTagsKeys = {
  customerTags: (customerId: string) => ["customer-tags", customerId] as const,
  customerTagIds: (customerId: string) => ["customer-tag-ids", customerId] as const,
} as const;

/**
 * Get all tags for a specific customer
 */
export function useCustomerTags(customerId: string | null) {
  const customerTagService = useCustomerTagService();

  return useQuery({
    queryKey: customerId ? customerTagsKeys.customerTags(customerId) : ["customer-tags", "none"],
    queryFn: async () => {
      if (!customerId) return [];
      return customerTagService.getCustomerTags(customerId);
    },
    enabled: !!customerId,
  });
}

/**
 * Get tag IDs for a customer (for quick filtering)
 */
export function useCustomerTagIds(customerId: string | null) {
  const { data: customerTags } = useCustomerTags(customerId);

  return customerTags?.map(ct => ct.tagId) ?? [];
}

/**
 * Add a tag to a customer
 */
export function useAddCustomerTag() {
  const customerTagService = useCustomerTagService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, tagId }: { customerId: string; tagId: string }): Promise<void> => {
      return customerTagService.addTag(customerId, tagId);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: customerTagsKeys.customerTags(vars.customerId) });
      queryClient.invalidateQueries({ queryKey: ["customer-tags-with-details", vars.customerId] });
    },
  });
}

/**
 * Remove a tag from a customer
 */
export function useRemoveCustomerTag() {
  const customerTagService = useCustomerTagService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, tagId }: { customerId: string; tagId: string }): Promise<void> => {
      return customerTagService.removeTag(customerId, tagId);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: customerTagsKeys.customerTags(vars.customerId) });
      queryClient.invalidateQueries({ queryKey: ["customer-tags-with-details", vars.customerId] });
    },
  });
}

/**
 * Assign tags to a customer (replaces all existing tags)
 */
export function useAssignCustomerTags() {
  const customerTagService = useCustomerTagService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, tagIds }: { customerId: string; tagIds: string[] }): Promise<void> => {
      return customerTagService.assignTags(customerId, tagIds);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: customerTagsKeys.customerTags(vars.customerId) });
      queryClient.invalidateQueries({ queryKey: ["customer-tags-with-details", vars.customerId] });
    },
  });
}
