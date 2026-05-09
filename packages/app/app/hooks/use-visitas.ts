/**
 * Visits Hook (API-based)
 * Reactively fetch and mutate visits using Eden Treaty API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
import { PERSISTED_REMOTE_QUERY_PREFIX, PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";
import { toast } from "sonner";

export interface VisitaGroup {
  id: string;
  name: string;
}

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
  waterStop?: {
    id: string;
    customerProfileId: string;
    waterRouteId: string | null;
    scheduledDate: string;
    expectedContainerQuantity: number;
    containersAtStart: number;
    deliveredContainerQuantity: number;
    collectedContainerQuantity: number;
    damagedContainerQuantity: number;
    lostContainerQuantity: number;
    status: string;
    notes: string | null;
  } | null;
  groups?: VisitaGroup[];
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
  customerAddress?: string | null;
  customerPhone?: string | null;
  waterStop?: Visita["waterStop"];
  groups?: VisitaGroup[];
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
          address: v.customerAddress ?? null,
          phone: v.customerPhone ?? null,
        }
      : undefined,
    waterStop: v.waterStop ?? null,
    groups: v.groups,
  };
}

/**
 * Get visitas by distribucion
 */
export function useVisitas(distribucionId: string | undefined) {
  return useQuery({
    queryKey: PERSISTED_REMOTE_QUERY_KEYS.visitas.byDistribucion(distribucionId || ""),
    queryFn: async () => {
      if (!distribucionId) return [];
      const response = await api.visitas.get({
        query: { distribucionId },
      });
      const data = extractData<BackendVisita[]>(response);
      return data.map(mapVisita);
    },
    enabled: !!distribucionId,
  });
}

export function useCompleteWaterDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: "entregado" | "no_atendido" | "reprogramado";
      delivered?: number;
      collected?: number;
      damaged?: number;
      lost?: number;
      notes?: string | null;
      variantId?: string;
      paymentMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta";
    }) => {
      const { id, ...body } = input;
      const response = await api.visitas({ id }).water.complete.post(body);
      return extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === PERSISTED_REMOTE_QUERY_PREFIX &&
          (query.queryKey[1] === "visitas" ||
            query.queryKey[1] === "sales" ||
            query.queryKey[1] === "variants" ||
            query.queryKey[1] === "variant-inventory"),
      });
      toast.success("Entrega actualizada correctamente");
    },
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
        saleId: input.saleId ?? undefined,
      });
      extractData(patchResponse);
      const getResponse = await api.visitas({ id }).get();
      const data = extractData<BackendVisita>(getResponse);
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
      });
      const created = extractData<BackendVisita>(postResponse);
      const getResponse = await api.visitas({ id: created.id }).get();
      const data = extractData<BackendVisita>(getResponse);
      return mapVisita(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.visitas.byDistribucion(variables.distribucionId),
      });
      queryClient.invalidateQueries({
        queryKey: PERSISTED_REMOTE_QUERY_KEYS.visitas.byDistribucion(variables.distribucionId),
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
      // Fetch group members from the backend
      const groupResponse = await api.groups({ id: groupId }).get();
      const group = extractData<{
        members?: Array<{ customerId: string }>;
        memberCount?: number;
      }>(groupResponse);

      // Support both members array and memberCount fallback
      const hasMembers = (group?.members?.length ?? 0) > 0 || (group?.memberCount ?? 0) > 0;
      if (!hasMembers) {
        throw new Error("El grupo no tiene miembros");
      }

      // If members array is not provided but memberCount > 0, we can't proceed
      // The backend bulk API needs customerIds
      if (!group?.members?.length) {
        throw new Error("No se pudieron cargar los miembros del grupo");
      }

      const customerIds = group.members.map((m) => m.customerId);

      const bulkResponse = await api.visitas.bulk.post({
        distribucionId,
        customerIds,
      });
      const result = extractData<{ visits: BackendVisita[]; count: number }>(bulkResponse);
      return result.visits.map((v) => mapVisita(v));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.visitas.byDistribucion(variables.distribucionId),
      });
      queryClient.invalidateQueries({
        queryKey: PERSISTED_REMOTE_QUERY_KEYS.visitas.byDistribucion(variables.distribucionId),
      });
      toast.success("Visitas creadas correctamente");
    },
  });
}
