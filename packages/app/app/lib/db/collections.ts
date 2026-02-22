import { api, extractData } from "~/lib/api-client";
import type { Customer, Product, Payment, Sale } from "./schema";
import { syncClient } from "~/lib/sync/client";
import { createSyncId, isOnline } from "~/lib/sync/utils";

// Customer cache storage for offline-first reading
const CUSTOMER_CACHE_DB = "avileo-customers";
const CUSTOMER_CACHE_VERSION = 1;
const CUSTOMER_STORE = "customers";

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

async function openCustomerDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    throw new Error("IndexedDB is not available");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CUSTOMER_CACHE_DB, CUSTOMER_CACHE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CUSTOMER_STORE)) {
        db.createObjectStore(CUSTOMER_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function withCustomerStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  const db = await openCustomerDb();

  try {
    const tx = db.transaction(CUSTOMER_STORE, mode);
    const store = tx.objectStore(CUSTOMER_STORE);
    const value = await handler(store);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });

    return value;
  } finally {
    db.close();
  }
}

async function saveCustomersToCache(customers: Customer[]): Promise<void> {
  if (!hasIndexedDb()) return;

  await withCustomerStore("readwrite", async (store) => {
    // Clear existing cache
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add all customers
    for (const customer of customers) {
      await new Promise<void>((resolve, reject) => {
        const putRequest = store.put(customer);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      });
    }
  });
}

async function loadCustomersFromCache(): Promise<Customer[]> {
  if (!hasIndexedDb()) return [];

  return withCustomerStore("readonly", async (store) => {
    const request = store.getAll();
    return new Promise<Customer[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as Customer[]);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function loadCustomers(): Promise<Customer[]> {
  // Try to fetch from API first
  if (isOnline()) {
    try {
      const response = await api.customers.get();
      const customers = extractData(response, "Failed to load customers");
      
      // Save to cache for offline use
      await saveCustomersToCache(customers);
      
      return customers;
    } catch (error) {
      // If API fails, fall back to cache
      console.warn("Failed to fetch customers from API, using cache", error);
      const cached = await loadCustomersFromCache();
      if (cached.length > 0) {
        return cached;
      }
      throw error;
    }
  }
  
  // Offline: return from cache
  const cached = await loadCustomersFromCache();
  return cached;
}

export async function loadProducts(): Promise<Product[]> {
  const { data, error } = await api.products.get();
  if (error) throw new Error(String(error.value));
  const response = data as unknown as { success: boolean; data: Product[] };
  return response?.data || [];
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
