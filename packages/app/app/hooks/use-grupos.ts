/**
 * Customer Groups Hook
 * Reactively fetch and mutate customer groups using API
 * Offline-first: uses useOfflineAwareMutation to check connectivity before API calls
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStoredAuthToken, getStoredBusinessId } from "~/lib/session-storage";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

export interface GroupMember {
  customerId: string;
  customerName: string;
  addedAt: string;
}

export interface CustomerGroup {
  id: string;
  name: string;
  businessId: string;
  syncStatus: string;
  syncAttempts: number;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: GroupMember[];
}

const QUERY_KEYS = {
  groups: ["customer-groups"] as const,
  group: (id: string) => ["customer-groups", id] as const,
};

async function apiCall<T>(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<T> {
  const token = getStoredAuthToken();
  const businessId = getStoredBusinessId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (businessId) {
    headers["x-business-id"] = businessId;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Request failed");
  }

  return data.data as T;
}

export function useCustomerGroups() {
  return useQuery({
    queryKey: QUERY_KEYS.groups,
    queryFn: async (): Promise<CustomerGroup[]> => {
      return apiCall<CustomerGroup[]>("/api/customer-groups", "GET");
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCustomerGroup(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.group(id),
    queryFn: async (): Promise<CustomerGroup> => {
      return apiCall<CustomerGroup>(`/api/customer-groups/${id}`, "GET");
    },
    enabled: !!id,
  });
}

export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation<CustomerGroup, Error, { name: string }>({
    mutationFn: async ({ name }): Promise<CustomerGroup> => {
      return apiCall<CustomerGroup>("/api/customer-groups", "POST", { name });
    },
    offlineMessage: "Se requiere conexión a internet para crear el grupo",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      toast.success("Grupo creado correctamente");
    },
  });
}

export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation<CustomerGroup, Error, { id: string; name: string }>({
    mutationFn: async ({ id, name }): Promise<CustomerGroup> => {
      return apiCall<CustomerGroup>(`/api/customer-groups/${id}`, "PUT", { name });
    },
    offlineMessage: "Se requiere conexión a internet para actualizar el grupo",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.id) });
      toast.success("Grupo actualizado correctamente");
    },
  });
}

export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }): Promise<void> => {
      await apiCall<void>(`/api/customer-groups/${id}`, "DELETE");
    },
    offlineMessage: "Se requiere conexión a internet para eliminar el grupo",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      toast.success("Grupo eliminado correctamente");
    },
  });
}

export function useAddMembersToGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation<CustomerGroup, Error, { groupId: string; customerIds: string[] }>({
    mutationFn: async ({ groupId, customerIds }): Promise<CustomerGroup> => {
      return apiCall<CustomerGroup>(`/api/customer-groups/${groupId}/members`, "POST", { customerIds });
    },
    offlineMessage: "Se requiere conexión a internet para agregar miembros",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.groupId) });
      toast.success("Miembros agregados correctamente");
    },
  });
}

export function useRemoveMemberFromGroup() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation<void, Error, { groupId: string; customerId: string }>({
    mutationFn: async ({ groupId, customerId }): Promise<void> => {
      await apiCall<void>(`/api/customer-groups/${groupId}/members/${customerId}`, "DELETE");
    },
    offlineMessage: "Se requiere conexión a internet para eliminar el miembro",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.group(variables.groupId) });
      toast.success("Miembro eliminado correctamente");
    },
  });
}
