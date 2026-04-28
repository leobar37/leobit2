/**
 * Tags Hook (API-based)
 * Reactively fetch and mutate tags using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export interface Tag {
  id: string;
  name: string;
  color: string;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

/**
 * Get all tags for the current business
 */
export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: async () => {
      const response = await api.tags.get();
      return extractData<Tag[]>(response);
    },
  });
}

/**
 * Get a single tag by ID
 */
export function useTag(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.tags.detail(id) : ["tags", "detail"],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.tags({ id }).get();
      return extractData<Tag>(response);
    },
    enabled: !!id,
  });
}

/**
 * Create a new tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTagInput): Promise<Tag> => {
      const response = await api.tags.post(input);
      return extractData<Tag>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}

/**
 * Update an existing tag
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateTagInput;
    }): Promise<Tag> => {
      const response = await api.tags({ id }).put(input);
      return extractData<Tag>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tags.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}

/**
 * Delete a tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api.tags({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tags.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}
