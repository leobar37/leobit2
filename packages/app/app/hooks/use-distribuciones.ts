/**
 * Distribuciones Hook
 * Reactively fetch and mutate distribuciones using PGlite + ElectricSQL
 * 
 * Migration from TanStack DB to PGlite
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eq, and, gte, desc, like, or } from "drizzle-orm";
import { getDatabase } from "@avileo/drizzle-sync/client";
import {
  distribuciones,
  distribucionItems,
  DistribucionStatus,
  type Distribucion,
  type DistribucionItem,
} from "@avileo/shared";
import { useBusiness } from "./use-business";
import { getStoredBusinessId } from "~/lib/session-storage";
import { useDistribucionService } from "~/lib/sync/engine-provider";
import type { CreateDistribucionInput, CreateDistribucionItemInput } from "~/lib/services/distribucion-service";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";
import { useManualSync } from "./use-manual-sync";
import { api, extractData } from "~/lib/api-client";

const DISTRIBUCIONES_QUERY_KEY = "distribuciones";

/**
 * Helper to extract error message from API response
 * Backend returns errors in format: { success: false, error: { code: "...", message: "..." } }
 * or { success: false, error: "string message" }
 */
function handleApiError(response: { data?: { success?: boolean; error?: string | { code?: string; message?: string } } | null; error?: { value?: unknown } | null }): never {
  // Network/fetch error
  if (response.error) {
    throw new Error(String(response.error.value));
  }

  // Business logic error from backend
  if (response.data?.error) {
    const errorData = response.data.error;
    if (typeof errorData === 'string') {
      throw new Error(errorData);
    }
    if (errorData && typeof errorData === 'object' && 'message' in errorData) {
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

  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, businessId, params],
    queryFn: async () => {
      console.log("[useDistribuciones] Fetching from PGlite...", { businessId, params });
      if (!businessId) {
        console.log("[useDistribuciones] No businessId, returning empty");
        return [];
      }
      
      const { db } = getDatabase();
      
      let conditions = [eq(distribuciones.businessId, businessId)];
      
      if (params?.fecha) {
        conditions.push(eq(distribuciones.fecha, params.fecha));
      }
      
      if (params?.vendedorId) {
        conditions.push(eq(distribuciones.vendedorId, params.vendedorId));
      }
      
      if (params?.estado) {
        conditions.push(eq(distribuciones.estado, params.estado));
      }
      
      const result = await db
        .select()
        .from(distribuciones)
        .where(and(...conditions))
        .orderBy(desc(distribuciones.fecha), desc(distribuciones.createdAt));
      
      console.log("[useDistribuciones] Found", result.length, "distribuciones");
      return result;
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
  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, "seller", vendedorId],
    queryFn: async () => {
      const { db } = getDatabase();
      return db
        .select()
        .from(distribuciones)
        .where(
          and(
            eq(distribuciones.businessId, businessId),
            eq(distribuciones.vendedorId, vendedorId)
          )
        )
        .orderBy(desc(distribuciones.createdAt));
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
  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, "active", vendedorId],
    queryFn: async () => {
      const { db } = getDatabase();
      const result = await db
        .select()
        .from(distribuciones)
        .where(
          and(
            eq(distribuciones.businessId, businessId),
            eq(distribuciones.vendedorId, vendedorId),
            eq(distribuciones.estado, DistribucionStatus.ACTIVO)
          )
        )
        .orderBy(desc(distribuciones.createdAt))
        .limit(1);
      return result[0] || null;
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
  const today = fecha || new Date().toISOString().split("T")[0];
  const businessId = business?.id || storedBusinessId;
  const vendedorId = business?.businessUserId;

  const queryResult = useActiveDistribucion(businessId || "", vendedorId || "");
  
  return {
    ...queryResult,
    data: queryResult.data,
  };
}

/**
 * Get a single distribucion with items
 */
export function useDistribucion(id: string | null) {
  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { db } = getDatabase();

      const [distResult, itemsResult] = await Promise.all([
        db
          .select()
          .from(distribuciones)
          .where(eq(distribuciones.id, id))
          .limit(1),
        db
          .select()
          .from(distribucionItems)
          .where(eq(distribucionItems.distribucionId, id)),
      ]);

      if (!distResult[0]) return null;

      return {
        ...distResult[0],
        items: itemsResult,
      };
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
      // Force pull immediately to sync new distribucion from server to PGlite
      await pullNow();

      console.log("[useCreateDistribucion] onSuccess - invalidating queries");
      // Invalidate both distribuciones and visitas since creating a distribucion
      // automatically creates visitas on the backend
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
      // Use predicate to invalidate all visit queries regardless of distribucionId
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
      // Force pull immediately to sync closure from server to PGlite
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
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [DISTRIBUCIONES_QUERY_KEY] });

      // Snapshot previous value
      const previousDistribuciones = queryClient.getQueryData([DISTRIBUCIONES_QUERY_KEY]);

      // Optimistically update to the new value
      queryClient.setQueryData([DISTRIBUCIONES_QUERY_KEY], (old: any) => {
        if (!old) return old;
        return old.filter((d: any) => d.id !== id);
      });

      // Return context with the snapshotted value
      return { previousDistribuciones };
    },
    onError: (err, id, context: any) => {
      // Rollback to previous value on error
      if (context?.previousDistribuciones) {
        queryClient.setQueryData([DISTRIBUCIONES_QUERY_KEY], context.previousDistribuciones);
      }
      console.error("[Distribuciones] useDeleteDistribucion - error:", err);
    },
    onSuccess: async () => {
      // Force pull immediately to sync deletion from server to PGlite
      await pullNow();

      // Invalidate both distribuciones and visitas since deleting a distribucion
      // also deletes associated visitas on the backend
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
      // Use predicate to invalidate all visit queries regardless of distribucionId
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "visitas",
      });
    },
  });
}

/**
 * Add an item to a distribucion
 */
export function useAddDistribucionItem() {
  const distribucionService = useDistribucionService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      distribucionId,
      item,
    }: {
      distribucionId: string;
      item: CreateDistribucionItemInput;
    }) => {
      return distribucionService.addItem(distribucionId, item);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, variables.distribucionId],
      });
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

/**
 * Update a distribucion item
 */
export function useUpdateDistribucionItem() {
  const distribucionService = useDistribucionService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      distribucionId,
      itemId,
      data,
    }: {
      distribucionId: string;
      itemId: string;
      data: {
        cantidadAsignada?: number;
        cantidadVendida?: number;
      };
    }) => {
      return distribucionService.updateItem(distribucionId, itemId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, variables.distribucionId],
      });
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

/**
 * Remove an item from a distribucion
 */
export function useRemoveDistribucionItem() {
  const distribucionService = useDistribucionService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      distribucionId,
      itemId,
    }: {
      distribucionId: string;
      itemId: string;
    }) => {
      return distribucionService.removeItem(distribucionId, itemId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, variables.distribucionId],
      });
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

export type { Distribucion, DistribucionItem };
export type { CreateDistribucionInput, CreateDistribucionItemInput };
