/**
 * Payments Hook (API-based)
 * Reactively fetch and mutate payments using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
import { useBusiness } from "~/hooks/use-business";

export interface Abono {
  id: string;
  customerId: string;
  sellerId: string | null;
  businessId: string;
  relatedSaleId: string | null;
  amount: string;
  paymentMethod: string;
  referenceNumber: string | null;
  proofImageId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAbonoInput {
  customerId: string;
  relatedSaleId?: string;
  amount: number;
  paymentMethod: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta";
  notes?: string;
  proofImageId?: string;
  referenceNumber?: string;
}

export interface UpdateAbonoInput {
  proofImageId?: string;
  referenceNumber?: string;
}

export function usePayments() {
  return useQuery({
    queryKey: queryKeys.payments.all,
    queryFn: async (): Promise<Abono[]> => {
      const response = await api.payments.get();
      return extractData(response) as unknown as Abono[];
    },
  });
}

export function useCustomerPayments(customerId: string | null) {
  return useQuery({
    queryKey: customerId
      ? queryKeys.payments.customer(customerId)
      : ["payments", "customer"],
    queryFn: async (): Promise<Abono[]> => {
      if (!customerId) return [];
      const response = await api.payments.get({
        query: { customerId },
      });
      return extractData(response) as unknown as Abono[];
    },
    enabled: !!customerId,
  });
}

export function usePayment(id: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id),
    queryFn: async (): Promise<Abono | null> => {
      if (!id) return null;
      const response = await api.payments({ id }).get();
      return extractData(response) as unknown as Abono;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a payment
 * Returns an async function that creates a payment and returns the payment ID
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  const mutation = useMutation({
    mutationFn: async (input: CreateAbonoInput): Promise<Abono> => {
      const response = await api.payments.post({
        customerId: input.customerId,
        amount: input.amount.toString(),
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        proofImageId: input.proofImageId,
        referenceNumber: input.referenceNumber,
      } as any);
      return extractData(response) as unknown as Abono;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.customer(variables.customerId),
      });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
    },
  });

  return async (data: {
    customerId: string;
    relatedSaleId?: string;
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
      relatedSaleId: data.relatedSaleId,
      amount: parseFloat(data.amount) || 0,
      paymentMethod: data.paymentMethod as CreateAbonoInput["paymentMethod"],
      referenceNumber: data.referenceNumber,
      notes: data.notes,
    });
    return result.id;
  };
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api.payments({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({
        queryKey: ["payments", "customer"],
      });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
    },
  });
}

/**
 * Hook to update a payment proof/reference
 * Returns an async function that takes paymentId and data
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAbonoInput;
    }): Promise<Abono> => {
      if (input.proofImageId) {
        const response = await api.payments({ id }).proof.put({
          proofImageId: input.proofImageId,
        } as any);
        return extractData(response) as unknown as Abono;
      }
      if (input.referenceNumber !== undefined) {
        const response = await api.payments({ id }).reference.put({
          referenceNumber: input.referenceNumber,
        } as any);
        return extractData(response) as unknown as Abono;
      }
      throw new Error("No update fields provided");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
    },
  });

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
