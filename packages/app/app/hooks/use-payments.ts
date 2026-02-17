import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import { syncClient } from "~/lib/sync/client";
import { createSyncId, isOnline } from "~/lib/sync/utils";

export interface Payment {
  id: string;
  clientId: string;
  sellerId: string;
  amount: string;
  paymentMethod: "efectivo" | "yape" | "plin" | "transferencia";
  notes: string | null;
  proofImageId: string | null;
  referenceNumber: string | null;
  syncStatus: "pending" | "synced" | "error";
  createdAt: Date;
}

export interface CreatePaymentInput {
  clientId: string;
  amount: string;
  paymentMethod: "efectivo" | "yape" | "plin" | "transferencia";
  notes?: string;
  referenceNumber?: string;
  proofImageId?: string;
}

async function getPayments(clientId?: string): Promise<Payment[]> {
  const response = await api.payments.get({
    query: clientId ? { clientId } : undefined,
  });

  return extractData(response, "Failed to load payments");
}

async function getPayment(id: string): Promise<Payment> {
  const response = await api.payments({ id }).get();
  return extractData(response, "Failed to load payment");
}

async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  if (!isOnline()) {
    const tempId = createSyncId();

    await syncClient.enqueueOperation({
      entity: "abonos",
      operation: "insert",
      entityId: tempId,
      data: {
        ...input,
      },
      lastError: undefined,
    });

    return {
      id: tempId,
      clientId: input.clientId,
      sellerId: "",
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      proofImageId: input.proofImageId ?? null,
      referenceNumber: input.referenceNumber ?? null,
      syncStatus: "pending",
      createdAt: new Date(),
    };
  }

  const { data, error } = await api.payments.post(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Payment;
}

async function deletePayment(id: string): Promise<void> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "abonos",
      operation: "delete",
      entityId: id,
      data: {},
      lastError: undefined,
    });
    return;
  }

  const { error } = await api.payments({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
}

export function usePayments(clientId?: string) {
  return useQuery({
    queryKey: ["payments", clientId],
    queryFn: () => getPayments(clientId),
    enabled: clientId !== undefined ? !!clientId : true,
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ["payments", id],
    queryFn: () => getPayment(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

async function uploadPaymentProof({
  id,
  file,
}: {
  id: string;
  file: File;
}): Promise<Payment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/payments/${id}/proof`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload proof");
  }

  const result = await response.json();
  return result.data as Payment;
}

async function updatePaymentReference({
  id,
  referenceNumber,
}: {
  id: string;
  referenceNumber: string;
}): Promise<Payment> {
  const { data, error } = await api.payments({ id }).reference.put({
    referenceNumber,
  });

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Payment;
}

export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadPaymentProof,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payments", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useUpdatePaymentReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePaymentReference,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payments", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
