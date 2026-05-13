import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Business, CreateBusinessInput, UpdateBusinessInput } from "@avileo/shared";
import { api } from "~/lib/api-client";
import { setStoredBusinessId, setStoredBusinessUserId } from "~/lib/session-storage";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

async function fetchBusiness(): Promise<Business> {
  const { data, error } = await api.businesses.me.get();

  if (error) {
    const errorValue = error.value as { code?: string; message?: string } | undefined;
    throw new Error(errorValue?.message || "Error al cargar el negocio");
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to fetch business");
  }

  return data.data as unknown as Business;
}

async function createBusiness(input: CreateBusinessInput): Promise<Business> {
  const { data, error } = await api.businesses.post(input);

  if (error) {
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
    const errorValue = error.value as { code?: string; message?: string } | undefined;
    throw new Error(errorValue?.message || "Error al actualizar negocio");
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to update business");
  }

  return data.data as unknown as Business;
}



export function useBusiness() {
  return useQuery<Business>({
    queryKey: PERSISTED_REMOTE_QUERY_KEYS.business,
    queryFn: async () => {
      const business = await fetchBusiness();

      // Side effect: store IDs for ServicesProvider bootstrap
      if (business.id) {
        setStoredBusinessId(business.id);
      }
      if (business.businessUserId) {
        setStoredBusinessUserId(business.businessUserId);
      }

      return business;
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
      if (business.id) {
        setStoredBusinessId(business.id);
      }
      if (business.businessUserId) {
        setStoredBusinessUserId(business.businessUserId);
      }
      queryClient.setQueryData(PERSISTED_REMOTE_QUERY_KEYS.business, business);
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.business });
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBusinessInput }) =>
      updateBusiness(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.business });
    },
  });
}


