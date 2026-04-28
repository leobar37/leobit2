/**
 * Suppliers Hook (API-based)
 * Reactively fetch and mutate suppliers using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  type: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new supplier */
export interface CreateSupplierInput {
  name: string;
  type?: "generic" | "regular" | "internal";
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/** Input for updating an existing supplier */
export interface UpdateSupplierInput {
  name?: string;
  type?: "generic" | "regular" | "internal";
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

/**
 * Get all suppliers for a business
 */
export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      const response = await api.suppliers.get();
      return extractData<Supplier[]>(response);
    },
  });
}

/**
 * Search suppliers by name
 */
export function useSearchSuppliers(searchTerm: string | null) {
  return useQuery({
    queryKey: queryKeys.suppliers.search(searchTerm),
    queryFn: async () => {
      const response = await api.suppliers.get({
        query: {
          search: searchTerm && searchTerm.length >= 2 ? searchTerm : undefined,
        },
      });
      return extractData<Supplier[]>(response);
    },
  });
}

/**
 * Get a single supplier
 */
export function useSupplier(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.suppliers.detail(id) : ["suppliers", "detail"],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.suppliers({ id }).get();
      return extractData<Supplier>(response);
    },
    enabled: !!id,
  });
}

/**
 * Create a new supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupplierInput): Promise<Supplier> => {
      const response = await api.suppliers.post(input);
      return extractData<Supplier>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

/**
 * Update a supplier
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateSupplierInput;
    }): Promise<Supplier> => {
      const response = await api.suppliers({ id }).put(input);
      return extractData<Supplier>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

/**
 * Delete a supplier
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api.suppliers({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}
