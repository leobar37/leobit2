import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, and, ilike } from "drizzle-orm";
import { getDatabase } from "~/engine";
import { suppliers, type Supplier, SupplierType } from "~/engine/schema";
import { api } from "~/lib/api-client";

export type { Supplier };

const SUPPLIERS_QUERY_KEY = "suppliers";

/**
 * Get all suppliers for a business
 */
export function useSuppliers(businessId: string) {
  return useQuery({
    queryKey: [SUPPLIERS_QUERY_KEY, businessId],
    queryFn: async () => {
      const { db } = getDatabase();
      return db
        .select()
        .from(suppliers)
        .where(eq(suppliers.businessId, businessId))
        .orderBy(suppliers.name);
    },
    enabled: !!businessId,
  });
}

/**
 * Search suppliers by name
 */
export function useSearchSuppliers(
  businessId: string,
  searchTerm: string | null
) {
  return useQuery({
    queryKey: [SUPPLIERS_QUERY_KEY, "search", businessId, searchTerm],
    queryFn: async () => {
      const { db } = getDatabase();

      if (!searchTerm || searchTerm.length < 2) {
        return db
          .select()
          .from(suppliers)
          .where(eq(suppliers.businessId, businessId))
          .orderBy(suppliers.name)
          .limit(20);
      }

      const term = `%${searchTerm}%`;
      return db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.businessId, businessId),
            ilike(suppliers.name, term)
          )
        )
        .orderBy(suppliers.name)
        .limit(20);
    },
    enabled: !!businessId,
  });
}

/**
 * Get a single supplier
 */
export function useSupplier(id: string | null) {
  return useQuery({
    queryKey: [SUPPLIERS_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const { db } = getDatabase();
      const result = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, id))
        .limit(1);
      return result[0] || null;
    },
    enabled: !!id,
  });
}

interface CreateSupplierInput {
  name: string;
  type?: "generic" | "regular" | "internal";
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/**
 * Create a new supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const { data, error } = await api.suppliers.post(input);
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY] });
    },
  });
}

interface UpdateSupplierInput {
  id: string;
  name?: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

/**
 * Update a supplier
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSupplierInput) => {
      const { id, ...data } = input;
      const { data: result, error } = await api.suppliers({ id }).put(data);
      if (error) throw new Error(String(error));
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SUPPLIERS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY] });
    },
  });
}

/**
 * Delete a supplier
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.suppliers({ id }).delete();
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY] });
    },
  });
}
