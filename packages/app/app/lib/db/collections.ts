import { api } from "~/lib/api-client";
import type { Customer, Product, Payment, Sale } from "./schema";
import { syncClient } from "~/lib/sync/client";
import { createSyncId, isOnline } from "~/lib/sync/utils";

export async function loadCustomers(): Promise<Customer[]> {
  const { data, error } = await api.customers.get();
  if (error) throw new Error(String(error.value));
  return (data as unknown as Customer[]) || [];
}

export async function loadProducts(): Promise<Product[]> {
  const { data, error } = await api.products.get();
  if (error) throw new Error(String(error.value));
  return (data as unknown as Product[]) || [];
}

export async function loadPayments(): Promise<Payment[]> {
  const { data, error } = await api.payments.get();
  if (error) throw new Error(String(error.value));
  return (data as unknown as Payment[]) || [];
}

export async function createCustomer(data: { name: string; dni?: string; phone?: string; address?: string; notes?: string }): Promise<Customer> {
  if (!isOnline()) {
    const tempId = createSyncId();
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "insert",
      entityId: tempId,
      data,
      lastError: undefined,
    });

    const now = new Date();
    return {
      id: tempId,
      name: data.name,
      dni: data.dni ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      businessId: "",
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };
  }

  const response = await api.customers.post(data);
  if (response.error) throw new Error(String(response.error.value));
  return (response.data as unknown as Customer);
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "update",
      entityId: id,
      data,
      lastError: undefined,
    });

    return {
      id,
      name: data.name ?? "",
      dni: data.dni ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      businessId: data.businessId ?? "",
      syncStatus: "pending",
      createdAt: data.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
  }

  const response = await api.customers({ id }).put({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.dni !== undefined && { dni: data.dni ?? undefined }),
    ...(data.phone !== undefined && { phone: data.phone ?? undefined }),
    ...(data.address !== undefined && { address: data.address ?? undefined }),
    ...(data.notes !== undefined && { notes: data.notes ?? undefined }),
  });
  if (response.error) throw new Error(String(response.error.value));
  return (response.data as unknown as Customer);
}

export async function deleteCustomer(id: string): Promise<void> {
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
  if (response.error) throw new Error(String(response.error.value));
}

export async function createPayment(data: { clientId: string; amount: string; paymentMethod: "efectivo" | "yape" | "plin" | "transferencia"; notes?: string }): Promise<Payment> {
  if (!isOnline()) {
    const tempId = createSyncId();

    await syncClient.enqueueOperation({
      entity: "abonos",
      operation: "insert",
      entityId: tempId,
      data,
      lastError: undefined,
    });

    return {
      id: tempId,
      clientId: data.clientId,
      sellerId: "",
      businessId: "",
      amount: data.amount,
      paymentMethod: data.paymentMethod as Payment["paymentMethod"],
      notes: data.notes ?? null,
      syncStatus: "pending",
      createdAt: new Date(),
    };
  }

  const response = await api.payments.post(data);
  if (response.error) throw new Error(String(response.error.value));
  return (response.data as unknown as Payment);
}

export async function deletePayment(id: string): Promise<void> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "abonos",
      operation: "delete",
      entityId: id,
      data: {},
      lastError: undefined,
    });
    return;
  }

  const response = await api.payments({ id }).delete();
  if (response.error) throw new Error(String(response.error.value));
}
