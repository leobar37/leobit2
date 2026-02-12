import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  loadCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "~/lib/db/collections";
import type { Customer } from "~/lib/db/schema";

const QUERY_KEY = "customers";

export function useCustomers() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: loadCustomers,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
