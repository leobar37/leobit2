import { useLiveQuery, eq, and, gte } from "@tanstack/react-db";
import { paymentCollection } from "~/lib/db/collections/payment.collection";
import { customerCollection } from "~/lib/db/collections/customer.collection";
import { useBusiness } from "./use-business";
import { generateId } from "~/lib/utils";
import { handleCollectionError } from "~/lib/db/error-handler";
import { getStoredBusinessId } from "~/lib/session-storage";
import type { Payment } from "~/lib/db/schema";

// Get all payments with optional customer filter
export function usePayments(customerId?: string) {
  const { data: business } = useBusiness();
  const businessId = business?.id || getStoredBusinessId();

  const result = useLiveQuery(
    (q) => {
      let query = q
        .from({ payment: paymentCollection })
        .where(({ payment }) => eq(payment.businessId, businessId));

      if (customerId) {
        query = query.where(({ payment }) => eq(payment.customerId, customerId));
      }

      return query.orderBy(({ payment }) => payment.createdAt, "desc");
    },
    [businessId, customerId]
  );

  return {
    ...result,
    data: (result.data ?? []) as Payment[],
  };
}

// Get payments with customer details
export function usePaymentsWithCustomers(customerId?: string) {
  const { data: business } = useBusiness();
  const businessId = business?.id || getStoredBusinessId();

  return useLiveQuery(
    (q) => {
      let query = q
        .from({ payment: paymentCollection })
        .join(
          { customer: customerCollection },
          ({ payment, customer }) => eq(payment.customerId, customer.id),
          "left"
        )
        .where(({ payment }) => eq(payment.businessId, businessId));

      if (customerId) {
        query = query.where(({ payment }) => eq(payment.customerId, customerId));
      }

      return query
        .select(({ payment, customer }) => ({
          ...payment,
          customerName: customer?.name,
          customerPhone: customer?.phone,
        }))
        .orderBy(({ payment }) => payment.createdAt, "desc");
    },
    [businessId, customerId]
  );
}

// Get a single payment by ID
export function usePayment(paymentId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ payment: paymentCollection })
        .where(({ payment }) => eq(payment.id, paymentId)),
    [paymentId]
  );
}

// Get payment with customer details
export function usePaymentWithCustomer(paymentId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ payment: paymentCollection })
        .join(
          { customer: customerCollection },
          ({ payment, customer }) => eq(payment.customerId, customer.id),
          "left"
        )
        .where(({ payment }) => eq(payment.id, paymentId))
        .select(({ payment, customer }) => ({
          ...payment,
          customerName: customer?.name,
          customerPhone: customer?.phone,
        })),
    [paymentId]
  );
}

// Create a new payment
export function useCreatePayment() {
  const { data: business } = useBusiness();
  const businessId = business?.id || getStoredBusinessId();

  return async (data: {
    customerId: string;
    amount: string;
    paymentMethod: Payment["paymentMethod"];
    notes?: string;
    referenceNumber?: string;
    relatedSaleId?: string;
  }) => {
    try {
      const paymentId = generateId();

      await paymentCollection.insert({
        id: paymentId,
        businessId: businessId || "",
        customerId: data.customerId,
        sellerId: "",
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        relatedSaleId: data.relatedSaleId || null,
        proofImageId: null,
        referenceNumber: data.referenceNumber || null,
        syncStatus: "pending",
        createdAt: new Date(),
      });

      return paymentId;
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

// Delete a payment
export function useDeletePayment() {
  return async (paymentId: string) => {
    try {
      await paymentCollection.delete(paymentId);
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

export function useUpdatePayment() {
  return async (
    paymentId: string,
    data: {
      proofImageId?: string;
      referenceNumber?: string;
    }
  ) => {
    try {
      await paymentCollection.update(paymentId, (draft) => {
        if (data.proofImageId !== undefined) {
          draft.proofImageId = data.proofImageId;
        }
        if (data.referenceNumber !== undefined) {
          draft.referenceNumber = data.referenceNumber;
        }
      });
    } catch (error) {
      const handled = handleCollectionError(error);
      throw new Error(handled.message);
    }
  };
}

// Get total payments for a client
export function useClientPaymentsTotal(customerId: string) {
  const { data: payments } = usePayments(customerId);

  const total = payments?.reduce((sum, payment) => {
    return sum + Number(payment.amount);
  }, 0) || 0;

  return {
    data: total.toFixed(2),
    isLoading: !payments,
  };
}

// Get today's payments
export function useTodayPayments() {
  const { data: business } = useBusiness();
  const businessId = business?.id || getStoredBusinessId();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useLiveQuery(
    (q) =>
      q
        .from({ payment: paymentCollection })
        .where(({ payment }) =>
          and(
            eq(payment.businessId, businessId),
            gte(payment.createdAt, today)
          )
        )
        .orderBy(({ payment }) => payment.createdAt, "desc"),
    [businessId]
  );
}
