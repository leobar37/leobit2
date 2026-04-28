/**
 * Purchases Hook - API-based
 * Reactively fetch and mutate purchases using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

/** Purchase status type (API only supports pending, received, cancelled) */
export type PurchaseStatus = "pending" | "received" | "cancelled";

/** Purchase entity */
export interface Purchase {
  id: string;
  businessId: string;
  supplierId: string | null;
  purchaseDate: string | null;
  totalAmount: string;
  status: PurchaseStatus;
  invoiceNumber: string | null;
  receiptImageId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
  syncAttempts?: number;
  syncStatus?: string;
}

/** Purchase item */
export interface PurchaseItem {
  id: string;
  businessId: string;
  purchaseId: string;
  productId: string;
  variantId: string | null;
  unitId: string | null;
  quantity: string;
  unitCost: string;
  totalCost: string;
  createdAt: Date;
  updatedAt: Date;
  productName?: string;
  variantName?: string;
}

/** Purchase with its items */
export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
}

/** Input for creating a purchase item */
export interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  packs?: number;
  quantity: number;
  unitCost: number;
}

/** Input for creating a purchase */
export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber?: string;
  receiptImageId?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

/**
 * Get all purchases for the current business
 */
export function usePurchases() {
  return useQuery({
    queryKey: queryKeys.purchases.all,
    queryFn: async (): Promise<Purchase[]> => {
      const response = await api.purchases.get();
      return extractData(response) as unknown as Purchase[];
    },
  });
}

/**
 * Get a single purchase by ID
 */
export function usePurchase(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.purchases.detail(id) : ["purchases", "detail"],
    queryFn: async (): Promise<PurchaseWithItems | null> => {
      if (!id) return null;
      const response = await api.purchases({ id }).get();
      return extractData(response) as unknown as PurchaseWithItems;
    },
    enabled: !!id,
  });
}

/**
 * Get purchases by supplier
 */
export function usePurchasesBySupplier(supplierId: string) {
  return useQuery({
    queryKey: queryKeys.purchases.bySupplier(supplierId),
    queryFn: async (): Promise<Purchase[]> => {
      const response = await api.purchases.get({
        query: { supplierId },
      });
      return extractData(response) as unknown as Purchase[];
    },
    enabled: !!supplierId,
  });
}

/**
 * Get purchases by status
 */
export function usePurchasesByStatus(status: PurchaseStatus) {
  return useQuery({
    queryKey: queryKeys.purchases.byStatus(status),
    queryFn: async (): Promise<Purchase[]> => {
      const response = await api.purchases.get({
        query: { status },
      });
      return extractData(response) as unknown as Purchase[];
    },
  });
}

/**
 * Create a new purchase
 */
export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePurchaseInput): Promise<Purchase> => {
      const response = await api.purchases.post(input as any);
      return extractData(response) as unknown as Purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      queryClient.invalidateQueries({ queryKey: ["purchases", "supplier"] });
    },
  });
}

/**
 * Create a draft purchase (for immediate editing)
 * @deprecated The API does not support draft purchases. Use useCreatePurchase instead.
 */
export function useCreateDraftPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_input?: CreatePurchaseInput): Promise<Purchase> => {
      throw new Error("Draft purchases are not supported by the API. Use useCreatePurchase instead.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      queryClient.invalidateQueries({ queryKey: ["purchases", "drafts"] });
    },
  });
}

/**
 * Update purchase status
 */
export function useUpdatePurchaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: PurchaseStatus;
    }): Promise<void> => {
      const response = await api.purchases({ id }).status.put({ status } as any);
      extractData(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchases.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      queryClient.invalidateQueries({ queryKey: ["purchases", "status"] });
    },
  });
}

/**
 * Delete a purchase
 */
export function useDeletePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api.purchases({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      queryClient.invalidateQueries({ queryKey: ["purchases", "supplier"] });
      queryClient.invalidateQueries({ queryKey: ["purchases", "status"] });
    },
  });
}

/**
 * Update a purchase item (for editing confirmed purchases)
 * @deprecated The API does not support individual item operations.
 */
export function useUpdatePurchaseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_: {
      purchaseId: string;
      itemId: string;
      data: {
        quantity?: number;
        unitCost?: number;
        totalCost?: number;
      };
    }): Promise<void> => {
      throw new Error("Individual purchase item operations are not supported by the API.");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchases.detail(variables.purchaseId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
    },
  });
}

/**
 * Add an item to an existing purchase (for editing confirmed purchases)
 * @deprecated The API does not support individual item operations.
 */
export function useAddPurchaseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_: {
      purchaseId: string;
      item: CreatePurchaseItemInput;
    }): Promise<void> => {
      throw new Error("Individual purchase item operations are not supported by the API.");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchases.detail(variables.purchaseId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
    },
  });
}

/**
 * Remove an item from a purchase (for editing confirmed purchases)
 * @deprecated The API does not support individual item operations.
 */
export function useRemovePurchaseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_: {
      purchaseId: string;
      itemId: string;
    }): Promise<void> => {
      throw new Error("Individual purchase item operations are not supported by the API.");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchases.detail(variables.purchaseId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
    },
  });
}

/**
 * Get all drafts for the current business
 * @deprecated The API does not support draft purchases.
 */
export function usePurchaseDrafts() {
  return useQuery({
    queryKey: ["purchases", "drafts"],
    queryFn: async (): Promise<Purchase[]> => {
      return [];
    },
  });
}

/**
 * Update a purchase (any field)
 * @deprecated The API only supports status updates. Use useUpdatePurchaseStatus instead.
 */
export function useUpdatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_: {
      id: string;
      input: Partial<CreatePurchaseInput>;
    }): Promise<void> => {
      throw new Error("Full purchase updates are not supported by the API. Use useUpdatePurchaseStatus instead.");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchases.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
    },
  });
}
