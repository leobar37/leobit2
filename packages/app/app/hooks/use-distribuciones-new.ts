/**
 * Distribuciones Hook
 * Reactively fetch and mutate distribuciones using PGlite + ElectricSQL
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, and, gte, desc } from "drizzle-orm";
import { getDatabase } from "~/engine";
import {
  distribuciones,
  distribucionItems,
  type Distribucion,
  type DistribucionItem,
  DistribucionStatus,
} from "~/engine/schema";
import { pushWrite } from "~/engine/write-engine";

const DISTRIBUCIONES_QUERY_KEY = "distribuciones";

/**
 * Get all distribuciones for a business
 */
export function useDistribuciones(businessId: string) {
  return useQuery({
    queryKey: [DISTRIBUCIONES_QUERY_KEY, businessId],
    queryFn: async () => {
      const { db } = getDatabase();
      return db
        .select()
        .from(distribuciones)
        .where(eq(distribuciones.businessId, businessId))
        .orderBy(desc(distribuciones.createdAt));
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
 * Get active distribucion for a seller
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

interface DistribucionItemInput {
  variantId: string;
  cantidadAsignada: number;
  unidad?: string;
}

interface CreateDistribucionInput {
  businessId: string;
  vendedorId: string;
  puntoVenta: string;
  kilosAsignados: number;
  fecha: string;
  modo?: string;
  confiarEnVendedor?: boolean;
  items: DistribucionItemInput[];
}

/**
 * Create a new distribucion
 */
export function useCreateDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDistribucionInput) => {
      const result = await pushWrite("/api/distribuciones", "POST", input);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY],
      });
    },
  });
}

/**
 * Close a distribucion
 */
export function useCloseDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await pushWrite(
        `/api/distribuciones/${id}/close`,
        "POST",
        null
      );
      return result;
    },
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
 * Update distribucion items (seller's sales update)
 */
export function useUpdateDistribucionItems() {
  const queryClient = useQueryClient();

  return useMutation({
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
      const result = await pushWrite(
        `/api/distribuciones/${id}/items`,
        "PUT",
        { items }
      );
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DISTRIBUCIONES_QUERY_KEY, variables.id],
      });
    },
  });
}
