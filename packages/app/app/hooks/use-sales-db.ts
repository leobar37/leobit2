/**
 * Sales Hooks - Clean, Scalable Pattern
 *
 * Principle: "Draft" is just a status, not a separate feature.
 * All operations work with any sale status.
 */
import { useMemo } from "react";
import { useLiveQuery, eq, and, gte } from "@tanstack/react-db";
import { saleCollection } from "~/lib/db/collections/sale.collection";
import { saleItemCollection } from "~/lib/db/collections/sale-item.collection";
import { customerCollection } from "~/lib/db/collections/customer.collection";
import { useBusiness } from "./use-business";
import { generateId } from "~/lib/utils";
import { handleCollectionError } from "~/lib/db/error-handler";
import type { Sale, SaleItem, CreateSaleInput, SaleStatus } from "~/lib/db/schemas/sale";

// ============================================
// QUERIES (Live Queries with TanStack DB)
// ============================================

interface SaleFilters {
  status?: SaleStatus;
  sellerId?: string;
  businessId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Query sales with optional filters
 * Works for any status: draft, active, confirmed, delivered, cancelled
 */
export function useSales(filters?: SaleFilters) {
  const { data: business } = useBusiness();

  // Memoize the effective business ID to prevent unnecessary re-renders
  const effectiveBusinessId = useMemo(() =>
    filters?.businessId || business?.id,
    [filters?.businessId, business?.id]
  );

  // Memoize filter values to prevent infinite loops when objects are recreated
  const filterDeps = useMemo(() => ({
    businessId: effectiveBusinessId,
    sellerId: filters?.sellerId,
    status: filters?.status,
    // Convert dates to timestamps for stable comparison
    startDate: filters?.startDate?.getTime(),
    endDate: filters?.endDate?.getTime(),
  }), [effectiveBusinessId, filters?.sellerId, filters?.status, filters?.startDate, filters?.endDate]);

  const result = useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .join(
          { customer: customerCollection },
          ({ sale, customer }) => eq(sale.customerId, customer.id),
          "left"
        )
        .orderBy(({ sale }) => sale.createdAt, "desc"),
    [filterDeps]
  );
  console.log("result", result.data)
  // Map the joined customer to the customer property
  return {
    ...result,
    data: result.data?.map((item: any) => ({
      ...item.sale,
      customer: item.customer,
    })),
  };
}

/**
 * Get a single sale by ID
 */
export function useSale(saleId: string | null) {
  const result = useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .join(
          { customer: customerCollection },
          ({ sale, customer }) => eq(sale.customerId, customer.id),
          "left"
        )
        .where(({ sale }) => saleId ? eq(sale.id, saleId) : eq(sale.id, "")),
    [saleId]
  );

  // Map the joined customer to the customer property
  return {
    ...result,
    data: result.data?.map((item: any) => ({
      ...item.sale,
      customer: item.customer,
    })),
  };
}

/**
 * Get items for a specific sale
 */
export function useSaleItems(saleId: string | null) {
  return useLiveQuery(
    (q) =>
      q
        .from({ item: saleItemCollection })
        .where(({ item }) => saleId ? eq(item.saleId, saleId) : eq(item.saleId, "")),
    [saleId]
  );
}

// ============================================
// MUTATIONS (CRUD Operations)
// ============================================

/**
 * Create a new sale with any status (draft, active, etc.)
 */
export function useCreateSale() {
  return async (input: CreateSaleInput & { status?: SaleStatus; businessId: string; sellerId: string }) => {
    try {
      const saleId = generateId();

      await saleCollection.insert({
        id: saleId,
        businessId: input.businessId,
        sellerId: input.sellerId,
        customerId: input.customerId || null,
        type: input.type || "instant_sale",
        saleType: input.saleType,
        totalAmount: input.totalAmount?.toFixed?.(2) || "0",
        amountPaid: input.amountPaid?.toFixed?.(2) || "0",
        balanceDue: (input.totalAmount - (input.amountPaid || 0)).toFixed(2),
        tara: input.tara?.toString() || null,
        netWeight: input.netWeight?.toString() || null,
        status: input.status || "draft",
        syncStatus: "pending",
        saleDate: new Date(),
        createdAt: new Date(),
      });

      return saleId;
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

/**
 * Update any sale field
 */
export function useUpdateSale() {
  return async (saleId: string, changes: Partial<Sale>) => {
    try {
      await saleCollection.update(saleId, (draft) => {
        Object.assign(draft, changes);
      });
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

/**
 * Delete a sale and all its items
 */
export function useDeleteSale() {
  return async (saleId: string) => {
    try {
      // Delete all items first
      const items = await saleItemCollection.findMany(eq(saleItemCollection.schema.saleId, saleId));
      for (const item of items) {
        await saleItemCollection.delete(item.id);
      }
      // Delete the sale
      await saleCollection.delete(saleId);
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

/**
 * Add an item to a sale
 */
export function useAddSaleItem() {
  return async (saleId: string, item: Omit<SaleItem, "id" | "saleId">) => {
    try {
      const itemId = generateId();
      await saleItemCollection.insert({
        id: itemId,
        saleId,
        ...item,
      });
      return itemId;
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

/**
 * Remove an item from a sale
 */
export function useRemoveSaleItem() {
  return async (itemId: string) => {
    try {
      await saleItemCollection.delete(itemId);
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

/**
 * Update an item
 */
export function useUpdateSaleItem() {
  return async (itemId: string, changes: Partial<SaleItem>) => {
    try {
      await saleItemCollection.update(itemId, (draft) => {
        Object.assign(draft, changes);
      });
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

// ============================================
// CONVENIENCE EXPORTS (Backward Compatibility)
// ============================================

/** @deprecated Use useSales({ status: "draft" }) instead */
export const useDraftSales = (sellerId: string) => useSales({ status: "draft", sellerId });

/** @deprecated Use useSale(saleId) instead */
export const useDraftSale = (saleId: string | null) => useSale(saleId);

/** @deprecated Use useCreateSale() with status: "draft" instead */
export const useCreateDraftSale = useCreateSale;

/** @deprecated Use useUpdateSale() instead */
export const useUpdateDraftSale = useUpdateSale;

/** @deprecated Use useDeleteSale() instead */
export const useDeleteDraftSale = useDeleteSale;

/** @deprecated Use useUpdateSale() with { status: "active" } instead */
export function useConfirmSale() {
  const updateSale = useUpdateSale();
  return async (saleId: string) => updateSale(saleId, { status: "active" });
}

/** @deprecated Use useUpdateSale() with { status: "cancelled" } instead */
export function useCancelSale() {
  const updateSale = useUpdateSale();
  return async (saleId: string, reason?: string) =>
    updateSale(saleId, { status: "cancelled", cancelReason: reason });
}

// ============================================
// STATS & REPORTS
// ============================================

export function useTodaySales() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  // Memoize filters to prevent infinite re-renders
  const filters = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      businessId,
      status: "active" as const,
      startDate: today,
    };
  }, [businessId]);

  return useSales(filters);
}

export function useTodaySalesStats() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  // Memoize filters to prevent infinite re-renders
  const filters = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      businessId,
      status: "active" as const,
      startDate: today,
    };
  }, [businessId]);

  const { data: sales } = useSales(filters);

  // Memoize stats calculation
  const stats = useMemo(() => {
    if (!sales) return { count: 0, total: "0.00" };
    const result = sales.reduce(
      (acc, sale) => ({
        count: acc.count + 1,
        total: acc.total + Number(sale.totalAmount),
      }),
      { count: 0, total: 0 }
    );
    return {
      count: result.count,
      total: result.total.toFixed(2),
    };
  }, [sales]);

  return {
    data: stats,
    isLoading: !sales,
  };
}
