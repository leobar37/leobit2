/**
 * Suppliers Hook (Service-based)
 * Reactively fetch and mutate suppliers using PGlite services
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, and, ilike } from "drizzle-orm";
import { getDatabase } from "@avileo/drizzle-sync/client";
import { suppliers, type Suppliers as Supplier } from "~/lib/sync/generated/schema";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { SupplierService } from "~/lib/services/supplier-service";

export type { Supplier };

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

/**
 * Create a new supplier
 */
export function useCreateSupplier() {
  const engine = useSyncEngine();
  const supplierService = engine.use("suppliers", () => new SupplierService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      return supplierService.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY] });
    },
  });
}

/**
 * Update a supplier
 */
export function useUpdateSupplier() {
  const engine = useSyncEngine();
  const supplierService = engine.use("suppliers", () => new SupplierService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSupplierInput }) => {
      return supplierService.update(id, input);
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
  const engine = useSyncEngine();
  const supplierService = engine.use("suppliers", () => new SupplierService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return supplierService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY] });
    },
  });
}
