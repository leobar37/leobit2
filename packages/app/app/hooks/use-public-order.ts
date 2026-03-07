import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import type { Order, OrderItem } from "~/lib/db/schema";

const QUERY_KEY = "public-order";

export interface PublicOrder {
  id: string;
  orderDate: string;
  deliveryDate: string | null;
  status: string;
  paymentIntent: string;
  totalAmount: string;
  version: number;
  items: {
    id: string;
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    orderedQuantity: string;
    deliveredQuantity: string;
    unitPriceQuoted: string;
    unitPriceFinal: string | null;
  }[];
}

export interface AddItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface ConfirmOrderInput {
  customerName?: string;
  customerPhone?: string;
  deliveryDate?: string;
  notes?: string;
}

export interface ConfirmOrderResponse {
  orderId: string;
  status: string;
  deliveryDate: string;
}

async function fetchPublicOrder(token: string): Promise<PublicOrder> {
  const { data, error } = await api.public.pedido({ token }).get();

  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Pedido no encontrado o token inválido");
  }

  return data.data as PublicOrder;
}

async function addOrderItem(
  token: string,
  input: AddItemInput
): Promise<PublicOrder> {
  const { data, error } = await api["public"]["pedido"]({ token })["items"].post(input);

  if (error) {
    const errorMessage = typeof error.value === "string" 
      ? error.value 
      : JSON.stringify(error.value);
    throw new Error(errorMessage);
  }
  if (!data?.success || !data.data) {
    throw new Error("Error al agregar item");
  }

  return data.data as PublicOrder;
}

async function deleteOrderItem(
  token: string,
  itemId: string,
  baseVersion: number
): Promise<void> {
  const { data, error } = await api["public"]["pedido"]({ token })["items"]({
    itemId,
  }).delete({
    baseVersion,
  });

  if (error) {
    const errorMessage = typeof error.value === "string" 
      ? error.value 
      : JSON.stringify(error.value);
    throw new Error(errorMessage);
  }
  if (!data?.success) {
    throw new Error("Error al eliminar item");
  }
}

async function confirmOrder(
  token: string,
  input: ConfirmOrderInput
): Promise<ConfirmOrderResponse> {
  const { data, error } = await api["public"]["pedido"]({ token })["confirmar"].post(input);

  if (error) {
    const errorMessage = typeof error.value === "string" 
      ? error.value 
      : JSON.stringify(error.value);
    throw new Error(errorMessage);
  }
  if (!data?.success || !data.data) {
    throw new Error("Error al confirmar pedido");
  }

  return data.data as unknown as ConfirmOrderResponse;
}

export function usePublicOrder(token: string) {
  return useQuery({
    queryKey: [QUERY_KEY, token],
    queryFn: () => fetchPublicOrder(token),
    enabled: !!token,
    retry: false,
  });
}

export function useAddOrderItem(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddItemInput) => addOrderItem(token, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, token] });
    },
  });
}

export function useDeleteOrderItem(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, baseVersion }: { itemId: string; baseVersion: number }) =>
      deleteOrderItem(token, itemId, baseVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, token] });
    },
  });
}

export function useConfirmPublicOrder(token: string) {
  return useMutation({
    mutationFn: (input: ConfirmOrderInput) => confirmOrder(token, input),
  });
}
