import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Supplier } from "@avileo/shared";
import { useSupplierService, useBusinessId } from "~/lib/sync/service-provider";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierSearchFilters,
} from "~/lib/services/supplier-service";

export type { Supplier, CreateSupplierInput, UpdateSupplierInput };

const SUPPLIERS_QUERY_KEY = "suppliers";

/**
 * Get all suppliers for a business
 */
export function useSuppliers(filters?: SupplierSearchFilters) {
  const supplierService = useSupplierService();

  return useQuery({
    queryKey: [SUPPLIERS_QUERY_KEY, filters],
    queryFn: async () => {
      return supplierService.findByBusiness(filters);
    },
  });
}

/**
 * Search suppliers by name
 */
export function useSearchSuppliers(searchTerm: string | null) {
  const supplierService = useSupplierService();

  return useQuery({
    queryKey: [SUPPLIERS_QUERY_KEY, "search", searchTerm],
    queryFn: async () => {
      return supplierService.findByBusiness({
        search: searchTerm || undefined,
      });
    },
    enabled: !!searchTerm,
  });
}

/**
 * Get a single supplier
 */
export function useSupplier(id: string | null) {
  const supplierService = useSupplierService();

  return useQuery({
    queryKey: [SUPPLIERS_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      return supplierService.findById(id);
    },
    enabled: !!id,
  });
}

/**
 * Create a new supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const supplierService = useSupplierService();

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
  const queryClient = useQueryClient();
  const supplierService = useSupplierService();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateSupplierInput;
    }) => {
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
  const queryClient = useQueryClient();
  const supplierService = useSupplierService();

  return useMutation({
    mutationFn: async (id: string) => {
      return supplierService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY] });
    },
  });
}
