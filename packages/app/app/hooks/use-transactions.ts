import { useLiveQuery } from "@electric-sql/react";
import {
  saleCollection,
  saleItemCollection,
} from "~/lib/db/collections/sale.collection";
import { useBusinessStore } from "~/stores/business-store";
import { useAuthStore } from "~/stores/auth-store";
import { api } from "~/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { startOfDay, endOfDay } from "date-fns";
import { and, eq, gte, lte, isNull, isNotNull } from "@electric-sql/react";
import type { SaleStatus } from "~/lib/db/schemas/sale";

// List transactions with filters
export function useTransactions(filters?: {
  status?: SaleStatus;
  isOrder?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  const businessId = useBusinessStore((state) => state.businessId);
  
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) => {
          const conditions = [eq(sale.businessId, businessId)];
          
          if (filters?.status) {
            conditions.push(eq(sale.status, filters.status));
          }
          
          if (filters?.isOrder === true) {
            conditions.push(isNotNull(sale.deliveryDate));
          } else if (filters?.isOrder === false) {
            conditions.push(isNull(sale.deliveryDate));
          }
          
          if (filters?.startDate) {
            conditions.push(gte(sale.saleDate, filters.startDate));
          }
          
          if (filters?.endDate) {
            conditions.push(lte(sale.saleDate, filters.endDate));
          }
          
          return and(...conditions);
        })
        .orderBy(({ sale }) => sale.createdAt, "desc"),
    [businessId, filters]
  );
}

// Get single transaction with items
export function useTransaction(id: string) {
  const sale = useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) => eq(sale.id, id))
        .limit(1),
    [id]
  );

  const items = useLiveQuery(
    (q) =>
      q
        .from({ item: saleItemCollection })
        .where(({ item }) => eq(item.saleId, id)),
    [id]
  );

  return {
    sale: sale?.[0],
    items,
    isLoading: sale === undefined || items === undefined,
  };
}

// Get today's instant sales
export function useTodayTransactions() {
  const businessId = useBusinessStore((state) => state.businessId);
  const today = new Date();
  
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) =>
          and(
            eq(sale.businessId, businessId),
            eq(sale.status, "active"),
            isNull(sale.deliveryDate),
            gte(sale.saleDate, startOfDay(today)),
            lte(sale.saleDate, endOfDay(today))
          )
        )
        .orderBy(({ sale }) => sale.saleDate, "desc"),
    [businessId, today]
  );
}

// Get orders (with delivery date)
export function useOrders(deliveryDate?: Date) {
  const businessId = useBusinessStore((state) => state.businessId);
  
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) => {
          const conditions = [
            eq(sale.businessId, businessId),
            isNotNull(sale.deliveryDate),
          ];
          
          if (deliveryDate) {
            conditions.push(
              gte(sale.deliveryDate, startOfDay(deliveryDate)),
              lte(sale.deliveryDate, endOfDay(deliveryDate))
            );
          }
          
          return and(...conditions);
        })
        .orderBy(({ sale }) => sale.deliveryDate, "asc"),
    [businessId, deliveryDate]
  );
}

// Get draft transactions
export function useDraftTransactions() {
  const sellerId = useAuthStore((state) => state.user?.id);
  
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) =>
          and(
            eq(sale.sellerId, sellerId || ""),
            eq(sale.status, "draft")
          )
        )
        .orderBy(({ sale }) => sale.createdAt, "desc"),
    [sellerId]
  );
}

// Confirm transaction (draft -> active/confirmed)
export function useConfirmTransaction() {
  return useMutation({
    mutationFn: async (saleId: string) => {
      await saleCollection.update(saleId, (draft) => {
        draft.status = draft.deliveryDate ? "confirmed" : "active";
      });
    },
  });
}

// Deliver order (confirmed -> delivered)
export function useDeliverTransaction() {
  return async (
    saleId: string,
    deliveredItems: Array<{
      itemId: string;
      deliveredQuantity: number;
      unitPriceFinal?: number;
    }>
  ) => {
    // Update items first
    for (const item of deliveredItems) {
      await saleItemCollection.update(item.itemId, (draft) => {
        draft.deliveredQuantity = item.deliveredQuantity.toString();
        if (item.unitPriceFinal !== undefined) {
          draft.unitPriceFinal = item.unitPriceFinal.toString();
        }
      });
    }

    // Update sale status
    await saleCollection.update(saleId, (draft) => {
      draft.status = "delivered";
    });
  };
}

// Cancel transaction
export function useCancelTransaction() {
  return useMutation({
    mutationFn: async ({
      saleId,
      reason,
    }: {
      saleId: string;
      reason?: string;
    }) => {
      await saleCollection.update(saleId, (draft) => {
        draft.status = "cancelled";
        draft.cancelReason = reason || "";
      });
    },
  });
}

// Create share token
export function useCreateSaleToken() {
  return async (saleId: string): Promise<string> => {
    const response = await api.sales({ id: saleId }).token.post();
    return response.data?.data?.token || "";
  };
}

// Get transaction items
export function useTransactionItems(saleId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ item: saleItemCollection })
        .where(({ item }) => eq(item.saleId, saleId)),
    [saleId]
  );
}
