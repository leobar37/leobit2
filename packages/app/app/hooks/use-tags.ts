/**
 * Tags Hook (Service-based)
 * Reactively fetch and mutate tags using PGlite services
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTagService } from "~/lib/sync/engine-provider";
import type { Tag } from "@avileo/shared";
import type { CreateTagInput, UpdateTagInput } from "~/lib/services/tag-service";

// Re-export Tag type for backward compatibility
export type { Tag };

const QUERY_KEYS = {
  tags: ["tags"],
  tag: (id: string) => ["tags", id],
} as const;

/**
 * Get all tags for the current business
 */
export function useTags() {
  const tagService = useTagService();

  return useQuery({
    queryKey: QUERY_KEYS.tags,
    queryFn: async () => {
      return tagService.findByBusiness();
    },
  });
}

/**
 * Get a single tag by ID
 */
export function useTag(id: string | null) {
  const tagService = useTagService();

  return useQuery({
    queryKey: id ? QUERY_KEYS.tag(id) : ["tags", "detail"],
    queryFn: async () => {
      if (!id) return null;
      return tagService.findById(id);
    },
    enabled: !!id,
  });
}

/**
 * Create a new tag
 */
export function useCreateTag() {
  const tagService = useTagService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTagInput): Promise<Tag> => {
      return tagService.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });
}

/**
 * Update an existing tag
 */
export function useUpdateTag() {
  const tagService = useTagService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateTagInput;
    }): Promise<void> => {
      return tagService.update(id, input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tag(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });
}

/**
 * Delete a tag
 */
export function useDeleteTag() {
  const tagService = useTagService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return tagService.delete(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tag(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });
}
