/**
 * Visits Hook
 * Reactively fetch and mutate visits using API
 */

import { useMutation } from "@tanstack/react-query";
import { getStoredAuthToken, getStoredBusinessId } from "~/lib/session-storage";

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
 */
export function useUpdateVisita() {
  return useMutation({
    mutationFn: async ({
      id,
      status,
      motivoNoCompra,
      saleId,
    }: {
      id: string;
      status: "pendiente" | "compro" | "no_compra";
      motivoNoCompra?: string;
      saleId?: string;
    }): Promise<Visita> => {
      return apiCall<Visita>(`/api/visitas/${id}`, "PATCH", {
        status,
        motivoNoCompra,
        saleId,
      });
    },
  });
}
