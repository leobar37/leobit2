/**
 * Sales Hook
 * Reactively fetch and mutate sales using PGlite + ElectricSQL
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, and, gte, desc } from "drizzle-orm";
import { getDatabase } from "~/engine";
import {
  sales,
  saleItems,
  type Sale,
  type NewSale,
  type SaleItem,
  SaleStatus,
  TransactionType,
} from "~/engine/schema";
import { pushWrite } from "~/engine/write-engine";

const SALES_QUERY_KEY = "sales";

interface SaleFilters {
  businessId: string;
  customerId?: string;
  sellerId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Get sales with optional filters
 */
export function useSales(filters: SaleFilters) {
  const { businessId, customerId, sellerId, status, startDate, endDate } =
    filters;

  return useQuery({
    queryKey: [SALES_QUERY_KEY, filters],
    queryFn: async () => {
      const { db } = getDatabase();

      let query = db
        .select()
        .from(sales)
        .where(eq(sales.businessId, businessId));

      if (customerId) {
        query = query.where(eq(sales.customerId, customerId));
      }

      if (sellerId) {
        query = query.where(eq(sales.sellerId, sellerId));
      }

      if (status) {
        query = query.where(eq(sales.status, status));
      }

      if (startDate) {
        query = query.where(gte(sales.saleDate, startDate));
      }

      return query.orderBy(desc(sales.saleDate));
    },
    enabled: !!businessId,
  });
}

/**
 * Get a single sale with items
 */
export function useSale(id: string | null) {
  return useQuery({
    queryKey: [SALES_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { db } = getDatabase();

      const [saleResult, itemsResult] = await Promise.all([
        db.select().from(sales).where(eq(sales.id, id)).limit(1),
        db.select().from(saleItems).where(eq(saleItems.saleId, id)),
      ]);

      if (!saleResult[0]) return null;

      return {
        ...saleResult[0],
        items: itemsResult,
      };
    },
    enabled: !!id,
  });
}

/**
 * Get sales by distribucion
 */
export function useSalesByDistribucion(
  businessId: string,
  distribucionId: string
) {
  return useQuery({
    queryKey: [SALES_QUERY_KEY, "distribucion", distribucionId],
    queryFn: async () => {
      const { db } = getDatabase();
      return db
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.businessId, businessId),
            eq(sales.distribucionId, distribucionId)
          )
        )
        .orderBy(desc(sales.saleDate));
    },
    enabled: !!businessId && !!distribucionId,
  });
}

// Types for sale creation
interface SaleItemInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CreateSaleInput {
  businessId: string;
  customerId?: string;
  sellerId: string;
  type: "instant_sale" | "pre_order";
  saleType: "contado" | "credito";
  totalAmount: number;
  amountPaid?: number;
  tara?: number;
  netWeight?: number;
  items: SaleItemInput[];
  deliveryDate?: string;
}

/**
 * Create a new sale
 */
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const result = await pushWrite("/api/sales", "POST", input);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}

/**
 * Confirm a sale (draft -> active/confirmed)
 */
export function useConfirmSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      baseVersion,
    }: {
      id: string;
      baseVersion?: number;
    }) => {
      const body = baseVersion ? { baseVersion } : undefined;
      const result = await pushWrite(
        `/api/sales/${id}/confirm`,
        "POST",
        body
      );
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SALES_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}

/**
 * Deliver a pre_order sale (confirmed -> delivered)
 */
export function useDeliverSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      baseVersion,
    }: {
      id: string;
      baseVersion?: number;
    }) => {
      const body = baseVersion ? { baseVersion } : undefined;
      const result = await pushWrite(
        `/api/sales/${id}/deliver`,
        "POST",
        body
      );
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SALES_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}

/**
 * Cancel a sale
 */
export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
      refundAmount,
      refundMethod,
    }: {
      id: string;
      reason: string;
      refundAmount?: number;
      refundMethod?:
        | "efectivo"
        | "yape"
        | "plin"
        | "transferencia"
        | "saldo";
    }) => {
      const result = await pushWrite(`/api/sales/${id}/cancel`, "POST", {
        reason,
        refundAmount,
        refundMethod,
      });
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SALES_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}

/**
 * Delete a draft sale
 */
export function useDeleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await pushWrite(`/api/sales/${id}`, "DELETE", null);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}

/**
 * Get today's sales for a seller
 */
export function useTodaySales(sellerId: string, businessId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useSales({
    businessId,
    sellerId,
    startDate: today,
  });
}
