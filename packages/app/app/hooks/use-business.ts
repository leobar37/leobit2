import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Business, CreateBusinessInput, UpdateBusinessInput } from "@avileo/shared";
import type { PGlite } from "@electric-sql/pglite";
import { api } from "~/lib/api-client";
import { setStoredBusinessId, setStoredBusinessUserId } from "~/lib/session-storage";
import { offlineCache } from "~/lib/cache";
import { useEngine } from "~/engine";

async function createBusiness(input: CreateBusinessInput): Promise<Business> {
  const { data, error } = await api.businesses.post(input);

  if (error) {
    // Eden Treaty returns errors with value being an object { code, message }
    const errorValue = error.value as { code?: string; message?: string } | undefined;
    throw new Error(errorValue?.message || "Error al crear negocio");
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
    // Eden Treaty returns errors with value being an object { code, message }
    const errorValue = error.value as { code?: string; message?: string } | undefined;
    throw new Error(errorValue?.message || "Error al actualizar negocio");
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
    // Eden Treaty returns errors with value being an object { code, message }
    const errorValue = error.value as { code?: string; message?: string } | undefined;
    throw new Error(errorValue?.message || "Error al subir logo");
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
    const cached = await offlineCache.get<Business>("business");
    if (cached) {
      console.log("[useBusiness] API failed, using cached business data");
      return { business: cached, fromCache: true, error: null };
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

  await offlineCache.set("business", business, 24 * 60 * 60 * 1000);

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
    retry: (failureCount) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return false;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
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
    retry: (failureCount) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return false;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBusiness,
    onSuccess: (business) => {
      // Store business IDs in session storage for ServicesProvider initialization
      if (business.id) {
        setStoredBusinessId(business.id);
      }
      if (business.businessUserId) {
        setStoredBusinessUserId(business.businessUserId);
      }
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
