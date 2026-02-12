import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Business,
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@avileo/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function getBusiness(): Promise<Business> {
  const response = await fetch(`${API_URL}/businesses/me`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch business");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch business");
  }

  return result.data;
}

async function createBusiness(input: CreateBusinessInput): Promise<Business> {
  const response = await fetch(`${API_URL}/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create business");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to create business");
  }

  return result.data;
}

async function updateBusiness(
  id: string,
  input: UpdateBusinessInput
): Promise<Business> {
  const response = await fetch(`${API_URL}/businesses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update business");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to update business");
  }

  return result.data;
}

async function uploadBusinessLogo(
  id: string,
  file: File
): Promise<{ logoUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/businesses/${id}/logo`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload logo");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to upload logo");
  }

  return result.data;
}

export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: getBusiness,
    retry: false,
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBusinessInput }) =>
      updateBusiness(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}

export function useUploadBusinessLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadBusinessLogo(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}
