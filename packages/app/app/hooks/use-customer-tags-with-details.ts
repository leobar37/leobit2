/**
 * Customer Tags Hook with Tag Details
 * Returns customer tags enriched with tag name and color
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { CustomerTagService } from "~/lib/services/customer-tag-service";
import { TagService } from "~/lib/services/tag-service";
import type { CustomerTags as CustomerTag, Tags as Tag } from "~/lib/sync/generated/schema";

export interface CustomerTagWithDetails extends CustomerTag {
  tagName: string;
  tagColor: string;
}

const QUERY_KEYS = {
  customerTagsWithDetails: (customerId: string) => ["customer-tags-with-details", customerId] as const,
} as const;

/**
 * Get all tags for a specific customer with tag details (name, color)
 */
export function useCustomerTagsWithDetails(customerId: string | null) {
  const engine = useSyncEngine();
  const customerTagService = engine.use("customerTags", () => new CustomerTagService(engine));
  const tagService = engine.use("tags", () => new TagService(engine));

  return useQuery({
    queryKey: customerId ? QUERY_KEYS.customerTagsWithDetails(customerId) : ["customer-tags-with-details", "none"],
    queryFn: async () => {
      if (!customerId) return [];
      
      // Get customer-tag assignments
      const customerTags = await customerTagService.getCustomerTags(customerId);
      
      if (customerTags.length === 0) return [];
      
      // Get all tags to enrich with names and colors
      const allTags = await tagService.findByBusiness();
      const tagMap = new Map(allTags.map(t => [t.id, t]));
      
      // Enrich customer tags with tag details
      return customerTags.map(ct => {
        const tag = tagMap.get(ct.tagId);
        return {
          ...ct,
          tagName: tag?.name ?? "Tag",
          tagColor: tag?.color ?? "#f97316",
        };
      });
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
      queryKey: QUERY_KEYS.customerTagsWithDetails(customerId) 
    });
  };
}
