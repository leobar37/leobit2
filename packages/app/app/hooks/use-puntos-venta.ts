/**
 * Puntos de Venta Hook
 * React Query hooks for puntos de venta
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

export type PuntoVenta = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type?: "carro" | "local" | "mercado" | "ruta" | "otro";
  isActive: boolean;
  sortOrder: number;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePuntoVentaInput = {
  name: string;
  code?: string;
  description?: string;
  type?: "carro" | "local" | "mercado" | "ruta" | "otro";
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdatePuntoVentaInput = Partial<CreatePuntoVentaInput>;

const QUERY_KEYS = {
  puntosVenta: PERSISTED_REMOTE_QUERY_KEYS.puntosVenta,
  puntoVenta: PERSISTED_REMOTE_QUERY_KEYS.puntoVenta,
  puntosVentaActive: PERSISTED_REMOTE_QUERY_KEYS.puntosVentaActive,
} as const;

/**
 * Get all puntos de venta
 */
export function usePuntosVenta() {
  return useQuery({
    queryKey: QUERY_KEYS.puntosVenta,
    queryFn: async () => {
      const response = await api["puntos-venta"].get();
      return extractData(response, "Failed to load puntos de venta") as PuntoVenta[];
    },
  });
}

/**
 * Get active puntos de venta only
 */
export function usePuntosVentaActivos() {
  return useQuery({
    queryKey: QUERY_KEYS.puntosVentaActive,
    queryFn: async () => {
      const response = await api["puntos-venta"].active.get();
      return extractData(response, "Failed to load puntos de venta activos") as PuntoVenta[];
    },
  });
}

/**
 * Get a single punto de venta by ID
 */
export function usePuntoVenta(id: string | null) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.puntoVenta(id) : ["puntos-venta", "detail"],
    queryFn: async () => {
      if (!id) return null;
      const response = await api["puntos-venta"]({ id }).get();
      return extractData(response, "Failed to load punto de venta") as PuntoVenta;
    },
    enabled: !!id,
  });
}

/**
 * Create a new punto de venta
 */
export function useCreatePuntoVenta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePuntoVentaInput) => {
      const response = await api["puntos-venta"].post(input as any);
      return extractData(response, "Failed to create punto de venta") as PuntoVenta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.puntosVenta });
    },
  });
}

/**
 * Update an existing punto de venta
 */
export function useUpdatePuntoVenta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePuntoVentaInput;
    }) => {
      const response = await api["puntos-venta"]({ id }).put(input as any);
      return extractData(response, "Failed to update punto de venta") as PuntoVenta;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.puntoVenta(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.puntosVenta });
    },
  });
}

/**
 * Toggle active status of a punto de venta
 */
export function useTogglePuntoVenta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api["puntos-venta"]({ id })["toggle"].patch();
      return extractData(response, "Failed to toggle punto de venta") as PuntoVenta;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.puntoVenta(id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.puntosVenta });
    },
  });
}

/**
 * Delete a punto de venta
 */
export function useDeletePuntoVenta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api["puntos-venta"]({ id }).delete();
      if (!response.data?.success) {
        throw new Error("Failed to delete punto de venta");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.puntosVenta });
    },
  });
}
