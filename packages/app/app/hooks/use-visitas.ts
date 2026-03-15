/**
 * Visits Hook
 * Reactively fetch and mutate visits using API
 * Offline-first: uses useOfflineAwareMutation to check connectivity before API calls
 */

import { getStoredAuthToken, getStoredBusinessId } from "~/lib/session-storage";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

// Types
export interface Visita {
  id: string;
  distribucionId: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    dni?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  vendedorId: string;
  status: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string | null;
  saleId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// API helper
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

/**
 * Update visita status (mark as purchased/not purchased, link sale)
 * Uses offline-aware mutation to check connectivity before API call
 */
export function useUpdateVisita() {
  return useOfflineAwareMutation<Visita, Error, {
    id: string;
    status: "pendiente" | "compro" | "no_compra";
    motivoNoCompra?: string;
    saleId?: string;
  }>({
    mutationFn: async ({
      id,
      status,
      motivoNoCompra,
      saleId,
    }): Promise<Visita> => {
      return apiCall<Visita>(`/api/visitas/${id}`, "PATCH", {
        status,
        motivoNoCompra,
        saleId,
      });
    },
    offlineMessage: "Se requiere conexión a internet para actualizar la visita",
    onSuccess: () => {
      toast.success("Visita actualizada correctamente");
    },
  });
}

/**
 * Create a new visita for a customer
 * Uses offline-aware mutation to check connectivity before API call
 */
export function useCreateVisita() {
  return useOfflineAwareMutation<Visita, Error, {
    distribucionId: string;
    customerId: string;
  }>({
    mutationFn: async ({
      distribucionId,
      customerId,
    }): Promise<Visita> => {
      return apiCall<Visita>("/api/visitas", "POST", {
        distribucionId,
        customerId,
      });
    },
    offlineMessage: "Se requiere conexión a internet para crear la visita",
    onSuccess: () => {
      toast.success("Visita creada correctamente");
    },
  });
}

/**
 * Create multiple visitas from a group of customers
 * Uses offline-aware mutation to check connectivity before API call
 */
export function useCreateVisitasFromGroup() {
  return useOfflineAwareMutation<Visita[], Error, {
    distribucionId: string;
    groupId: string;
  }>({
    mutationFn: async ({
      distribucionId,
      groupId,
    }): Promise<Visita[]> => {
      return apiCall<Visita[]>("/api/visitas/bulk", "POST", {
        distribucionId,
        groupId,
      });
    },
    offlineMessage: "Se requiere conexión a internet para crear las visitas",
    onSuccess: () => {
      toast.success("Visitas creadas correctamente");
    },
  });
}
