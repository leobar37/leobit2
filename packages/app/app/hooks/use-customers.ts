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
  totalDebt?: number;
  lastSaleDate?: string | null;
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

import type { CustomerSortField, SortOrder } from "~/hooks/use-customer-sort";

export interface CustomerPageQuery {
  search?: string;
  limit?: number;
  offset?: number;
  tagIds?: string[];
  groupIds?: string[];
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
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
      ? queryKeys.customers.search(filters)
      : queryKeys.customers.all,
    queryFn: async () => {
      const response = await api.customers.get({
        query: {
          search: filters?.search,
          limit: (filters?.limit ?? 20).toString(),
          offset: filters?.offset?.toString(),
          tagIds: filters?.tagIds?.join(","),
        },
      });
      return extractData<Customer[]>(response);
    },
  });
}

/**
 * Get paginated customers for the current business
 */
export function usePaginatedCustomers(query: CustomerPageQuery) {
  return useQuery({
    queryKey: queryKeys.customers.page(query),
    queryFn: async (): Promise<PaginatedCustomersResult> => {
      const response = await api.customers.get({
        query: {
          search: query.search,
          limit: query.limit?.toString(),
          offset: query.offset?.toString(),
          tagIds: query.tagIds?.join(","),
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        },
      });
      const data = extractData<Customer[]>(response);
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
          const tags = extractData<Array<{
            tagId: string;
            tagName: string;
            tagColor: string;
            assignedAt: string;
          }>>(response);
          return tags.map(
            (tag) =>
              ({
                customerId: id,
                tagId: tag.tagId,
                tagName: tag.tagName,
                tagColor: tag.tagColor,
                assignedAt: new Date(tag.assignedAt),
                assignedBy: null,
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
      return extractData<Customer>(response);
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
      return extractData<Customer[]>(response);
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
      const response = await api.customers.post(input);
      return extractData<Customer>(response);
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
      const response = await api.customers({ id }).put(input);
      return extractData<Customer>(response);
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
