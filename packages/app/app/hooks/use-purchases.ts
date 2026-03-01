import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface PurchaseItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: string;
  unitCost: string;
  totalCost: string;
  product?: {
    id: string;
    name: string;
  };
  variant?: {
    id: string;
    name: string;
  } | null;
}

export interface Purchase {
  id: string;
  supplierId: string;
  purchaseDate: string;
  totalAmount: string;
  status: "pending" | "received" | "cancelled";
  invoiceNumber: string | null;
  notes: string | null;
  supplier?: {
    id: string;
    name: string;
  };
  items: PurchaseItem[];
  createdAt: Date;
}

export interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  packs?: number;
  quantity: number;
  unitCost: number;
}



export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

export interface UpdatePurchaseStatusInput {
  id: string;
  status: "pending" | "received" | "cancelled";
}

async function getPurchases(): Promise<Purchase[]> {
  const { data, error } = await api.purchases.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return (data as any).data as Purchase[];
}

async function getPurchase(id: string): Promise<Purchase> {
  const { data, error } = await api.purchases({ id }).get();

  if (error) {
    throw new Error(String(error.value));
  }

  return (data as any).data as Purchase;
}

async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const { data, error } = await api.purchases.post(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Purchase;
}

async function updatePurchaseStatus({
  id,
  status,
}: UpdatePurchaseStatusInput): Promise<Purchase> {
  const { data, error } = await api.purchases({ id }).status.put({ status });

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Purchase;
}

async function deletePurchase(id: string): Promise<void> {
  const { error } = await api.purchases({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
}

export function usePurchases() {
  return useQuery({
    queryKey: ["purchases"],
    queryFn: getPurchases,
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ["purchases", id],
    queryFn: () => getPurchase(id),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdatePurchaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePurchaseStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchases", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
