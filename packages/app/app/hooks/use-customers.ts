/**
 * Customers Hook (API-based)
 * Reactively fetch and mutate customers using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export interface Customer {
  id: string;
  name: string;
  dni: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  businessId: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCustomersResult {
  items: Customer[];
  total: number;
}

export interface CustomerSearchFilters {
  search?: string;
  limit?: number;
  offset?: number;
  tagIds?: string[];
}

export interface CustomerPageQuery {
  search?: string;
  limit?: number;
  offset?: number;
  tagIds?: string[];
  groupIds?: string[];
}

export interface CreateCustomerInput {
  name: string;
  dni?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  dni?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface CustomerTagSummary {
  customerId: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  assignedAt: Date;
  assignedBy: null;
  syncStatus: string;
  syncAttempts: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all customers for the current business
 */
export function useCustomers(filters?: CustomerSearchFilters) {
  return useQuery({
    queryKey: filters
      ? queryKeys.customers.search(filters as Record<string, unknown>)
      : queryKeys.customers.all,
    queryFn: async () => {
      const response = await api.customers.get({
        query: {
          search: filters?.search,
          limit: filters?.limit?.toString(),
          offset: filters?.offset?.toString(),
          tagIds: filters?.tagIds?.join(","),
        },
      });
      return extractData(response) as unknown as Customer[];
    },
  });
}

/**
 * Get paginated customers for the current business
 */
export function usePaginatedCustomers(query: CustomerPageQuery) {
  return useQuery({
    queryKey: queryKeys.customers.page(query as Record<string, unknown>),
    queryFn: async (): Promise<PaginatedCustomersResult> => {
      const response = await api.customers.get({
        query: {
          search: query.search,
          limit: query.limit?.toString(),
          offset: query.offset?.toString(),
          tagIds: query.tagIds?.join(","),
        },
      });
      const data = extractData(response) as unknown as Customer[];
      return { items: data, total: data.length };
    },
  });
}

/**
 * Get tags summary for multiple customers
 */
export function useCustomerTagsSummary(customerIds: string[]) {
  return useQuery({
    queryKey: queryKeys.customers.tags(customerIds),
    queryFn: async (): Promise<CustomerTagSummary[]> => {
      if (customerIds.length === 0) return [];
      const results = await Promise.all(
        customerIds.map(async (id) => {
          const response = await api.customers({ id }).tags.get();
          const tags = extractData(response) as unknown as Array<{
            tagId: string;
            tagName: string;
            tagColor: string;
            assignedAt: string;
          }>;
          return tags.map(
            (tag) =>
              ({
                customerId: id,
                tagId: tag.tagId,
                tagName: tag.tagName,
                tagColor: tag.tagColor,
                assignedAt: new Date(tag.assignedAt),
                assignedBy: null,
                syncStatus: "synced",
                syncAttempts: 0,
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              }) as CustomerTagSummary
          );
        })
      );
      return results.flat();
    },
    enabled: customerIds.length > 0,
  });
}

/**
 * Get a single customer by ID
 */
export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.customers.detail(id) : queryKeys.customers.all,
    queryFn: async () => {
      if (!id) return null;
      const response = await api.customers({ id }).get();
      return extractData(response) as unknown as Customer;
    },
    enabled: !!id,
  });
}

/**
 * Search customers by name, DNI, or phone
 */
export function useSearchCustomers(searchTerm: string | null) {
  return useQuery({
    queryKey: ["customers", "search", searchTerm],
    queryFn: async () => {
      const response = await api.customers.get({
        query: {
          search: searchTerm && searchTerm.length >= 2 ? searchTerm : undefined,
        },
      });
      return extractData(response) as unknown as Customer[];
    },
  });
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomerInput): Promise<Customer> => {
      const response = await api.customers.post(input as any);
      return extractData(response) as unknown as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: ["customers", "search"] });
    },
  });
}

/**
 * Update an existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCustomerInput;
    }): Promise<Customer> => {
      const response = await api.customers({ id }).put(input as any);
      return extractData(response) as unknown as Customer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: ["customers", "search"] });
    },
  });
}

/**
 * Delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api.customers({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: ["customers", "search"] });
    },
  });
}
