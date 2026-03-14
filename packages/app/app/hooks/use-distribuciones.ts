/**
 * Distribuciones Hook
 * Reactively fetch and mutate distribuciones using PGlite + ElectricSQL
 * 
 * Migration from TanStack DB to PGlite
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, and, gte, desc, like, or } from "drizzle-orm";
import { getDatabase } from "~/engine";
import {
  distribuciones,
  distribucionItems,
  type Distribucion,
  type DistribucionItem,
  DistribucionStatus,
} from "~/engine/schema";
import { api, extractData } from "~/lib/api-client";
import { useBusiness } from "./use-business";
import { getStoredBusinessId } from "~/lib/session-storage";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";

const DISTRIBUCIONES_QUERY_KEY = "distribuciones";

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
      if (!businessId) return [];
      
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
      
      return db
        .select()
        .from(distribuciones)
        .where(and(...conditions))
        .orderBy(desc(distribuciones.fecha), desc(distribuciones.createdAt));
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

interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  fecha?: string;
  modo?: "estricto" | "acumulativo" | "libre";
  confiarEnVendedor?: boolean;
  items?: Array<{
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }>;
}

/**
 * Create a new distribucion
 * Requires internet connection
 */
export function useCreateDistribucion() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async (input: CreateDistribucionInput) => {
      const today = input.fecha || new Date().toISOString().split("T")[0];
      const payload = {
        vendedorId: input.vendedorId,
        puntoVenta: input.puntoVenta,
        fecha: today,
        modo: input.modo || "estricto",
        confiarEnVendedor: input.confiarEnVendedor || false,
        items: input.items || [],
      };
      const result = await extractData(api.distribuciones.post(payload));
      return result;
    },
    offlineMessage: "Se requiere conexión a internet para crear una distribución",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

/**
 * Close a distribucion
 * Requires internet connection
 */
export function useCloseDistribucion() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async (id: string) => {
      const result = await extractData(api.distribuciones({ id }).close.post());
      return result;
    },
    offlineMessage: "Se requiere conexión a internet para cerrar una distribución",
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, id],
      });
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

/**
 * Update distribucion items
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
        cantidadVendida: number;
      }>;
    }) => {
      const result = await extractData(
        api.distribuciones({ id }).items.put({ items })
      );
      return result;
    },
    offlineMessage: "Se requiere conexión a internet para actualizar los items de distribución",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, variables.id],
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
      const result = await extractData(api.distribuciones({ id }).put(changes));
      return result;
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

  return useOfflineAwareMutation({
    mutationFn: async (id: string) => {
      const result = await extractData(api.distribuciones({ id }).delete());
      return result;
    },
    offlineMessage: "Se requiere conexión a internet para eliminar la distribución",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

export type { Distribucion, DistribucionItem };
export type { CreateDistribucionInput };
