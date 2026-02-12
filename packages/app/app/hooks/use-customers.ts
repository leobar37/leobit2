import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface Customer {
  id: string;
  name: string;
  dni: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  syncStatus: "pending" | "synced" | "error";
  createdAt: Date;
}

export interface CreateCustomerInput {
  name: string;
  dni?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  dni?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await api.customers.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Customer[];
}

async function getCustomer(id: string): Promise<Customer> {
  const { data, error } = await api.customers({ id }).get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Customer;
}

async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { data, error } = await api.customers.post(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Customer;
}

async function updateCustomer({
  id,
  ...input
}: UpdateCustomerInput & { id: string }): Promise<Customer> {
  const { data, error } = await api.customers({ id }).put(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Customer;
}

async function deleteCustomer(id: string): Promise<void> {
  const { error } = await api.customers({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => getCustomer(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", variables.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
