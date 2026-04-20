/**
 * Visits Hook
 * Reactively fetch and mutate visits using local-first services
 * Offline-first: uses service layer for local data with automatic sync
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisitaService, useCustomerGroupService } from "~/lib/sync/service-provider";
import { toast } from "sonner";
import type { CreateVisitaInput, UpdateVisitaInput } from "~/lib/services/visita-service";

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
      // Call parent's update (returns void)
      await visitaService.update(id, {
        status: input.status,
        motivoNoCompra: input.motivoNoCompra,
        saleId: input.saleId,
      });
      // Fetch enriched result using findById
      const result = await visitaService.findById(id);
      if (!result) {
        throw new Error("Visita no encontrada después de actualizar");
      }
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
      // Create using parent's method with vendedorId from context
      // The service sets vendedorId internally from businessUserId
      // We need to call create with proper input format
      const created = await (visitaService as any).create({
        distribucionId: input.distribucionId,
        customerId: input.customerId,
        vendedorId: "", // Will be set by the service
        status: input.status ?? "pendiente",
        motivoNoCompra: input.motivoNoCompra,
        saleId: input.saleId,
      });
      // Fetch enriched result using findById
      const result = await visitaService.findById(created.id);
      if (!result) {
        throw new Error("Visita no encontrada después de crear");
      }
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
