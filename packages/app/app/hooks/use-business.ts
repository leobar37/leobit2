import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Business,
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@avileo/shared";
import { api } from "~/lib/api-client";

async function getBusiness(): Promise<Business> {
  const { data, error } = await api.businesses.me.get();

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to fetch business");
  }

  return data.data as unknown as Business;
}

async function createBusiness(input: CreateBusinessInput): Promise<Business> {
  const { data, error } = await api.businesses.post(input);

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to create business");
  }

  return data.data as unknown as Business;
}

async function updateBusiness(
  id: string,
  input: UpdateBusinessInput
): Promise<Business> {
  const { data, error } = await api.businesses({ id }).put(input);

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to update business");
  }

  return data.data as unknown as Business;
}

async function uploadBusinessLogo(
  id: string,
  file: File
): Promise<{ logoUrl: string }> {
  const { data, error } = await api.businesses({ id }).logo.post({ file });

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to upload logo");
  }

  return data.data as { logoUrl: string };
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
