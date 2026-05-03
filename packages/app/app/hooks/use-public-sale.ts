/**
 * Hooks for the unified public sale catalog.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export interface PublicSaleItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity?: string | null;
  orderedQuantity?: string | null;
  deliveredQuantity?: string | null;
  unitPrice?: string | null;
  unitPriceQuoted?: string | null;
  unitPriceFinal?: string | null;
  subtotal: string;
}

export interface PublicSale {
  id: string;
  type: "instant_sale" | "pre_order";
  saleDate: string;
  deliveryDate?: string | null;
  orderDate?: string | null;
  status: "draft" | "confirmed" | "active" | "delivered" | "cancelled";
  saleType: "contado" | "credito";
  totalAmount: string;
  version: number;
  allowCustomerEdit: boolean;
  items: PublicSaleItem[];
}

export interface PublicCatalogVariant {
  id: string;
  productId: string;
  name: string;
  price: string;
  unitQuantity: string;
  stockQuantity: string;
  sortOrder: number;
}

export interface PublicCatalogProduct {
  id: string;
  name: string;
  type: string;
  unit: string;
  imageId: string | null;
  variants: PublicCatalogVariant[];
}

export interface PublicCatalogBusiness {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  publicCatalogSlug: string | null;
  publicCatalogEnabled: boolean;
}

export interface PublicSalePageData {
  business: PublicCatalogBusiness;
  catalog: PublicCatalogProduct[];
  sale: PublicSale | null;
}

export interface PublicCartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export const publicSaleKeys = {
  page: (slug: string | undefined, token?: string | null) => ["public-sale-page", slug, token ?? null] as const,
  detail: (slug: string | undefined, token?: string | null) => ["public-sale-detail", slug, token ?? null] as const,
};

export interface PublicSaleDetailItem {
  productName: string;
  variantName: string;
  quantity: string | null;
  unitPrice: string | null;
  subtotal: string;
}

export interface PublicSaleDetailPayment {
  amount: string;
  paymentDate: string | null;
  method: string;
}

export interface PublicSaleDetailBusiness {
  name: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
}

export interface PublicSaleDetail {
  id: string;
  status: string;
  saleType: "contado" | "credito";
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  saleDate: string | null;
  deliveryDate: string | null;
  items: PublicSaleDetailItem[];
  payments: PublicSaleDetailPayment[];
}

export interface PublicSaleDetailData {
  business: PublicSaleDetailBusiness;
  sale: PublicSaleDetail;
}

function getErrorMessage(errorValue: unknown): string {
  if (typeof errorValue === "string") return errorValue;
  if (errorValue && typeof errorValue === "object" && "message" in errorValue) {
    const message = (errorValue as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "No se pudo completar la operación";
}

export function usePublicSalePage(slug: string | undefined, token?: string | null) {
  return useQuery({
    queryKey: publicSaleKeys.page(slug, token),
    queryFn: async () => {
      if (!slug) throw new Error("Catálogo requerido");
      const response = await api["public"].venta({ slug }).get({
        query: token ? { token } : {},
      });
      return extractData<PublicSalePageData>(response, "No se pudo cargar el catálogo");
    },
    enabled: !!slug,
    refetchInterval: token ? 30000 : false,
  });
}

export function useAddItemToPublicSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      slug,
      token,
      productId,
      variantId,
      quantity,
    }: {
      slug: string;
      token: string;
      productId: string;
      variantId: string;
      quantity: number;
    }) => {
      const response = await api["public"].venta({ slug }).items.post({
        token,
        productId,
        variantId,
        quantity,
      });
      if (response.error) throw new Error(getErrorMessage(response.error.value));
      return response.data?.data as unknown as PublicSale;
    },
    onSuccess: (_, { slug, token }) => {
      queryClient.invalidateQueries({ queryKey: publicSaleKeys.page(slug, token) });
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

export function useUpdatePublicSaleItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      slug,
      token,
      itemId,
      quantity,
      baseVersion,
    }: {
      slug: string;
      token: string;
      itemId: string;
      quantity: number;
      baseVersion: number;
    }) => {
      const response = await api["public"].venta({ slug }).items({ itemId }).patch({
        token,
        quantity,
        baseVersion,
      });
      if (response.error) throw new Error(getErrorMessage(response.error.value));
      return response.data?.data as unknown as PublicSale;
    },
    onSuccess: (_, { slug, token }) => {
      queryClient.invalidateQueries({ queryKey: publicSaleKeys.page(slug, token) });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo actualizar la cantidad",
      });
    },
  });
}

export function useDeletePublicSaleItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      slug,
      token,
      itemId,
      baseVersion,
    }: {
      slug: string;
      token: string;
      itemId: string;
      baseVersion: number;
    }) => {
      const response = await api["public"].venta({ slug }).items({ itemId }).delete({
        token,
        baseVersion,
      });
      if (response.error) throw new Error(getErrorMessage(response.error.value));
      return response.data?.data as { message: string };
    },
    onSuccess: (_, { slug, token }) => {
      queryClient.invalidateQueries({ queryKey: publicSaleKeys.page(slug, token) });
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

export function useConfirmPublicSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      slug,
      token,
      customerName,
      customerPhone,
      deliveryDate,
      notes,
      items,
    }: {
      slug: string;
      token?: string | null;
      customerName: string;
      customerPhone: string;
      deliveryDate: string;
      notes?: string;
      items?: PublicCartItemInput[];
    }) => {
      const response = await api["public"].venta({ slug }).confirmar.post({
        ...(token ? { token } : {}),
        customerName,
        customerPhone,
        deliveryDate,
        notes,
        items,
      });
      if (response.error) throw new Error(getErrorMessage(response.error.value));
      return response.data?.data as { message: string; saleId: string; status: string };
    },
    onSuccess: (_, { slug, token }) => {
      queryClient.invalidateQueries({ queryKey: publicSaleKeys.page(slug, token) });
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

export function useCancelPublicSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ slug, token }: { slug: string; token: string }) => {
      const response = await api["public"].venta({ slug }).cancel.post({ token });
      if (response.error) throw new Error(getErrorMessage(response.error.value));
      return response.data?.data as { message: string; saleId: string };
    },
    onSuccess: (_, { slug, token }) => {
      queryClient.invalidateQueries({ queryKey: publicSaleKeys.page(slug, token) });
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

export function usePublicSaleDetail(slug: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: publicSaleKeys.detail(slug, token),
    queryFn: async () => {
      if (!slug || !token) throw new Error("Slug y token requeridos");
      const response = await api["public"].venta({ slug }).detalle.get({
        query: { token },
      });
      return extractData<PublicSaleDetailData>(response, "No se pudo cargar el detalle de la venta");
    },
    enabled: !!slug && !!token,
  });
}
