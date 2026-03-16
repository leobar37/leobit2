import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Business,
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@avileo/shared";
import { api } from "~/lib/api-client";
import { setStoredBusinessId } from "~/lib/session-storage";

async function getBusiness(): Promise<Business> {
  console.log("[useBusiness] Step 1: getBusiness() called");

  console.log("[useBusiness] Step 2: Creating API request...");
  const request = api.businesses.me.get();

  console.log("[useBusiness] Step 3: Awaiting response...");
  const { data, error } = await request;

  console.log("[useBusiness] Step 4: Got response:", { data, error });

  if (error) {
    console.error("[useBusiness] Step 5: API error:", error);
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    console.error("[useBusiness] Step 5: No data or success=false:", data);
    throw new Error("Failed to fetch business");
  }

  const business = data.data as unknown as Business;
  console.log("[useBusiness] Step 6: Business fetched:", business.id, business.name);

  // Store business ID for multi-business support in API requests
  if (business.id) {
    setStoredBusinessId(business.id);
  }

  return business;
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
  return useQuery<Business>({
    queryKey: ["business"],
    queryFn: getBusiness,
    retry: false,
    throwOnError: false,
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
