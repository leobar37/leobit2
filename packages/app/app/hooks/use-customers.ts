/**
 * Customers Hook (API-based)
 * Reactively fetch and mutate customers using Eden Treaty API
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  waterProfile?: WaterCustomerProfile | null;
}

export interface WaterCustomerProfile {
  id: string;
  businessId: string;
  customerId: string;
  deliveryFrequency: string;
  deliveryDays: string[];
  defaultContainerQuantity: number;
  containersAtCustomer: number;
  depositAmount: string;
  depositStatus: string;
  depositExceptionReason: string | null;
  waterRouteId: string | null;
  waterRouteName?: string | null;
  preferredRoute: string | null;
  deliveryInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaterCustomerProfileInput {
  deliveryFrequency?: string;
  deliveryDays?: string[];
  defaultContainerQuantity?: number;
  waterRouteId?: string | null;
  preferredRoute?: string | null;
  deliveryInstructions?: string | null;
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
  waterProfile?: WaterCustomerProfileInput | null;
}

export interface UpdateCustomerInput {
  name?: string;
  dni?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  waterProfile?: WaterCustomerProfileInput | null;
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

export interface CustomerActivity {
  customerId: string;
  customerName: string;
  phone: string | null;
  address: string | null;
  lastOrderDate: string | null;
  daysWithoutOrder: number | null;
  shouldFollowUp: boolean;
  defaultContainerQuantity: number | null;
  waterRouteId: string | null;
  waterRouteName: string | null;
  preferredRoute: string | null;
}

/**
 * Get all customers for the current business
 */
export function customersQueryOptions(filters?: CustomerSearchFilters) {
  return queryOptions<Customer[]>({
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

export function useCustomers(filters?: CustomerSearchFilters) {
  return useQuery(customersQueryOptions(filters));
}

/**
 * Get paginated customers for the current business
 */
export function paginatedCustomersQueryOptions(query: CustomerPageQuery) {
  return queryOptions<PaginatedCustomersResult>({
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

export function usePaginatedCustomers(query: CustomerPageQuery) {
  return useQuery(paginatedCustomersQueryOptions(query));
}

export function useCustomerActivity(filters?: {
  inactivityDays?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<CustomerActivity[]>({
    queryKey: ["customers", "activity", filters],
    queryFn: async () => {
      const response = await api.customers.activity.get({
        query: {
          inactivityDays: filters?.inactivityDays?.toString(),
          search: filters?.search,
          limit: filters?.limit?.toString(),
          offset: filters?.offset?.toString(),
        },
      });
      return extractData<CustomerActivity[]>(response);
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
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "customers" });
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
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "customers" });
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
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "customers" });
    },
  });
}
