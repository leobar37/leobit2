import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { distribucionCollection } from "~/lib/db/collections/distribucion.collection";
import { useBusiness } from "./use-business";
import { getStoredBusinessId } from "~/lib/session-storage";
import { generateId } from "~/lib/utils";
import { handleCollectionError } from "~/lib/db/error-handler";
import type { Distribucion } from "~/lib/db/schema";

interface UseDistribucionesParams {
  fecha?: string;
  vendedorId?: string;
  estado?: "activo" | "cerrado" | "en_ruta";
}

export function useDistribuciones(params?: UseDistribucionesParams) {
  const { data: business } = useBusiness();
  const storedBusinessId = getStoredBusinessId();
  const businessId = business?.id || storedBusinessId;

  return useLiveQuery(
    (q) => {
      let query = q.from({ d: distribucionCollection });

      if (businessId) {
        query = query.where(({ d }) => eq(d.businessId, businessId));
      }

      return query.orderBy(({ d }) => d.fecha, "desc");
    },
    [businessId]
  );
}

export function useDistribucion(id: string | null) {
  return useLiveQuery(
    (q) =>
      q
        .from({ d: distribucionCollection })
        .where(({ d }) => (id ? eq(d.id, id) : eq(d.id, ""))),
    [id]
  );
}

export function useMiDistribucion(fecha?: string) {
  const { data: business } = useBusiness();
  const storedBusinessId = getStoredBusinessId();
  const today = fecha || new Date().toISOString().split("T")[0];
  const businessId = business?.id || storedBusinessId;
  const vendedorId = business?.businessUserId;

  const result = useLiveQuery(
    (q) => {
      let query = q.from({ d: distribucionCollection });

      if (businessId) {
        query = query.where(({ d }) => eq(d.businessId, businessId));
      }

      return query
        .where(({ d }) => eq(d.vendedorId, vendedorId || ""))
        .orderBy(({ d }) => d.fecha, "desc")
        .limit(1);
    },
    [businessId, vendedorId, today]
  );

  // Return first item as single object (or undefined if empty)
  return {
    ...result,
    data: result.data?.[0],
  };
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

export function useCreateDistribucion() {
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (input: CreateDistribucionInput) => {
      try {
        const id = generateId();
        const today = input.fecha || new Date().toISOString().split("T")[0];

        await distribucionCollection.insert({
          id,
          businessId: business?.id || "",
          vendedorId: input.vendedorId,
          puntoVenta: input.puntoVenta,
          kilosAsignados: "0",
          kilosVendidos: "0",
          montoRecaudado: "0",
          fecha: today,
          estado: "activo",
          modo: input.modo || "estricto",
          confiarEnVendedor: input.confiarEnVendedor || false,
          pesoConfirmado: !input.confiarEnVendedor,
          syncStatus: "pending",
          createdAt: new Date(),
        });

        return id;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
  });
}

export function useUpdateDistribucion() {
  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: {
      id: string;
      puntoVenta?: string;
      kilosAsignados?: number;
      estado?: "activo" | "cerrado" | "en_ruta";
    }) => {
      try {
        await distribucionCollection.update(id, (draft) => {
          if (changes.puntoVenta !== undefined) draft.puntoVenta = changes.puntoVenta;
          if (changes.kilosAsignados !== undefined) {
            draft.kilosAsignados = changes.kilosAsignados.toString();
          }
          if (changes.estado !== undefined) draft.estado = changes.estado;
          draft.syncStatus = "pending";
        });
        return id;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
  });
}

export function useCloseDistribucion() {
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await distribucionCollection.update(id, (draft) => {
          draft.estado = "cerrado";
          draft.syncStatus = "pending";
        });
        return id;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
  });
}

export function useDeleteDistribucion() {
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await distribucionCollection.delete(id);
        return id;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
  });
}

// Re-export types for components
export type { Distribucion };
export type { CreateDistribucionInput };
