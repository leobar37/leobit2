/**
 * Purchases Hook - Service-based
 * Reactively fetch and mutate purchases using PGlite services
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePurchaseService } from "~/lib/sync/service-provider";
import type {
  Purchase,
  PurchaseStatus,
  CreatePurchaseInput,
  CreatePurchaseItemInput,
} from "~/lib/services/purchase-service";

const QUERY_KEYS = {
  purchases: ["purchases-new"],
  purchase: (id: string) => ["purchases-new", id],
  bySupplier: (supplierId: string) => ["purchases-new", "supplier", supplierId],
  byStatus: (status: PurchaseStatus) => ["purchases-new", "status", status],
} as const;

/**
 * Get all purchases for the current business
 */
export function usePurchases() {
  const purchaseService = usePurchaseService();

  return useQuery({
    queryKey: QUERY_KEYS.purchases,
    queryFn: async (): Promise<Purchase[]> => {
      return purchaseService.findByBusiness();
    },
  });
}

/**
 * Get a single purchase by ID
 */
export function usePurchase(id: string | null) {
  const purchaseService = usePurchaseService();

  return useQuery({
    queryKey: id ? QUERY_KEYS.purchase(id) : ["purchases-new", "detail"],
    queryFn: async (): Promise<Purchase | null> => {
      if (!id) return null;
      return purchaseService.findById(id);
    },
    enabled: !!id,
  });
}

/**
 * Get purchases by supplier
 */
export function usePurchasesBySupplier(supplierId: string) {
  const purchaseService = usePurchaseService();

  return useQuery({
    queryKey: QUERY_KEYS.bySupplier(supplierId),
    queryFn: async (): Promise<Purchase[]> => {
      return purchaseService.findBySupplier(supplierId);
    },
    enabled: !!supplierId,
  });
}

/**
 * Get purchases by status
 */
export function usePurchasesByStatus(status: PurchaseStatus) {
  const purchaseService = usePurchaseService();

  return useQuery({
    queryKey: QUERY_KEYS.byStatus(status),
    queryFn: async (): Promise<Purchase[]> => {
      return purchaseService.findByBusiness();
    },
    select: (data: Purchase[]) => data.filter((p) => p.status === status),
  });
}

/**
 * Create a new purchase
 */
export function useCreatePurchase() {
  const purchaseService = usePurchaseService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePurchaseInput): Promise<Purchase> => {
      return purchaseService.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchases });
      queryClient.invalidateQueries({ queryKey: ["purchases-new", "supplier"] });
    },
  });
}

/**
 * Update purchase status
 */
export function useUpdatePurchaseStatus() {
  const purchaseService = usePurchaseService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: PurchaseStatus;
    }): Promise<void> => {
      return purchaseService.updateStatus(id, status);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.purchase(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchases });
      queryClient.invalidateQueries({
        queryKey: ["purchases-new", "status"],
      });
    },
  });
}

/**
 * Delete a purchase
 */
export function useDeletePurchase() {
  const purchaseService = usePurchaseService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return purchaseService.delete(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchase(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchases });
      queryClient.invalidateQueries({
        queryKey: ["purchases-new", "supplier"],
      });
      queryClient.invalidateQueries({
        queryKey: ["purchases-new", "status"],
      });
    },
  });
}

/**
 * Update a purchase item
 */
export function useUpdatePurchaseItem() {
  const purchaseService = usePurchaseService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchaseId,
      itemId,
      data,
    }: {
      purchaseId: string;
      itemId: string;
      data: {
        quantity?: number;
        unitCost?: number;
        totalCost?: number;
      };
    }): Promise<void> => {
      return purchaseService.updateItem(purchaseId, itemId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.purchase(variables.purchaseId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchases });
    },
  });
}

/**
 * Delete a purchase item
 */
export function useDeletePurchaseItem() {
  const purchaseService = usePurchaseService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchaseId,
      itemId,
    }: {
      purchaseId: string;
      itemId: string;
    }): Promise<void> => {
      return purchaseService.deleteItem(purchaseId, itemId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.purchase(variables.purchaseId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchases });
    },
  });
}

/**
 * Add an item to an existing purchase
 */
export function useAddPurchaseItem() {
  const purchaseService = usePurchaseService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchaseId,
      item,
    }: {
      purchaseId: string;
      item: CreatePurchaseItemInput;
    }): Promise<void> => {
      return purchaseService.addItemToPurchase(purchaseId, item);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.purchase(variables.purchaseId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchases });
    },
  });
}
