import { useQuery } from "@tanstack/react-query";
import { useLiveQuery, eq, ilike } from "@tanstack/react-db";
import { customerCollection } from "~/lib/db/collections/customer.collection";
import { api } from "~/lib/api-client";
import { useBusiness } from "./use-business";
import { generateId } from "~/lib/utils";

const CUSTOMERS_QUERY_KEY = "customers";

async function fetchCustomersFromAPI(searchQuery?: string) {
  console.log('[fetchCustomersFromAPI] Fetching customers from API, search:', searchQuery);
  const { data, error } = await api.customers.get({
    query: searchQuery ? { search: searchQuery } : undefined,
  });
  
  if (error) {
    console.error('[fetchCustomersFromAPI] Error:', error);
    throw new Error(String(error.value));
  }
  
  console.log('[fetchCustomersFromAPI] Received', data?.data?.length || 0, 'customers');
  return data?.data || [];
}

export function useCustomers(searchQuery?: string) {
  const { data: business, isLoading: isBusinessLoading } = useBusiness();
  const businessId = business?.id;
  const pendingBusinessId = "__pending_business__";

  // First: Load from API (immediate data)
  const apiQuery = useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, "api", businessId, searchQuery],
    queryFn: () => fetchCustomersFromAPI(searchQuery),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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

  // Use live data if available, fall back to API data
  const data = liveQuery.data?.length ? liveQuery.data : (apiQuery.data || []);
  const isLoading = isBusinessLoading || (apiQuery.isLoading && !liveQuery.data?.length);

  console.log('[useCustomers] businessId:', businessId, 'apiData:', apiQuery.data?.length, 'liveData:', liveQuery.data?.length, 'finalData:', data?.length);

  return {
    data: businessId ? data : [],
    isLoading,
    isError: apiQuery.isError,
    error: apiQuery.error,
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

  return async (data: {
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
      businessId: businessId || "", // Will be validated/overwritten by API
      syncStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return id;
  };
}

// Update a customer
export function useUpdateCustomer() {
  return async (id: string, data: Partial<{
    name: string;
    dni: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
  }>) => {
    await customerCollection.update(id, (draft) => {
      if (data.name !== undefined) draft.name = data.name;
      if (data.dni !== undefined) draft.dni = data.dni;
      if (data.phone !== undefined) draft.phone = data.phone;
      if (data.address !== undefined) draft.address = data.address;
      if (data.notes !== undefined) draft.notes = data.notes;
      draft.updatedAt = new Date();
    });
  };
}

// Delete a customer
export function useDeleteCustomer() {
  return async (id: string) => {
    await customerCollection.delete(id);
  };
}
