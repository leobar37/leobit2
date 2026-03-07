import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import { syncClient } from "~/lib/sync/client";
import { createSyncId, isOnline } from "~/lib/sync/utils";

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

async function getCustomers(options?: { tagIds?: string[] }): Promise<Customer[]> {
  const query: Record<string, string> = {};

  if (options?.tagIds && options.tagIds.length > 0) {
    query.tagIds = options.tagIds.join(",");
  }

  const response = await api.customers.get({ query });
  return extractData<Customer[]>(response, "Error al cargar clientes");
}

async function getCustomer(id: string): Promise<Customer> {
  const response = await api.customers({ id }).get();
  return extractData<Customer>(response, "Error al cargar cliente");
}

async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  if (!isOnline()) {
    const tempId = createSyncId();

    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "insert",
      entityId: tempId,
      data: {
        ...input,
      },
      lastError: undefined,
    });

    return {
      id: tempId,
      name: input.name,
      dni: input.dni ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      syncStatus: "pending",
      createdAt: new Date(),
    };
  }

  const response = await api.customers.post(input);
  return extractData<Customer>(response, "Error al crear cliente");
}

async function updateCustomer({
  id,
  ...input
}: UpdateCustomerInput & { id: string }): Promise<Customer> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "update",
      entityId: id,
      data: {
        ...input,
      },
      lastError: undefined,
    });

    return {
      id,
      name: input.name ?? "",
      dni: input.dni ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      syncStatus: "pending",
      createdAt: new Date(),
    };
  }

  const response = await api.customers({ id }).put(input);
  return extractData<Customer>(response, "Error al actualizar cliente");
}

async function deleteCustomer(id: string): Promise<void> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "delete",
      entityId: id,
      data: {},
      lastError: undefined,
    });
    return;
  }

  const response = await api.customers({ id }).delete();

  if (response.error) {
    throw new Error(String(response.error.value));
  }
}

export function useCustomers(options?: { tagIds?: string[] }) {
  return useQuery({
    queryKey: ["customers", options?.tagIds],
    queryFn: () => getCustomers(options),
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
