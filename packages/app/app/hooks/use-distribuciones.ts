/**
 * Distribuciones Hook
 * Reactively fetch and mutate distribuciones using the sync framework.
 *
 * Reads: offline via framework service -> PGlite
 * Writes: online-only via API
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEngineService } from "@avileo/drizzle-sync/react";
import { DistribucionService } from "~/lib/services/distribucion-service";
import type { CreateDistribucionInput, CreateDistribucionItemInput } from "~/lib/services/distribucion-service";
import { useBusiness } from "./use-business";
import { getStoredBusinessId } from "~/lib/session-storage";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";
import { useManualSync } from "./use-manual-sync";
import { api } from "~/lib/api-client";

const DISTRIBUCIONES_QUERY_KEY = "distribuciones";

/**
 * Helper to extract error message from API response
 */
function handleApiError(response: { data?: { success?: boolean; error?: string | { code?: string; message?: string } } | null; error?: { value?: unknown } | null }): never {
  if (response.error) {
    throw new Error(String(response.error.value));
  }

  if (response.data?.error) {
    const errorData = response.data.error;
    if (typeof errorData === "string") {
      throw new Error(errorData);
    }
    if (errorData && typeof errorData === "object" && "message" in errorData) {
      throw new Error(String(errorData.message));
    }
  }

  throw new Error("Error desconocido");
}

/**
 * Get all distribuciones for a business (with optional filters)
 */
export function useDistribuciones(params?: {
  fecha?: string;
  vendedorId?: string;
  estado?: "activo" | "cerrado" | "en_ruta";
}) {
  const { data: business } = useBusiness();
  const storedBusinessId = getStoredBusinessId();
  const businessId = business?.id || storedBusinessId;
  const distribucionService = useEngineService<DistribucionService>("distribuciones");

  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, businessId, params],
    queryFn: async () => {
      if (!businessId) return [];
      return distribucionService.findByBusiness({
        ...params,
        vendedorId: params?.vendedorId,
      });
    },
    enabled: !!businessId,
  });
}

/**
 * Get distribuciones for a specific seller
 */
export function useSellerDistribuciones(
  businessId: string,
  vendedorId: string
) {
  const distribucionService = useEngineService<DistribucionService>("distribuciones");

  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, "seller", vendedorId],
    queryFn: async () => {
      return distribucionService.findByBusiness({
        vendedorId,
      });
    },
    enabled: !!businessId && !!vendedorId,
  });
}

/**
 * Get active distribucion for a seller (used by seller view)
 */
export function useActiveDistribucion(
  businessId: string,
  vendedorId: string
) {
  const distribucionService = useEngineService<DistribucionService>("distribuciones");

  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, "active", vendedorId],
    queryFn: async () => {
      return distribucionService.findActiveBySeller(vendedorId);
    },
    enabled: !!businessId && !!vendedorId,
  });
}

/**
 * Get distribucion for the current seller (mi distribución)
 */
export function useMiDistribucion(fecha?: string) {
  const { data: business } = useBusiness();
  const storedBusinessId = getStoredBusinessId();
  const businessId = business?.id || storedBusinessId;
  const vendedorId = business?.businessUserId;
  const distribucionService = useEngineService<DistribucionService>("distribuciones");

  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, "mi-distribucion", vendedorId, fecha],
    queryFn: async () => {
      if (!vendedorId) return null;
      return distribucionService.findActiveBySeller(vendedorId, fecha);
    },
    enabled: !!businessId && !!vendedorId,
  });
}

/**
 * Get a single distribucion with items
 */
export function useDistribucion(id: string | null) {
  const distribucionService = useEngineService<DistribucionService>("distribuciones");

  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      return distribucionService.findByIdWithItems(id);
    },
    enabled: !!id,
  });
}

/**
 * Input type for creating a distribucion via API
 */
export interface CreateDistribucionApiInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  notaCreacion?: string;
  fecha?: string;
  modo?: "estricto" | "acumulativo" | "libre";
  groupId?: string;
  items: Array<{
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }>;
}

/**
 * Create a new distribucion
 * ONLINE-ONLY: Requires internet connection
 */
export function useCreateDistribucion() {
  const queryClient = useQueryClient();
  const { pullNow } = useManualSync();

  return useOfflineAwareMutation({
    mutationFn: async (input: CreateDistribucionApiInput) => {
      console.log("[useCreateDistribucion] Creating distribucion via API...", input);
      const response = await (api.distribuciones as any).post(input);
      console.log("[useCreateDistribucion] API response:", response);
      if (!response.data?.success || response.error) {
        handleApiError(response);
      }
      return response.data.data;
    },
    offlineMessage: "Se requiere conexión a internet para crear una distribución",
    onSuccess: async () => {
      console.log("[useCreateDistribucion] onSuccess - pulling changes immediately");
      await pullNow();

      console.log("[useCreateDistribucion] onSuccess - invalidating queries");
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "visitas",
      });
    },
  });
}

export interface CloseDistribucionInput {
  id: string;
  notaCierre?: string;
}

/**
 * Close a distribucion with cierre data
 * Requires internet connection
 */
export function useCloseDistribucion() {
  const queryClient = useQueryClient();
  const { pullNow } = useManualSync();

  return useOfflineAwareMutation({
    mutationFn: async (input: CloseDistribucionInput) => {
      console.log("[Distribuciones] useCloseDistribucion - calling API for id:", input.id);
      const response = await (api.distribuciones({ id: input.id }).close as any).patch({
        notaCierre: input.notaCierre,
      });
      console.log("[Distribuciones] useCloseDistribucion - API response:", response);
      if (!response.data?.success || response.error) {
        handleApiError(response);
      }
      return response.data.data;
    },
    offlineMessage: "Se requiere conexión a internet para cerrar una distribución",
    onSuccess: async (_, input) => {
      await pullNow();

      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, input.id],
      });
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

/**
 * Update distribucion items (replace all items)
 * Requires internet connection
 */
export function useUpdateDistribucionItems() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async ({
      id,
      items,
    }: {
      id: string;
      items: Array<{
        variantId: string;
        cantidadAsignada: number;
        unidad: string;
      }>;
    }) => {
      const response = await (api.distribuciones({ id }).items as any).put({ items });
      if (!response.data?.success || response.error) {
        handleApiError(response);
      }
      return response.data.data;
    },
    offlineMessage: "Se requiere conexión a internet para actualizar los items de distribución",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

/**
 * Update distribucion
 * Requires internet connection
 */
export function useUpdateDistribucion() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async (data: { id: string; [key: string]: unknown }) => {
      const { id, ...changes } = data;
      const response = await (api.distribuciones({ id }) as any).put(changes);
      if (!response.data?.success || response.error) {
        handleApiError(response);
      }
      return response.data.data;
    },
    offlineMessage: "Se requiere conexión a internet para actualizar la distribución",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

/**
 * Delete a distribucion
 * Requires internet connection
 */
export function useDeleteDistribucion() {
  const queryClient = useQueryClient();
  const { pullNow } = useManualSync();

  return useOfflineAwareMutation({
    mutationFn: async (id: string) => {
      console.log("[Distribuciones] useDeleteDistribucion - calling API for id:", id);
      const response = await api.distribuciones({ id }).delete();
      if (response.error) {
        handleApiError(response);
      }
      console.log("[Distribuciones] useDeleteDistribucion - deleted successfully");
    },
    offlineMessage: "Se requiere conexión a internet para eliminar la distribución",
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [DISTRIBUCIONES_QUERY_KEY] });

      const previousDistribuciones = queryClient.getQueryData([DISTRIBUCIONES_QUERY_KEY]);

      queryClient.setQueryData([DISTRIBUCIONES_QUERY_KEY], (old: any) => {
        if (!old) return old;
        return old.filter((d: any) => d.id !== id);
      });

      return { previousDistribuciones };
    },
    onError: (err, id, context: any) => {
      if (context?.previousDistribuciones) {
        queryClient.setQueryData([DISTRIBUCIONES_QUERY_KEY], context.previousDistribuciones);
      }
      console.error("[Distribuciones] useDeleteDistribucion - error:", err);
    },
    onSuccess: async () => {
      await pullNow();

      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "visitas",
      });
    },
  });
}

export type { Distribucion, DistribucionItem, DistribucionWithItems } from "~/lib/services/distribucion-service";
export type { CreateDistribucionInput, CreateDistribucionItemInput };
