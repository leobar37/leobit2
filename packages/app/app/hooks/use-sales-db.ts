import { useLiveQuery, eq, and, gte } from "@tanstack/react-db";
import { saleCollection } from "~/lib/db/collections/sale.collection";
import { saleItemCollection } from "~/lib/db/collections/sale-item.collection";
import { customerCollection } from "~/lib/db/collections/customer.collection";
import { useBusiness } from "./use-business";
import { generateId } from "~/lib/utils";
import { handleCollectionError } from "~/lib/db/error-handler";
import type { CreateSaleInput } from "~/lib/db/schemas/sale";
import type { SaleItem } from "~/lib/db/schemas/sale";

// Get today's sales with customer info (real-time JOIN)
export function useTodaySales() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .join(
          { customer: customerCollection },
          ({ sale, customer }) => eq(sale.clientId, customer.id),
          "left"
        )
        .where(({ sale }) =>
          and(
            eq(sale.businessId, businessId),
            gte(
              sale.saleDate,
              new Date(new Date().setHours(0, 0, 0, 0))
            )
          )
        )
        .orderBy(({ sale }) => sale.saleDate, "desc"),
    [businessId]
  );
}

// Get a specific sale by ID
export function useSale(saleId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) => eq(sale.id, saleId)),
    [saleId]
  );
}

// Get sale with customer details
export function useSaleWithCustomer(saleId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .join(
          { customer: customerCollection },
          ({ sale, customer }) => eq(sale.clientId, customer.id),
          "left"
        )
        .where(({ sale }) => eq(sale.id, saleId))
        .select(({ sale, customer }) => ({
          ...sale,
          customerName: customer?.name,
          customerPhone: customer?.phone,
        })),
    [saleId]
  );
}

// Get items for a specific sale (ATOMIC)
export function useSaleItems(saleId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ item: saleItemCollection })
        .where(({ item }) => eq(item.saleId, saleId)),
    [saleId]
  );
}

// Create a new sale (header only, no items)
export function useCreateSale() {
  return async (input: CreateSaleInput) => {
    try {
      const saleId = generateId();

      // Insert only the header - items are added separately
      await saleCollection.insert({
        id: saleId,
        businessId: "", // Filled from context by API
        clientId: input.clientId || null,
        sellerId: "", // Filled from context by API
        orderId: null,
        saleType: input.saleType,
        totalAmount: input.totalAmount.toFixed(2),
        amountPaid: input.amountPaid.toFixed(2),
        balanceDue: (input.totalAmount - input.amountPaid).toFixed(2),
        tara: input.tara?.toString() || null,
        netWeight: input.netWeight?.toString() || null,
        syncStatus: "pending",
        status: "active",
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

// Add an item to a sale (ATOMIC)
export function useAddSaleItem() {
  return async ({
    saleId,
    item,
  }: {
    saleId: string;
    item: Omit<SaleItem, "id" | "saleId">;
  }) => {
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

// Remove an item from a sale (ATOMIC)
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

// Cancel a sale
export function useCancelSale() {
  return async (saleId: string, reason: string) => {
    try {
      await saleCollection.update(saleId, (draft) => {
        draft.status = "cancelled";
        draft.cancelReason = reason;
      });
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

// ============================================
// DRAFT SALES OPERATIONS
// ============================================

// Create a new draft sale (works offline)
export function useCreateDraftSale() {
  return async (input: {
    businessId: string;
    sellerId: string;
    clientId?: string;
    saleType?: "contado" | "credito";
    paymentMode?: "pago_total" | "a_cuenta" | "debe_todo";
    amountPaid?: string;
  }) => {
    try {
      const saleId = generateId();

      await saleCollection.insert({
        id: saleId,
        businessId: input.businessId,
        sellerId: input.sellerId,
        clientId: input.clientId || null,
        orderId: null,
        saleType: input.saleType || "contado",
        totalAmount: "0",
        amountPaid: input.amountPaid || "0",
        balanceDue: "0",
        tara: null,
        netWeight: null,
        syncStatus: "pending",
        status: "draft",
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

// Get all draft sales for a seller
export function useDraftSales(sellerId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) =>
          and(
            eq(sale.sellerId, sellerId),
            eq(sale.status, "draft")
          )
        )
        .orderBy(({ sale }) => sale.createdAt, "desc"),
    [sellerId]
  );
}

// Get a specific draft sale
export function useDraftSale(saleId: string | null) {
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) =>
          and(
            saleId ? eq(sale.id, saleId) : eq(sale.id, ""),
            eq(sale.status, "draft")
          )
        )
        .limit(1),
    [saleId]
  );
}

// Update a draft sale
export function useUpdateDraftSale() {
  return async (saleId: string, changes: {
    clientId?: string | null;
    saleType?: "contado" | "credito";
    totalAmount?: string;
    amountPaid?: string;
    balanceDue?: string;
    tara?: string | null;
    netWeight?: string | null;
  }) => {
    try {
      await saleCollection.update(saleId, (draft) => {
        if (changes.clientId !== undefined) draft.clientId = changes.clientId;
        if (changes.saleType !== undefined) draft.saleType = changes.saleType;
        if (changes.totalAmount !== undefined) draft.totalAmount = changes.totalAmount;
        if (changes.amountPaid !== undefined) draft.amountPaid = changes.amountPaid;
        if (changes.balanceDue !== undefined) draft.balanceDue = changes.balanceDue;
        if (changes.tara !== undefined) draft.tara = changes.tara;
        if (changes.netWeight !== undefined) draft.netWeight = changes.netWeight;
      });
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

// Confirm a draft sale (convert to active)
export function useConfirmSale() {
  return async (saleId: string) => {
    try {
      await saleCollection.update(saleId, (draft) => {
        draft.status = "active";
      });
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

// Delete a draft sale
export function useDeleteDraftSale() {
  return async (saleId: string) => {
    try {
      // First delete all items
      const { data: items } = useSaleItems(saleId);
      if (items) {
        for (const item of items) {
          await saleItemCollection.delete(item.id);
        }
      }
      // Then delete the sale
      await saleCollection.delete(saleId);
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

// Get sales stats for today
export function useTodaySalesStats() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  const { data: sales } = useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) =>
          and(
            eq(sale.businessId, businessId),
            eq(sale.status, "active"),
            gte(
              sale.saleDate,
              new Date(new Date().setHours(0, 0, 0, 0))
            )
          )
        ),
    [businessId]
  );

  // Calculate stats in JS
  const stats = sales?.reduce(
    (acc, sale) => ({
      count: acc.count + 1,
      total: acc.total + Number(sale.totalAmount),
    }),
    { count: 0, total: 0 }
  ) || { count: 0, total: 0 };

  return {
    data: {
      count: stats.count,
      total: stats.total.toFixed(2),
    },
    isLoading: !sales,
  };
}
