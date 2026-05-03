/**
 * Distribuciones Hook (API-based)
 * Reactively fetch and mutate distribuciones using Eden Treaty API
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
import { useBusiness } from "./use-business";
import { getStoredBusinessId } from "~/lib/session-storage";
import { distribucionItemTransformer } from "@avileo/shared";

export interface Distribucion {
  id: string;
  businessId: string;
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId: string | null;
  montoRecaudado: string;
  notaCreacion: string | null;
  notaCierre: string | null;
  fecha: string;
  estado: string;
  modo: string;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DistribucionItem {
  id: string;
  distribucionId: string;
  variantId: string;
  cantidadAsignada: string;
  cantidadVendida: string | null;
  unidad: string;
}

export interface DistribucionItemEnriched extends DistribucionItem {
  productName?: string;
  variantName?: string;
}

export type DistribucionWithItems = Distribucion & { items: DistribucionItemEnriched[] };

export interface CreateDistribucionItemInput {
  variantId: string;
  cantidadAsignada: number;
  unidad: string;
}

export interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  notaCreacion?: string;
  fecha?: string;
  groupId?: string;
  items?: CreateDistribucionItemInput[];
}

export interface CreateDistribucionApiInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  notaCreacion?: string;
  fecha?: string;
  groupId?: string;
  items: Array<{
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }>;
}

export interface CloseDistribucionInput {
  id: string;
  notaCierre?: string;
}

interface BackendDistribucionItem {
  id: string;
  distribucionId: string;
  variantId: string;
  cantidadAsignada: string;
  cantidadVendida: string | null;
  unidad: string;
  variant?: {
    name?: string;
    product?: {
      name?: string;
    };
  };
}

function mapDistribucionWithItems(
  d: Distribucion & { items?: BackendDistribucionItem[] }
): DistribucionWithItems {
  return {
    ...d,
    items:
      d.items?.map((item) => ({
        id: item.id,
        distribucionId: item.distribucionId,
        variantId: item.variantId,
        ...(distribucionItemTransformer.toForm(item) as Pick<
          DistribucionItem,
          "cantidadAsignada" | "cantidadVendida"
        >),
        unidad: item.unidad,
        variantName: item.variant?.name,
        productName: item.variant?.product?.name,
      })) ?? [],
  };
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
    queryKey: [queryKeys.distribuciones.all, businessId, params],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await api.distribuciones.get({
        query: {
          fecha: params?.fecha,
          vendedorId: params?.vendedorId,
          estado: params?.estado,
        },
      });
      return extractData<Distribucion[]>(response);
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
    queryKey: queryKeys.distribuciones.seller(vendedorId),
    queryFn: async () => {
      const response = await api.distribuciones.get({
        query: { vendedorId },
      });
      return extractData<Distribucion[]>(response);
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
    queryKey: queryKeys.distribuciones.active(vendedorId),
    queryFn: async () => {
      const response = await api.distribuciones.get({
        query: { vendedorId, estado: "activo" },
      });
      const data = extractData<Distribucion[]>(response);
      return data[0] || null;
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

  return useQuery({
    queryKey: queryKeys.distribuciones.mine(vendedorId || "", fecha),
    queryFn: async () => {
      if (!vendedorId) return null;
      const response = await api.distribuciones.mine.get({
        query: fecha ? { fecha } : undefined,
      });
      const data = extractData<Distribucion & {
        items?: BackendDistribucionItem[];
      }>(response);
      return data ? mapDistribucionWithItems(data) : null;
    },
    enabled: !!businessId && !!vendedorId,
  });
}

/**
 * Get a single distribucion with items
 */
export function useDistribucion(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.distribuciones.detail(id) : ["distribuciones", "detail"],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.distribuciones({ id }).get();
      const data = extractData<Distribucion & {
        items?: BackendDistribucionItem[];
      }>(response);
      return mapDistribucionWithItems(data);
    },
    enabled: !!id,
  });
}

/**
 * Create a new distribucion
 */
export function useCreateDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDistribucionApiInput) => {
      const response = await api.distribuciones.post(input);
      return extractData<Distribucion>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distribuciones.all,
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "visitas",
      });
    },
  });
}

/**
 * Close a distribucion with cierre data
 */
export function useCloseDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CloseDistribucionInput) => {
      const response = await api.distribuciones({ id: input.id }).close.patch({
        notaCierre: input.notaCierre,
      });
      return extractData<Distribucion>(response);
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distribuciones.detail(input.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.distribuciones.all,
      });
    },
  });
}

/**
 * Update distribucion items (replace all items)
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
        cantidadAsignada: number;
        unidad: string;
      }>;
    }) => {
      const response = await api.distribuciones({ id }).items.put({ items });
      return extractData<Distribucion>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distribuciones.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.distribuciones.all,
      });
    },
  });
}

/**
 * Update distribucion
 */
export function useUpdateDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; puntoVenta?: string; estado?: string }) => {
      const { id, ...changes } = data;
      const response = await api.distribuciones({ id }).put(changes);
      return extractData<Distribucion>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distribuciones.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.distribuciones.all,
      });
    },
  });
}

/**
 * Delete a distribucion
 */
export function useDeleteDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.distribuciones({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.distribuciones.all });

      const previousDistribuciones = queryClient.getQueryData(
        queryKeys.distribuciones.all
      );

      queryClient.setQueryData(queryKeys.distribuciones.all, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.filter((d: { id?: string }) => d.id !== id);
      });

      return { previousDistribuciones };
    },
    onError: (err, id, context) => {
      const ctx = context as { previousDistribuciones?: unknown } | undefined;
      if (ctx?.previousDistribuciones) {
        queryClient.setQueryData(
          queryKeys.distribuciones.all,
          ctx.previousDistribuciones
        );
      }
      console.error("[Distribuciones] useDeleteDistribucion - error:", err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.distribuciones.all,
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "visitas",
      });
    },
  });
}
