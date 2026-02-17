import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface Asset {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

export interface AssetUploadResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: () => [...assetKeys.lists()] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};

export function useAssets() {
  return useQuery({
    queryKey: assetKeys.list(),
    queryFn: async () => {
      const { data, error } = await api.assets.get();

      if (error) {
        throw new Error(String(error.value));
      }

      return data as unknown as Asset[];
    },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.assets({ id }).get();

      if (error) {
        throw new Error(String(error.value));
      }

      return data as unknown as Asset;
    },
    enabled: !!id,
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/assets/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload asset");
      }

      return (await response.json()) as AssetUploadResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.assets({ id }).delete();

      if (error) {
        throw new Error(String(error.value));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}
