/**
 * Customer Groups Hook
 * Local-first: All operations use CustomerGroupService for offline support
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { CustomerGroupService } from "~/lib/services/customer-group-service";
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
 * Get all customer groups for the current business
 */
export function useCustomerGroups() {
  const engine = useSyncEngine();
  const customerGroupService = engine.use("customerGroups", () => new CustomerGroupService(engine));

  return useQuery({
    queryKey: QUERY_KEYS.groups,
    queryFn: () => customerGroupService.findAll(),
    staleTime: 1000 * 60,
  });
}

/**
 * Get a single customer group by ID with members
 */
export function useCustomerGroup(id: string | null) {
  const engine = useSyncEngine();
  const customerGroupService = engine.use("customerGroups", () => new CustomerGroupService(engine));

  return useQuery({
    queryKey: QUERY_KEYS.group(id || ""),
    queryFn: () => {
      if (!id) return null;
      return customerGroupService.findById(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

/**
 * Create a new customer group
 * Supports optional customerIds to add members atomically using createWithMembers
 */
export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();
  const engine = useSyncEngine();
  const customerGroupService = engine.use("customerGroups", () => new CustomerGroupService(engine));

  return useMutation({
    mutationFn: async (input: { name: string; customerIds?: string[] }) => {
      if (input.customerIds && input.customerIds.length > 0) {
        return customerGroupService.createWithMembers({ name: input.name }, input.customerIds);
      }
      return customerGroupService.create({ name: input.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      toast.success("Grupo creado correctamente");
    },
    onError: (error) => {
      toast.error(`Error al crear grupo: ${error.message}`);
    },
  });
}

/**
 * Update an existing customer group
 */
export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();
  const engine = useSyncEngine();
  const customerGroupService = engine.use("customerGroups", () => new CustomerGroupService(engine));

  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      return customerGroupService.update(input.id, { name: input.name });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.id) });
      toast.success("Grupo actualizado correctamente");
    },
    onError: (error) => {
      toast.error(`Error al actualizar grupo: ${error.message}`);
    },
  });
}

/**
 * Delete a customer group
 */
export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient();
  const engine = useSyncEngine();
  const customerGroupService = engine.use("customerGroups", () => new CustomerGroupService(engine));

  return useMutation({
    mutationFn: async (input: { id: string }) => {
      return customerGroupService.delete(input.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      toast.success("Grupo eliminado correctamente");
    },
    onError: (error) => {
      toast.error(`Error al eliminar grupo: ${error.message}`);
    },
  });
}

/**
 * Add customers to a group
 */
export function useAddMembersToGroup() {
  const queryClient = useQueryClient();
  const engine = useSyncEngine();
  const customerGroupService = engine.use("customerGroups", () => new CustomerGroupService(engine));

  return useMutation({
    mutationFn: async (input: { groupId: string; customerIds: string[] }) => {
      return customerGroupService.addMembers(input.groupId, input.customerIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.groupId) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.groupsWithDetails,
        exact: false,
      });
      toast.success("Miembros agregados correctamente");
    },
    onError: (error) => {
      toast.error(`Error al agregar miembros: ${error.message}`);
    },
  });
}

/**
 * Remove a customer from a group
 */
export function useRemoveMemberFromGroup() {
  const queryClient = useQueryClient();
  const engine = useSyncEngine();
  const customerGroupService = engine.use("customerGroups", () => new CustomerGroupService(engine));

  return useMutation({
    mutationFn: async (input: { groupId: string; customerId: string }) => {
      return customerGroupService.removeMember(input.groupId, input.customerId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.groupId) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.groupsWithDetails,
        exact: false,
      });
      toast.success("Miembro eliminado correctamente");
    },
    onError: (error) => {
      toast.error(`Error al eliminar miembro: ${error.message}`);
    },
  });
}