/**
 * Payments Hook (Abonos)
 * Reactively fetch and mutate payments using PGlite + ElectricSQL
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, and, gte, desc, sum } from "drizzle-orm";
import { getDatabase } from "~/engine";
import { abonos, type Abono, PaymentMethod } from "~/engine/schema";
import { pushWrite } from "~/engine/write-engine";

const PAYMENTS_QUERY_KEY = "payments";

interface PaymentFilters {
  businessId: string;
  customerId?: string;
  sellerId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Get payments with optional filters
 */
export function usePayments(filters: PaymentFilters) {
  const { businessId, customerId, sellerId, startDate } = filters;

  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, filters],
    queryFn: async () => {
      const { db } = getDatabase();

      let query = db
        .select()
        .from(abonos)
        .where(eq(abonos.businessId, businessId));

      if (customerId) {
        query = query.where(eq(abonos.customerId, customerId));
      }

      if (sellerId) {
        query = query.where(eq(abonos.sellerId, sellerId));
      }

      if (startDate) {
        query = query.where(gte(abonos.createdAt, startDate));
      }

      return query.orderBy(desc(abonos.createdAt));
    },
    enabled: !!businessId,
  });
}

/**
 * Get payments for a specific customer
 */
export function useCustomerPayments(customerId: string | null) {
  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, "customer", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { db } = getDatabase();
      return db
        .select()
        .from(abonos)
        .where(eq(abonos.customerId, customerId))
        .orderBy(desc(abonos.createdAt));
    },
    enabled: !!customerId,
  });
}

/**
 * Get total payments amount for a customer
 */
export function useCustomerTotalPayments(customerId: string | null) {
  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, "total", customerId],
    queryFn: async () => {
      if (!customerId) return 0;
      const { db } = getDatabase();
      const result = await db
        .select({ total: sum(abonos.amount) })
        .from(abonos)
        .where(eq(abonos.customerId, customerId));
      return Number(result[0]?.total || 0);
    },
    enabled: !!customerId,
  });
}

interface CreatePaymentInput {
  customerId: string;
  sellerId: string;
  businessId: string;
  relatedSaleId?: string;
  amount: number;
  paymentMethod?: "efectivo" | "yape" | "plin" | "transferencia";
  referenceNumber?: string;
  proofImageId?: string;
  notes?: string;
}

/**
 * Create a new payment
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const result = await pushWrite("/api/abonos", "POST", input);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [PAYMENTS_QUERY_KEY, "customer", variables.customerId],
      });
      queryClient.invalidateQueries({
        queryKey: [PAYMENTS_QUERY_KEY, "total", variables.customerId],
      });
    },
  });
}

/**
 * Delete a payment
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await pushWrite(`/api/abonos/${id}`, "DELETE", null);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_QUERY_KEY] });
    },
  });
}

/**
 * Get today's payments for a seller
 */
export function useTodayPayments(sellerId: string, businessId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return usePayments({
    businessId,
    sellerId,
    startDate: today,
  });
}
