import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useToastError } from "./use-toast-error";

const PUBLIC_ORDER_KEY = "public-order";

export interface PublicOrderItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  orderedQuantity: string;
  deliveredQuantity?: string;
  unitPriceQuoted: string;
  unitPriceFinal?: string;
}

export interface PublicOrder {
  id: string;
  orderDate: string;
  deliveryDate: string;
  status: "draft" | "confirmed" | "cancelled" | "delivered";
  paymentIntent: string;
  totalAmount: string;
  version: number;
  items: PublicOrderItem[];
}

/**
 * Hook to fetch a public order by token
 */
export function usePublicOrder(token: string | undefined) {
  return useQuery({
    queryKey: [PUBLIC_ORDER_KEY, token],
    queryFn: async (): Promise<PublicOrder> => {
      if (!token) throw new Error("Token is required");
      const { data, error } = await api["public"].pedido({ token }).get();
      if (error) throw new Error(String(error.value));
      return (data as { data: PublicOrder }).data;
    },
    enabled: !!token,
    staleTime: 0, // Always refetch to get latest data
  });
}

interface AddItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

/**
 * Hook to add an item to a public order
 */
export function useAddItemToPublicOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, item }: { token: string; item: AddItemInput }) => {
      const { data, error } = await api["public"].pedido({ token }).items.post({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
      if (error) throw new Error(String(error.value));
      return (data as { data: PublicOrder }).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_ORDER_KEY, variables.token] });
    },
  });
}

/**
 * Hook to delete an item from a public order
 */
export function useDeleteItemFromPublicOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      itemId,
      baseVersion,
    }: {
      token: string;
      itemId: string;
      baseVersion: number;
    }) => {
      const { data, error } = await api["public"]
        .pedido({ token })
        .items({ itemId })
        .delete({ baseVersion });
      if (error) throw new Error(String(error.value));
      return (data as { data: PublicOrder }).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_ORDER_KEY, variables.token] });
    },
  });
}

interface ConfirmOrderInput {
  customerName?: string;
  customerPhone?: string;
  deliveryDate?: string;
  notes?: string;
}

/**
 * Hook to confirm a public order
 */
export function useConfirmPublicOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, input }: { token: string; input: ConfirmOrderInput }) => {
      const { data, error } = await api["public"]
        .pedido({ token })
        .confirmar.post({
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryDate: input.deliveryDate,
          notes: input.notes,
        });
      if (error) throw new Error(String(error.value));
      return (data as { data: { orderId: string; status: string; deliveryDate: string } }).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_ORDER_KEY, variables.token] });
    },
  });
}

interface UpdateItemInput {
  quantity: number;
  baseVersion: number;
}

/**
 * Hook to update item quantity in a public order
 */
export function useUpdateItemQuantity() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToastError();

  return useMutation({
    mutationFn: async ({
      token,
      itemId,
      input,
    }: {
      token: string;
      itemId: string;
      input: UpdateItemInput;
    }) => {
      const { data, error } = await api["public"]
        .pedido({ token })
        .items({ itemId })
        .patch(input);
      if (error) throw new Error(String(error.value));
      return (data as { data: PublicOrder }).data;
    },
    onSuccess: (_, variables) => {
      showSuccess("Cantidad actualizada");
      queryClient.invalidateQueries({ queryKey: [PUBLIC_ORDER_KEY, variables.token] });
    },
    onError: (error) => {
      showError("Error al actualizar cantidad", error);
    },
  });
}

/**
 * Hook to cancel a public order
 */
export function useCancelPublicOrder() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToastError();

  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const { data, error } = await api["public"]
        .pedido({ token })
        .cancelar.post({});
      if (error) throw new Error(String(error.value));
      return (data as { data: PublicOrder }).data;
    },
    onSuccess: (_, variables) => {
      showSuccess("Pedido cancelado");
      queryClient.invalidateQueries({ queryKey: [PUBLIC_ORDER_KEY, variables.token] });
    },
    onError: (error) => {
      showError("Error al cancelar pedido", error);
    },
  });
}
