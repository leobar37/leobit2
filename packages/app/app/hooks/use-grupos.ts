import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
import { toast } from "sonner";

export interface GroupMember {
  customerId: string;
  customerName: string;
  addedAt: Date;
}

export interface CustomerGroup {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  members?: GroupMember[];
}

function mapApiGroup(data: {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: Array<{
    customerId: string;
    customerName: string;
    addedAt: string;
  }>;
}): CustomerGroup {
  return {
    id: data.id,
    name: data.name,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    memberCount: data.memberCount,
    members: data.members?.map((m) => ({
      customerId: m.customerId,
      customerName: m.customerName,
      addedAt: new Date(m.addedAt),
    })),
  };
}

/**
 * Get all customer groups for the current business
 */
export function customerGroupsQueryOptions() {
  return queryOptions<CustomerGroup[]>({
    queryKey: queryKeys.customerGroups.all,
    queryFn: async () => {
      const response = await api.groups.get();
      const data = extractData<Array<{
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        memberCount: number;
      }>>(response);
      return data.map(mapApiGroup);
    },
    staleTime: 1000 * 60,
  });
}

export function useCustomerGroups() {
  return useQuery(customerGroupsQueryOptions());
}

/**
 * Get a single customer group by ID with members
 */
export function useCustomerGroup(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.customerGroups.detail(id) : queryKeys.customerGroups.all,
    queryFn: async () => {
      if (!id) return null;
      const response = await api.groups({ id }).get();
      const data = extractData<{
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        memberCount?: number;
        members?: Array<{
          customerId: string;
          customerName: string;
          addedAt: string;
        }>;
      }>(response);
      return mapApiGroup(data);
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

/**
 * Create a new customer group
 * Supports optional customerIds to add members atomically
 */
export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; customerIds?: string[] }) => {
      const createResponse = await api.groups.post({ name: input.name });
      const data = extractData<{
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        memberCount: number;
      }>(createResponse);
      const group = mapApiGroup(data);

      if (input.customerIds && input.customerIds.length > 0) {
        const membersResponse = await api
          .groups({ id: group.id })
          .members.post({ customerIds: input.customerIds });
        if (membersResponse.error) {
          throw new Error(String(membersResponse.error.value));
        }
      }

      return group;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.customerGroups.all });
      const previousGroups = queryClient.getQueryData<CustomerGroup[]>(queryKeys.customerGroups.all);

      const optimisticGroup: CustomerGroup = {
        id: `temp-${Date.now()}`,
        name: input.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberCount: input.customerIds?.length ?? 0,
      };

      queryClient.setQueryData<CustomerGroup[]>(queryKeys.customerGroups.all, (old) => {
        return old ? [...old, optimisticGroup] : [optimisticGroup];
      });

      return { previousGroups, optimisticGroup };
    },
    onSuccess: (group, _input, context) => {
      queryClient.setQueryData<CustomerGroup[]>(queryKeys.customerGroups.all, (old) => {
        if (!old) return [group];
        return old.map((g) => (g.id === context?.optimisticGroup.id ? group : g));
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerGroups.all });
    },
    onError: (_error, _input, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKeys.customerGroups.all, context.previousGroups);
      }
      toast.error("Error al crear grupo");
    },
  });
}

/**
 * Update an existing customer group
 */
export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const response = await api
        .groups({ id: input.id })
        .put({ name: input.name });
      const data = extractData<{
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        memberCount: number;
      }>(response);
      return mapApiGroup(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerGroups.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerGroups.detail(variables.id),
      });
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

  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const response = await api.groups({ id: input.id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerGroups.all });
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

  return useMutation({
    mutationFn: async (input: { groupId: string; customerIds: string[] }) => {
      const response = await api
        .groups({ id: input.groupId })
        .members.post({ customerIds: input.customerIds });
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerGroups.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerGroups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: ["customer-groups-with-details"],
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

  return useMutation({
    mutationFn: async (input: { groupId: string; customerId: string }) => {
      const response = await api
        .groups({ id: input.groupId })
        .members({ customerId: input.customerId })
        .delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerGroups.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerGroups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: ["customer-groups-with-details"],
        exact: false,
      });
      toast.success("Miembro eliminado correctamente");
    },
    onError: (error) => {
      toast.error(`Error al eliminar miembro: ${error.message}`);
    },
  });
}
