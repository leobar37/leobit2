import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Business, CreateBusinessInput, UpdateBusinessInput } from "@avileo/shared";
import { api } from "~/lib/api-client";
import { setStoredBusinessId, setStoredBusinessUserId } from "~/lib/session-storage";
import { useEngine } from "~/engine";
import { cacheBusiness, getCachedBusiness } from "~/lib/business-cache";
import type { PGlite } from "@electric-sql/pglite";

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

async function getBusinessWithFallback(
  pg: PGlite | null
): Promise<{ business: Business | null; fromCache: boolean; error: Error | null }> {
  const request = api.businesses.me.get();

  let data;
  let error: unknown = null;

  try {
    const result = await request;
    data = result.data;
    error = result.error;
  } catch (err) {
    error = err;
  }

  if (error || !data?.success || !data.data) {
    if (pg) {
      const cached = await getCachedBusiness(pg);
      if (cached) {
        console.log("[useBusiness] API failed, using cached business data");
        return { business: cached as unknown as Business, fromCache: true, error: null };
      }
    }
    return {
      business: null,
      fromCache: false,
      error: error ? new Error(String(error)) : new Error("Failed to fetch business"),
    };
  }

  const business = data.data as unknown as Business;

  if (business.id) {
    setStoredBusinessId(business.id);
  }
  if (business.businessUserId) {
    setStoredBusinessUserId(business.businessUserId);
  }

  if (pg) {
    await cacheBusiness(pg, business as unknown as Parameters<typeof cacheBusiness>[1]);
  }

  return { business, fromCache: false, error: null };
}

export function useBusiness() {
  const { pg } = useEngine();

  return useQuery<Business>({
    queryKey: ["business"],
    queryFn: () => getBusinessWithFallback(pg).then((r) => {
      if (r.error) throw r.error;
      if (!r.business) throw new Error("No business data available");
      return r.business;
    }),
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useBusinessWithCacheStatus() {
  const { pg } = useEngine();

  return useQuery<Business & { fromCache?: boolean }>({
    queryKey: ["business"],
    queryFn: async () => {
      const result = await getBusinessWithFallback(pg);
      if (result.error) throw result.error;
      if (!result.business) throw new Error("No business data available");
      return { ...result.business, fromCache: result.fromCache };
    },
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
