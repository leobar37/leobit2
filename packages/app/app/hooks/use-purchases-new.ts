/**
 * Purchases Hook
 * Reactively fetch and mutate purchases using PGlite + ElectricSQL
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, and, gte, desc } from "drizzle-orm";
import { getDatabase } from "~/engine";
import {
  purchases,
  purchaseItems,
  type Purchase,
  type PurchaseItem,
  PurchaseStatus,
} from "~/engine/schema";
import { pushWrite } from "~/engine/write-engine";

const PURCHASES_QUERY_KEY = "purchases";

interface PurchaseFilters {
  businessId: string;
  supplierId?: string;
  status?: string;
  startDate?: Date;
}

/**
 * Get purchases with optional filters
 */
export function usePurchases(filters: PurchaseFilters) {
  const { businessId, supplierId, status, startDate } = filters;

  return useQuery({
    queryKey: [PURCHASES_QUERY_KEY, filters],
    queryFn: async () => {
      const { db } = getDatabase();

      let query = db
        .select()
        .from(purchases)
        .where(eq(purchases.businessId, businessId));

      if (supplierId) {
        query = query.where(eq(purchases.supplierId, supplierId));
      }

      if (status) {
        query = query.where(eq(purchases.status, status));
      }

      if (startDate) {
        query = query.where(gte(purchases.purchaseDate, startDate));
      }

      return query.orderBy(desc(purchases.purchaseDate));
    },
    enabled: !!businessId,
  });
}

/**
 * Get a single purchase with items
 */
export function usePurchase(id: string | null) {
  return useQuery({
    queryKey: [PURCHASES_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { db } = getDatabase();

      const [purchaseResult, itemsResult] = await Promise.all([
        db.select().from(purchases).where(eq(purchases.id, id)).limit(1),
        db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)),
      ]);

      if (!purchaseResult[0]) return null;

      return {
        ...purchaseResult[0],
        items: itemsResult,
      };
    },
    enabled: !!id,
  });
}

interface PurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  quantity: number;
  unitCost: number;
}

interface CreatePurchaseInput {
  businessId: string;
  supplierId: string;
  purchaseDate: string;
  totalAmount: number;
  invoiceNumber?: string;
  receiptImageId?: string;
  notes?: string;
  items: PurchaseItemInput[];
}

/**
 * Create a new purchase
 */
export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePurchaseInput) => {
      const result = await pushWrite("/api/purchases", "POST", input);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PURCHASES_QUERY_KEY] });
    },
  });
}

/**
 * Mark purchase as received
 */
export function useReceivePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await pushWrite(
        `/api/purchases/${id}/receive`,
        "POST",
        null
      );
      return result;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [PURCHASES_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [PURCHASES_QUERY_KEY] });
    },
  });
}

/**
 * Cancel a purchase
 */
export function useCancelPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await pushWrite(
        `/api/purchases/${id}/cancel`,
        "POST",
        null
      );
      return result;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [PURCHASES_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [PURCHASES_QUERY_KEY] });
    },
  });
}

/**
 * Delete a pending purchase
 */
export function useDeletePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await pushWrite(`/api/purchases/${id}`, "DELETE", null);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PURCHASES_QUERY_KEY] });
    },
  });
}
