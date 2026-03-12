import { useMutation } from "@tanstack/react-query";
import { useLiveQuery, eq, ilike } from "@tanstack/react-db";
import { customerCollection } from "~/lib/db/collections/customer.collection";
import { useBusiness } from "./use-business";
import { generateId } from "~/lib/utils";
import { getStoredBusinessId } from "~/lib/session-storage";

const isCustomersDebugEnabled = import.meta.env.DEV;

function debugCustomers(message: string, payload?: unknown) {
  if (!isCustomersDebugEnabled) return;

  if (payload === undefined) {
    console.log(`[LiveCustomers] ${message}`);
    return;
  }

  console.log(`[LiveCustomers] ${message}`, payload);
}

export function useCustomers(searchQuery?: string) {
  const { data: business, isLoading: isBusinessLoading } = useBusiness();
  const businessId = business?.id || getStoredBusinessId();
  const pendingBusinessId = "__pending_business__";

  // Then: Subscribe to live updates (real-time sync)
  const liveQuery = useLiveQuery(
    (q) => {
      let query = q
        .from({ customer: customerCollection })
        .where(({ customer }) => eq(customer.businessId, businessId ?? pendingBusinessId));

      if (searchQuery) {
        query = query.where(({ customer }) =>
          ilike(customer.name, `%${searchQuery}%`)
        );
      }

      return query.orderBy(({ customer }) => customer.name, "asc");
    },
    [businessId, searchQuery]
  );

  const data = businessId ? liveQuery.data ?? [] : [];
  const isLoading = isBusinessLoading;

  debugCustomers("Resolved customer collection", {
    businessId,
    searchQuery,
    liveData: liveQuery.data?.length ?? 0,
    finalData: data.length,
  });

  return {
    data,
    isLoading,
    isError: false,
    error: null,
  };
}

// Get a single customer by ID
export function useCustomer(id: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ customer: customerCollection })
        .where(({ customer }) => eq(customer.id, id)),
    [id]
  );
}

// Create a new customer
export function useCreateCustomer() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  return useMutation({
    mutationFn: async (data: {
      name: string;
      dni?: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => {
      const id = generateId();

      await customerCollection.insert({
        id,
        name: data.name,
        dni: data.dni || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        businessId: businessId || "",
        syncStatus: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return id;
    },
  });
}

// Update a customer
export function useUpdateCustomer() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        name: string;
        dni: string | null;
        phone: string | null;
        address: string | null;
        notes: string | null;
      }>;
    }) => {
      await customerCollection.update(id, (draft) => {
        if (data.name !== undefined) draft.name = data.name;
        if (data.dni !== undefined) draft.dni = data.dni;
        if (data.phone !== undefined) draft.phone = data.phone;
        if (data.address !== undefined) draft.address = data.address;
        if (data.notes !== undefined) draft.notes = data.notes;
        draft.updatedAt = new Date();
      });
    },
  });
}

// Delete a customer
export function useDeleteCustomer() {
  return useMutation({
    mutationFn: async (id: string) => {
      await customerCollection.delete(id);
    },
  });
}
