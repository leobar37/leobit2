/**
 * Visits Hook
 * Reactively fetch and mutate visits using local-first services
 * Offline-first: uses service layer for local data with automatic sync
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";
import { useVisitaService, useCustomerGroupService } from "~/lib/sync/service-provider";
import { toast } from "sonner";

export interface Visita {
  id: string;
  distribucionId: string;
  customerId: string;
  businessId: string;
  vendedorId: string;
  status: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string | null;
  saleId?: string | null;
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
}

export interface UpdateVisitaInput {
  status: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string;
  saleId?: string;
}

const QUERY_KEYS = {
  visitas: (distribucionId: string) => ["visitas", distribucionId] as const,
};

function toIsoString(date: Date): string {
  return date instanceof Date ? date.toISOString() : String(date);
}

/**
 * Get visitas by distribucion
 */
export function useVisitas(distribucionId: string | undefined) {
  const visitaService = useVisitaService();

  return useQuery({
    queryKey: QUERY_KEYS.visitas(distribucionId || ""),
    queryFn: async () => {
      if (!distribucionId) return [];
      const result = await visitaService.findByDistribucion(distribucionId);
      return result.map((v) => ({
        ...v,
        createdAt: toIsoString(v.createdAt),
        updatedAt: toIsoString(v.updatedAt),
      })) as unknown as Promise<Visita[]>;
    },
    enabled: !!distribucionId,
  });
}

/**
 * Update visita status (mark as purchased/not purchased, link sale)
 * Uses offline-aware mutation to check connectivity before API call
 */
export function useUpdateVisita() {
  const queryClient = useQueryClient();
  const visitaService = useVisitaService();

  return useMutation<Visita, Error, UpdateVisitaInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const result = await visitaService.update(id, input);
      return {
        ...result,
        createdAt: toIsoString(result.createdAt),
        updatedAt: toIsoString(result.updatedAt),
      } as unknown as Promise<Visita>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      toast.success("Visita actualizada correctamente");
    },
  });
}

/**
 * Create a new visita for a customer
 * Uses offline-aware mutation to check connectivity before API call
 */
export function useCreateVisita() {
  const queryClient = useQueryClient();
  const visitaService = useVisitaService();

  return useMutation<Visita, Error, CreateVisitaInput>({
    mutationFn: async (input) => {
      const result = await visitaService.create(input);
      return {
        ...result,
        createdAt: toIsoString(result.createdAt),
        updatedAt: toIsoString(result.updatedAt),
      } as unknown as Promise<Visita>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.visitas(variables.distribucionId) });
      toast.success("Visita creada correctamente");
    },
  });
}

/**
 * Create multiple visitas from a group of customers
 * First fetches group members, then creates visits for each
 * Uses offline-aware mutation to check connectivity before API call
 */
export function useCreateVisitasFromGroup() {
  const queryClient = useQueryClient();
  const visitaService = useVisitaService();
  const customerGroupService = useCustomerGroupService();

  return useMutation<Visita[], Error, { distribucionId: string; groupId: string }>({
    mutationFn: async ({ distribucionId, groupId }) => {
      const group = await customerGroupService.findById(groupId);
      
      if (!group?.members?.length) {
        throw new Error("El grupo no tiene miembros");
      }
      
      const customerIds = group.members.map(m => m.customerId);
      
      const result = await visitaService.createBulk(distribucionId, customerIds);
      return result.map((v) => ({
        ...v,
        createdAt: toIsoString(v.createdAt),
        updatedAt: toIsoString(v.updatedAt),
      })) as unknown as Promise<Visita[]>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.visitas(variables.distribucionId) });
      toast.success("Visitas creadas correctamente");
    },
  });
}
