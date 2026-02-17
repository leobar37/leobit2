import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface Supplier {
  id: string;
  name: string;
  type: "generic" | "regular" | "internal";
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateSupplierInput {
  name: string;
  type?: "generic" | "regular" | "internal";
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await api.suppliers.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Supplier[];
}

async function getSupplier(id: string): Promise<Supplier> {
  const { data, error } = await api.suppliers({ id }).get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Supplier;
}

async function getGenericSupplier(): Promise<Supplier | null> {
  const { data, error } = await api.suppliers.generic.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return (data as unknown as Supplier) || null;
}

async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const { data, error } = await api.suppliers.post(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Supplier;
}

async function updateSupplier({
  id,
  ...input
}: UpdateSupplierInput & { id: string }): Promise<Supplier> {
  const { data, error } = await api.suppliers({ id }).put(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Supplier;
}

async function deleteSupplier(id: string): Promise<void> {
  const { error } = await api.suppliers({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ["suppliers", id],
    queryFn: () => getSupplier(id),
    enabled: !!id,
  });
}

export function useGenericSupplier() {
  return useQuery({
    queryKey: ["suppliers", "generic"],
    queryFn: getGenericSupplier,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSupplier,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", variables.id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
