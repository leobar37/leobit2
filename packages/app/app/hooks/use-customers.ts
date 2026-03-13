/**
 * Customers Hook (Service-based)
 * Reactively fetch and mutate customers using PGlite services
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomerService } from "~/lib/sync/service-provider";
import type { Customer } from "@avileo/shared";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSearchFilters,
} from "~/lib/services/customer-service";

const QUERY_KEYS = {
  customers: ["customers-new"],
  customer: (id: string) => ["customers-new", id],
  search: (filters: CustomerSearchFilters) => ["customers-new", "search", filters],
} as const;

/**
 * Get all customers for the current business
 */
export function useCustomers(filters?: CustomerSearchFilters) {
  const customerService = useCustomerService();

  return useQuery({
    queryKey: filters ? QUERY_KEYS.search(filters) : QUERY_KEYS.customers,
    queryFn: async () => {
      return customerService.findByBusiness(filters);
    },
  });
}

/**
 * Get a single customer by ID
 */
export function useCustomer(id: string | null) {
  const customerService = useCustomerService();

  return useQuery({
    queryKey: id ? QUERY_KEYS.customer(id) : ["customers-new", "detail"],
    queryFn: async () => {
      if (!id) return null;
      return customerService.findById(id);
    },
    enabled: !!id,
  });
}

/**
 * Search customers by name, DNI, or phone
 */
export function useSearchCustomers(searchTerm: string | null) {
  const customerService = useCustomerService();

  return useQuery({
    queryKey: ["customers-new", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) {
        return customerService.findByBusiness({});
      }
      return customerService.findByBusiness({ search: searchTerm });
    },
  });
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const customerService = useCustomerService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomerInput): Promise<Customer> => {
      return customerService.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
      queryClient.invalidateQueries({ queryKey: ["customers-new", "search"] });
    },
  });
}

/**
 * Update an existing customer
 */
export function useUpdateCustomer() {
  const customerService = useCustomerService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCustomerInput;
    }): Promise<void> => {
      return customerService.update(id, input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customer(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
      queryClient.invalidateQueries({ queryKey: ["customers-new", "search"] });
    },
  });
}

/**
 * Delete a customer
 */
export function useDeleteCustomer() {
  const customerService = useCustomerService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return customerService.delete(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customer(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
      queryClient.invalidateQueries({ queryKey: ["customers-new", "search"] });
    },
  });
}
