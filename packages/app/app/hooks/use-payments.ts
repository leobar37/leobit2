import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEngineService } from "@avileo/drizzle-sync/react";
import { PaymentService } from "~/lib/services/payment-service";
import type { Abono, CreateAbonoInput, UpdateAbonoInput } from "~/lib/services/payment-service";
import { useBusiness } from "~/hooks/use-business";

const QUERY_KEYS = {
  payments: ["payments"],
  customerPayments: (customerId: string) => ["payments", "customer", customerId],
  businessPayments: ["payments", "business"],
} as const;

export function usePayments() {
  const paymentService = useEngineService<PaymentService>("payments");

  return useQuery({
    queryKey: QUERY_KEYS.businessPayments,
    queryFn: async (): Promise<Abono[]> => {
      return paymentService.findByBusiness();
    },
  });
}

export function useCustomerPayments(customerId: string | null) {
  const paymentService = useEngineService<PaymentService>("payments");

  return useQuery({
    queryKey: customerId
      ? QUERY_KEYS.customerPayments(customerId)
      : ["payments-new", "customer"],
    queryFn: async (): Promise<Abono[]> => {
      if (!customerId) return [];
      return paymentService.findByCustomer(customerId);
    },
    enabled: !!customerId,
  });
}

export function usePayment(id: string | null) {
  const paymentService = useEngineService<PaymentService>("payments");

  return useQuery({
    queryKey: ["payments-new", "detail", id],
    queryFn: async (): Promise<Abono | null> => {
      if (!id) return null;
      return paymentService.findById(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a payment
 * Returns an async function that creates a payment and returns the payment ID
 */
export function useCreatePayment() {
  const paymentService = useEngineService<PaymentService>("payments");
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  const mutation = useMutation({
    mutationFn: async (input: CreateAbonoInput): Promise<Abono> => {
      return paymentService.create(input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customerPayments(variables.customerId),
      });
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
    },
  });

  return async (data: {
    customerId: string;
    amount: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
  }) => {
    const sellerId = business?.businessUserId;
    if (!sellerId) {
      throw new Error("Business seller is not available");
    }
    const result = await mutation.mutateAsync({
      customerId: data.customerId,
      sellerId: sellerId,
      amount: parseFloat(data.amount) || 0,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
    });
    return result.id;
  };
}

export function useDeletePayment() {
  const paymentService = useEngineService<PaymentService>("payments");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return paymentService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments });
      queryClient.invalidateQueries({
        queryKey: ["payments-new", "customer"],
      });
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
    },
  });
}

/**
 * Hook to update a payment
 * Returns an async function that takes paymentId and data
 */
export function useUpdatePayment() {
  const paymentService = useEngineService<PaymentService>("payments");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAbonoInput }): Promise<Abono | null> => {
      return paymentService.update(id, input);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payments-new", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      if (data?.customer_id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.customerPayments(data.customer_id),
        });
      }
    },
  });

  // Return a wrapper function that matches the expected API: (paymentId, data)
  return async (
    paymentId: string,
    data: { proofImageId?: string; referenceNumber?: string }
  ) => {
    await mutation.mutateAsync({
      id: paymentId,
      input: {
        proofImageId: data.proofImageId,
        referenceNumber: data.referenceNumber,
      },
    });
  };
}
