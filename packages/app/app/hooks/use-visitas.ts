/**
 * Visits Hook (API-based)
 * Reactively fetch and mutate visits using Eden Treaty API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
import { toast } from "sonner";

export interface Visita {
  id: string;
  businessId: string;
  distribucionId: string;
  customerId: string;
  vendedorId: string;
  status: "pendiente" | "compro" | "no_compra";
  motivoNoCompra: string | null;
  saleId: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    dni: string | null;
    address: string | null;
    phone: string | null;
  };
}

export interface CreateVisitaInput {
  distribucionId: string;
  customerId: string;
  status?: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string | null;
  saleId?: string | null;
}

export interface UpdateVisitaInput {
  status: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string;
  saleId?: string | null;
}

interface BackendVisita {
  id: string;
  businessId: string;
  distribucionId: string;
  customerId: string;
  vendedorId: string;
  status: string;
  motivoNoCompra: string | null;
  saleId: string | null;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerDni?: string | null;
}

/**
 * Map backend visita with customer fields to frontend Visita shape
 */
function mapVisita(v: BackendVisita): Visita {
  return {
    id: v.id,
    businessId: v.businessId,
    distribucionId: v.distribucionId,
    customerId: v.customerId,
    vendedorId: v.vendedorId,
    status: v.status as Visita["status"],
    motivoNoCompra: v.motivoNoCompra,
    saleId: v.saleId,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    customer: v.customerName
      ? {
          id: v.customerId,
          name: v.customerName,
          dni: v.customerDni ?? null,
          address: null,
          phone: null,
        }
      : undefined,
  };
}

/**
 * Get visitas by distribucion
 */
export function useVisitas(distribucionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.visitas.byDistribucion(distribucionId || ""),
    queryFn: async () => {
      if (!distribucionId) return [];
      const response = await api.visitas.get({
        query: { distribucionId },
      });
      const data = extractData(response) as BackendVisita[];
      return data.map(mapVisita);
    },
    enabled: !!distribucionId,
  });
}

/**
 * Update visita status (mark as purchased/not purchased, link sale)
 */
export function useUpdateVisita() {
  const queryClient = useQueryClient();

  return useMutation<Visita, Error, UpdateVisitaInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const patchResponse = await api.visitas({ id }).patch({
        status: input.status,
        motivoNoCompra: input.motivoNoCompra,
        saleId: input.saleId,
      } as any);
      extractData(patchResponse);
      const getResponse = await api.visitas({ id }).get();
      const data = extractData(getResponse) as BackendVisita;
      return mapVisita(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      toast.success("Visita actualizada correctamente");
    },
  });
}

/**
 * Create a new visita for a customer
 */
export function useCreateVisita() {
  const queryClient = useQueryClient();

  return useMutation<Visita, Error, CreateVisitaInput>({
    mutationFn: async (input) => {
      const postResponse = await api.visitas.post({
        distribucionId: input.distribucionId,
        customerId: input.customerId,
      } as any);
      const created = extractData(postResponse) as BackendVisita;
      const getResponse = await api.visitas({ id: created.id }).get();
      const data = extractData(getResponse) as BackendVisita;
      return mapVisita(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.visitas.byDistribucion(variables.distribucionId),
      });
      toast.success("Visita creada correctamente");
    },
  });
}

/**
 * Create multiple visitas from a group of customers
 */
export function useCreateVisitasFromGroup() {
  const queryClient = useQueryClient();

  return useMutation<Visita[], Error, { distribucionId: string; groupId: string }>({
    mutationFn: async ({ distribucionId, groupId }) => {
      const groupResponse = await api.groups({ id: groupId }).get();
      const group = extractData(groupResponse) as {
        members: Array<{ customerId: string }>;
      };

      if (!group?.members?.length) {
        throw new Error("El grupo no tiene miembros");
      }

      const customerIds = group.members.map((m) => m.customerId);

      const bulkResponse = await api.visitas.bulk.post({
        distribucionId,
        customerIds,
      } as any);
      const result = extractData(bulkResponse) as { visits: BackendVisita[]; count: number };
      return result.visits.map((v) => mapVisita(v));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.visitas.byDistribucion(variables.distribucionId),
      });
      toast.success("Visitas creadas correctamente");
    },
  });
}
