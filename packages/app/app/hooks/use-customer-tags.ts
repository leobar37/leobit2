/**
 * Customer Tags Hook (API-based)
 * Reactively fetch and mutate customer-tag assignments using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export interface CustomerTagItem {
  tagId: string;
  tagName: string;
  tagColor: string;
  assignedAt: string;
}

export const customerTagsKeys = {
  customerTags: (customerId: string) => ["customer-tags", customerId] as const,
  customerTagIds: (customerId: string) => ["customer-tag-ids", customerId] as const,
} as const;

/**
 * Get all tags for a specific customer
 */
export function useCustomerTags(customerId: string | null) {
  return useQuery({
    queryKey: customerId ? customerTagsKeys.customerTags(customerId) : ["customer-tags", "none"],
    queryFn: async () => {
      if (!customerId) return [];
      const response = await api.customers({ id: customerId }).tags.get();
      return extractData(response) as unknown as CustomerTagItem[];
    },
    enabled: !!customerId,
  });
}

/**
 * Get tag IDs for a customer (for quick filtering)
 */
export function useCustomerTagIds(customerId: string | null) {
  const { data: customerTags } = useCustomerTags(customerId);

  return customerTags?.map((ct) => ct.tagId) ?? [];
}

/**
 * Add a tag to a customer
 */
export function useAddCustomerTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, tagId }: { customerId: string; tagId: string }): Promise<void> => {
      // Get current tags
      const response = await api.customers({ id: customerId }).tags.get();
      const currentTags = extractData(response) as unknown as CustomerTagItem[];
      const tagIds = [...currentTags.map((t) => t.tagId), tagId];
      const uniqueTagIds = [...new Set(tagIds)];

      const assignResponse = await api.customers({ id: customerId }).tags.post({ tagIds: uniqueTagIds });
      extractData(assignResponse);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: customerTagsKeys.customerTags(vars.customerId) });
      queryClient.invalidateQueries({ queryKey: ["customer-tags-with-details", vars.customerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tags([vars.customerId]) });
    },
  });
}

/**
 * Remove a tag from a customer
 */
export function useRemoveCustomerTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, tagId }: { customerId: string; tagId: string }): Promise<void> => {
      const response = await api.customers({ id: customerId }).tags.get();
      const currentTags = extractData(response) as unknown as CustomerTagItem[];
      const tagIds = currentTags.map((t) => t.tagId).filter((id) => id !== tagId);

      const assignResponse = await api.customers({ id: customerId }).tags.post({ tagIds });
      extractData(assignResponse);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: customerTagsKeys.customerTags(vars.customerId) });
      queryClient.invalidateQueries({ queryKey: ["customer-tags-with-details", vars.customerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tags([vars.customerId]) });
    },
  });
}

/**
 * Assign tags to a customer (replaces all existing tags)
 */
export function useAssignCustomerTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, tagIds }: { customerId: string; tagIds: string[] }): Promise<void> => {
      const response = await api.customers({ id: customerId }).tags.post({ tagIds });
      extractData(response);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: customerTagsKeys.customerTags(vars.customerId) });
      queryClient.invalidateQueries({ queryKey: ["customer-tags-with-details", vars.customerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.tags([vars.customerId]) });
    },
  });
}
