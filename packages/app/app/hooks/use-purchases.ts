/**
 * Purchases Hook - Service-based
 * Reactively fetch and mutate purchases using PGlite services
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePurchaseService } from "~/lib/sync/engine-provider";
import type {
  Purchase,
  PurchaseWithItems,
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
    queryFn: async (): Promise<PurchaseWithItems | null> => {
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
 * Create a draft purchase (for immediate editing)
 */
export function useCreateDraftPurchase() {
  const purchaseService = usePurchaseService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input?: CreatePurchaseInput): Promise<Purchase> => {
      return purchaseService.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchases });
      queryClient.invalidateQueries({ queryKey: ["purchases-new", "drafts"] });
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
 * Update a purchase item (for editing confirmed purchases)
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
      return purchaseService.updateItemInPurchase(purchaseId, itemId, data);
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
 * Add an item to an existing purchase (for editing confirmed purchases)
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

/**
 * Remove an item from a purchase (for editing confirmed purchases)
 */
export function useRemovePurchaseItem() {
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
      return purchaseService.deleteItemFromPurchase(purchaseId, itemId);
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
 * Get all drafts for the current business
 */
export function usePurchaseDrafts() {
  const purchaseService = usePurchaseService();

  return useQuery({
    queryKey: ["purchases-new", "drafts"],
    queryFn: async (): Promise<Purchase[]> => {
      return purchaseService.findDrafts();
    },
  });
}

/**
 * Update a purchase (any field)
 */
export function useUpdatePurchase() {
  const purchaseService = usePurchaseService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof purchaseService.update>[1];
    }): Promise<void> => {
      return purchaseService.update(id, input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.purchase(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchases });
    },
  });
}
