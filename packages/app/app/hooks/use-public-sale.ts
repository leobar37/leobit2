/**
 * Hooks for public sale access (customer view via token)
 * Allows customers to view and edit sales via shared token
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useToast } from "@/hooks/use-toast";

// Types
interface PublicSaleItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity?: string;
  orderedQuantity?: string;
  deliveredQuantity?: string;
  unitPrice?: string;
  unitPriceQuoted?: string;
  unitPriceFinal?: string;
  subtotal: string;
}

interface PublicSale {
  id: string;
  type: "instant_sale" | "pre_order";
  saleDate: string;
  deliveryDate?: string;
  orderDate?: string;
  status: "draft" | "confirmed" | "active" | "delivered" | "cancelled";
  saleType: "contado" | "credito";
  totalAmount: string;
  version: number;
  allowCustomerEdit: boolean;
  items: PublicSaleItem[];
}

// Get public sale by token
export function usePublicSale(token: string | undefined) {
  return useQuery({
    queryKey: ["public-sale", token],
    queryFn: async () => {
      if (!token) throw new Error("Token requerido");
      const response = await api["public"].venta({ token }).get();
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      return response.data?.data as PublicSale;
    },
    enabled: !!token,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Add item to public sale
export function useAddItemToPublicSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      token,
      productId,
      variantId,
      quantity,
    }: {
      token: string;
      productId: string;
      variantId: string;
      quantity: number;
    }) => {
      const response = await api["public"].venta({ token }).items.post({
        productId,
        variantId,
        quantity,
      });
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      return response.data?.data as PublicSale;
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ["public-sale", token] });
      toast.success("Producto agregado", {
        description: "El producto fue agregado a tu pedido",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo agregar el producto",
      });
    },
  });
}

// Update item quantity in public sale
export function useUpdatePublicSaleItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      token,
      itemId,
      quantity,
      baseVersion,
    }: {
      token: string;
      itemId: string;
      quantity: number;
      baseVersion: number;
    }) => {
      const response = await api["public"].venta({ token }).items({ itemId }).patch({
        quantity,
        baseVersion,
      });
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      return response.data?.data as { id: string; status: string; totalAmount: string; version: number; items: PublicSaleItem[] };
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ["public-sale", token] });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo actualizar la cantidad",
      });
    },
  });
}

// Delete item from public sale
export function useDeletePublicSaleItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      const response = await api["public"].venta({ token }).items({ itemId }).delete({
        baseVersion,
      });
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      return response.data?.data as { message: string };
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ["public-sale", token] });
      toast.success("Producto eliminado", {
        description: "El producto fue eliminado de tu pedido",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo eliminar el producto",
      });
    },
  });
}

// Confirm public sale
export function useConfirmPublicSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      token,
      customerName,
      customerPhone,
      deliveryDate,
      notes,
    }: {
      token: string;
      customerName: string;
      customerPhone: string;
      deliveryDate: string;
      notes?: string;
    }) => {
      const response = await api["public"].venta({ token }).confirmar.post({
        customerName,
        customerPhone,
        deliveryDate,
        notes,
      });
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      return response.data?.data as { message: string; saleId: string };
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ["public-sale", token] });
      toast.success("Pedido confirmado", {
        description: "Tu pedido ha sido confirmado exitosamente",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo confirmar el pedido",
      });
    },
  });
}

// Cancel public sale
export function useCancelPublicSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const response = await api["public"].venta({ token }).cancel.post();
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      return response.data?.data as { message: string; saleId: string };
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ["public-sale", token] });
      toast.success("Pedido cancelado", {
        description: "Tu pedido ha sido cancelado",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo cancelar el pedido",
      });
    },
  });
}
