/**
 * Tags Hooks
 * TanStack Query hooks for tag management
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";

export interface Tag {
  id: string;
  name: string;
  color: string;
  customerCount: number;
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

// Query key factory
const tagsKeys = {
  all: ["tags"] as const,
  lists: () => [...tagsKeys.all, "list"] as const,
  list: (filters: { search?: string }) => [...tagsKeys.lists(), filters] as const,
  details: () => [...tagsKeys.all, "detail"] as const,
  detail: (id: string) => [...tagsKeys.details(), id] as const,
};

/**
 * Hook to fetch all tags
 */
export function useTags() {
  return useQuery({
    queryKey: tagsKeys.lists(),
    queryFn: async () => {
      const response = await api.tags.get();
      return extractData<Tag[]>(response, "Error al cargar etiquetas");
    },
  });
}

/**
 * Hook to fetch a single tag
 */
export function useTag(id: string) {
  return useQuery({
    queryKey: tagsKeys.detail(id),
    queryFn: async () => {
      const response = await api.tags({ id }).get();
      return extractData<Tag>(response, "Error al cargar etiqueta");
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagInput) => {
      const response = await api.tags.post(data);
      return extractData<Tag>(response, "Error al crear etiqueta");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.lists() });
    },
  });
}

/**
 * Hook to update a tag
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTagInput }) => {
      const response = await api.tags({ id }).put(data);
      return extractData<Tag>(response, "Error al actualizar etiqueta");
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tagsKeys.detail(id) });
    },
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.tags({ id }).delete();
      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.lists() });
    },
  });
}
