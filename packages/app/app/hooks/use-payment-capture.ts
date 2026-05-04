/**
 * Payment Capture Hooks
 * Hooks for the PaymentCapture organism to query and mutate payment data.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
import type { Abono } from "~/hooks/use-payments";

export interface PaymentCaptureData {
  id: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  proofImageId: string | null;
  notes: string | null;
  amount: string;
  customerId: string;
  relatedSaleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta" | "saldo";

export interface UpdatePaymentInput {
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  proofImageId?: string;
  notes?: string;
}

export function usePaymentCapture(id: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id),
    queryFn: async (): Promise<PaymentCaptureData | null> => {
      if (!id) return null;
      const response = await api.payments({ id }).get();
      return extractData<PaymentCaptureData>(response);
    },
    enabled: !!id,
  });
}

export function useUpdatePaymentCapture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePaymentInput;
    }): Promise<PaymentCaptureData> => {
      const response = await api.payments({ id }).put(input);
      return extractData<PaymentCaptureData>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.detail(variables.id),
      });
    },
  });
}

export function useCreatePaymentDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      relatedSaleId,
      amount,
    }: {
      customerId: string;
      relatedSaleId: string;
      amount: number;
    }): Promise<PaymentCaptureData> => {
      const response = await api.payments.post({
        customerId,
        relatedSaleId,
        amount: amount.toString(),
        paymentMethod: "efectivo",
      });
      return extractData<PaymentCaptureData>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["payments", "by-sale", variables.relatedSaleId],
      });
    },
  });
}

export function usePaymentBySaleId(saleId: string | null) {
  return useQuery({
    queryKey: ["payments", "by-sale", saleId],
    queryFn: async (): Promise<PaymentCaptureData | null> => {
      if (!saleId) return null;
      const response = await api.payments["by-sale"]({ saleId }).get();
      return extractData<PaymentCaptureData | null>(response);
    },
    enabled: !!saleId,
  });
}

export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      file,
    }: {
      paymentId: string;
      file: File;
    }): Promise<PaymentCaptureData> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.payments({ id: paymentId }).proof.post(formData as unknown as { file: File });
      return extractData<PaymentCaptureData>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.detail(variables.paymentId),
      });
    },
  });
}
