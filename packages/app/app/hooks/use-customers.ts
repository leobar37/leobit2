/**
 * Customers Hook
 * Reactively fetch and mutate customers using PGlite + ElectricSQL
 */
import { useCallback, useEffect, useState } from "react";
import { eq, ilike, and } from "drizzle-orm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDatabase } from "~/engine";
import { customers, type Customer, type NewCustomer } from "~/engine/schema";
import { pushWrite } from "~/engine/write-engine";

const CUSTOMERS_QUERY_KEY = "customers";

/**
 * Get all customers for the current business
 */
export function useCustomers(businessId: string) {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, businessId],
    queryFn: async () => {
      const { db } = getDatabase();
      return db
        .select()
        .from(customers)
        .where(eq(customers.businessId, businessId))
        .orderBy(customers.name);
    },
    enabled: !!businessId,
  });
}

/**
 * Search customers by name or DNI
 */
export function useSearchCustomers(
  businessId: string,
  searchTerm: string | null
) {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, "search", businessId, searchTerm],
    queryFn: async () => {
      const { db } = getDatabase();

      if (!searchTerm || searchTerm.length < 2) {
        return db
          .select()
          .from(customers)
          .where(eq(customers.businessId, businessId))
          .orderBy(customers.name)
          .limit(20);
      }

      const term = `%${searchTerm}%`;
      return db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.businessId, businessId),
            ilike(customers.name, term)
          )
        )
        .orderBy(customers.name)
        .limit(20);
    },
    enabled: !!businessId,
  });
}

/**
 * Get a single customer by ID
 */
export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const { db } = getDatabase();
      const result = await db
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1);
      return result[0] || null;
    },
    enabled: !!id,
  });
}

interface CreateCustomerInput {
  name: string;
  dni?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const result = await pushWrite("/api/customers", "POST", input);
      return result;
    },
    onSuccess: () => {
      // Invalidate customers query to trigger refetch
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}

interface UpdateCustomerInput {
  id: string;
  name?: string;
  dni?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

/**
 * Update an existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCustomerInput) => {
      const { id, ...data } = input;
      const result = await pushWrite(`/api/customers/${id}`, "PUT", data);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CUSTOMERS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}

/**
 * Delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await pushWrite(`/api/customers/${id}`, "DELETE", null);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}

/**
 * Hook for reactive customer count
 */
export function useCustomersCount(businessId: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!businessId) return;

    const { db } = getDatabase();

    // Subscribe to changes
    const unsubscribe = db
      .select({ count: sql`count(*)` })
      .from(customers)
      .where(eq(customers.businessId, businessId))
      .subscribe({
        next: (result) => {
          setCount(Number(result[0]?.count || 0));
        },
        error: (err) => {
          console.error("Error subscribing to customers count:", err);
        },
      });

    return () => {
      unsubscribe.unsubscribe();
    };
  }, [businessId]);

  return count;
}

// Import sql for count query
import { sql } from "drizzle-orm";
