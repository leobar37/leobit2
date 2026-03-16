/**
 * Customer Groups Hook
 * Reactively fetch and mutate customer groups using local-first services
 * Offline-first: uses service layer for local data with automatic sync
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerGroupService } from "~/lib/sync/service-provider";
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
};

/**
 * Get all customer groups for the current business
 */
export function useCustomerGroups() {
  const customerGroupService = useCustomerGroupService();

  return useQuery({
    queryKey: QUERY_KEYS.groups,
    queryFn: async () => {
      return customerGroupService.findAll() as Promise<CustomerGroup[]>;
    },
  });
}

/**
 * Get a single customer group by ID with members
 */
export function useCustomerGroup(id: string | null) {
  const customerGroupService = useCustomerGroupService();

  return useQuery({
    queryKey: QUERY_KEYS.group(id || ""),
    queryFn: async () => {
      if (!id) return null;
      return customerGroupService.findById(id) as Promise<CustomerGroup | null>;
    },
    enabled: !!id,
  });
}

/**
 * Create a new customer group
 */
export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();
  const customerGroupService = useCustomerGroupService();

  return useMutation<CustomerGroup, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      return customerGroupService.create({ name }) as Promise<CustomerGroup>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      toast.success("Grupo creado correctamente");
    },
  });
}

/**
 * Update an existing customer group
 */
export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();
  const customerGroupService = useCustomerGroupService();

  return useMutation<CustomerGroup, Error, { id: string; name: string }>({
    mutationFn: async ({ id, name }) => {
      return customerGroupService.update(id, { name }) as Promise<CustomerGroup>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.id) });
      toast.success("Grupo actualizado correctamente");
    },
  });
}

/**
 * Delete a customer group
 */
export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient();
  const customerGroupService = useCustomerGroupService();

  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      return customerGroupService.delete(id) as Promise<void>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      toast.success("Grupo eliminado correctamente");
    },
  });
}

/**
 * Add customers to a group
 */
export function useAddMembersToGroup() {
  const queryClient = useQueryClient();
  const customerGroupService = useCustomerGroupService();

  return useMutation<void, Error, { groupId: string; customerIds: string[] }>({
    mutationFn: async ({ groupId, customerIds }) => {
      return customerGroupService.addMembers(groupId, customerIds) as Promise<void>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.groupId) });
      toast.success("Miembros agregados correctamente");
    },
  });
}

/**
 * Remove a customer from a group
 */
export function useRemoveMemberFromGroup() {
  const queryClient = useQueryClient();
  const customerGroupService = useCustomerGroupService();

  return useMutation<void, Error, { groupId: string; customerId: string }>({
    mutationFn: async ({ groupId, customerId }) => {
      return customerGroupService.removeMember(groupId, customerId) as Promise<void>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.groupId) });
      toast.success("Miembro eliminado correctamente");
    },
  });
}
