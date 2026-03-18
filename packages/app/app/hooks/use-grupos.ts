/**
 * Customer Groups Hook
 * Online-only: All operations require internet connection
 * Uses REST API directly instead of local sync
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";
import { toast } from "sonner";

export interface GroupMember {
  customerId: string;
  customerName: string;
  addedAt: Date;
}

export interface CustomerGroup {
  id: string;
  name: string;
  syncStatus: string;
  syncAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  members?: GroupMember[];
}

const QUERY_KEYS = {
  groups: ["customer-groups"] as const,
  group: (id: string) => ["customer-groups", id] as const,
  groupsWithDetails: ["customer-groups-with-details"] as const,
};

/**
 * Get all customer groups for the current business (online-only)
 */
export function useCustomerGroups() {
  return useQuery({
    queryKey: QUERY_KEYS.groups,
    queryFn: async () => {
      const response = await api.groups.get();
      return extractData<CustomerGroup[]>(response, "Error al cargar grupos");
    },
  });
}

/**
 * Get a single customer group by ID with members (online-only)
 */
export function useCustomerGroup(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.group(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const response = await api.groups({ id }).get();
      return extractData<CustomerGroup | null>(response, "Error al cargar grupo");
    },
    enabled: !!id,
  });
}

/**
 * Create a new customer group (online-only)
 */
export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async (input: { name: string }) => {
      const response = await api.groups.post({ name: input.name });
      return extractData<CustomerGroup>(response, "Error al crear grupo");
    },
    offlineMessage: "Se requiere conexión a internet para crear grupos",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      toast.success("Grupo creado correctamente");
    },
  });
}

/**
 * Update an existing customer group (online-only)
 */
export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const response = await api.groups({ id: input.id }).put({ name: input.name });
      return extractData<CustomerGroup>(response, "Error al actualizar grupo");
    },
    offlineMessage: "Se requiere conexión a internet para actualizar grupos",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.id) });
      toast.success("Grupo actualizado correctamente");
    },
  });
}

/**
 * Delete a customer group (online-only)
 */
export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async (input: { id: string }) => {
      await api.groups({ id: input.id }).delete();
    },
    offlineMessage: "Se requiere conexión a internet para eliminar grupos",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      toast.success("Grupo eliminado correctamente");
    },
  });
}

/**
 * Add customers to a group (online-only)
 */
export function useAddMembersToGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async (input: { groupId: string; customerIds: string[] }) => {
      const response = await api.groups({ id: input.groupId }).members.post({
        customerIds: input.customerIds,
      });
      return extractData<{ message: string }>(response, "Error al agregar miembros");
    },
    offlineMessage: "Se requiere conexión a internet para agregar miembros al grupo",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.groupId) });
      // Invalidate all customer-groups-with-details queries
      // This will refresh which groups each customer belongs to
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.groupsWithDetails,
        exact: false,
      });
      toast.success("Miembros agregados correctamente");
    },
  });
}

/**
 * Remove a customer from a group (online-only)
 */
export function useRemoveMemberFromGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async (input: { groupId: string; customerId: string }) => {
      await api
        .groups({ id: input.groupId })
        .members({ customerId: input.customerId })
        .delete();
    },
    offlineMessage: "Se requiere conexión a internet para eliminar miembros del grupo",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.groupId) });
      // Invalidate all customer-groups-with-details queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.groupsWithDetails,
        exact: false,
      });
      toast.success("Miembro eliminado correctamente");
    },
  });
}