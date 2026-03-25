import {
  useSales,
  useSale as useSaleBase,
  useSalesByCustomer,
  useCreateSale as useCreateSaleBase,
  useUpdateSale as useUpdateSaleBase,
  useConfirmSale,
  useCancelSale,
  useDeleteSale,
  useDeliverSale,
} from "./use-sales";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSaleService, useProductService } from "~/lib/sync/service-provider";

export { useSales, useSalesByCustomer, useConfirmSale, useCancelSale, useDeleteSale, useDeliverSale };
export { useUpdateSaleBase as useUpdateSale };

export function useSale(id: string | null) {
  const { data, ...rest } = useSaleBase(id);
  return {
    data: data ?? null,
    ...rest,
  };
}

export function useSaleItems(saleId: string | null) {
  const { data: sale, ...rest } = useSaleBase(saleId);
  return {
    data: sale?.items ?? [],
    ...rest,
  };
}

export function useCreateSale() {
  const baseMutation = useCreateSaleBase();
  const productService = useProductService();

  return {
    ...baseMutation,
    mutateAsync: async (params: {
      businessId: string;
      sellerId: string;
      type: string;
      saleType: string;
      totalAmount: number;
      amountPaid: number;
      items: Array<{
        productId: string;
        variantId?: string | null;
        quantity: number;
        price: number;
        subtotal: number;
      }>;
      customerId?: string | null;
      deliveryDate?: Date | null;
      notes?: string | null;
    }) => {
      const itemsWithNames = await Promise.all(
        params.items.map(async (item) => {
          const product = await productService.findById(item.productId);
          const variant = item.variantId
            ? await productService.findVariantById(item.variantId)
            : null;

          return {
            productId: item.productId,
            variantId: item.variantId || "",
            productName: product?.name || "",
            variantName: variant?.name || "",
            quantity: item.quantity,
            subtotal: item.subtotal,
          };
        })
      );

      const result = await baseMutation.mutateAsync({
        sale: {
          type: params.type as "instant_sale" | "pre_order",
          saleType: params.saleType as "contado" | "credito",
          totalAmount: params.totalAmount,
          amountPaid: params.amountPaid,
          customerId: params.customerId || undefined,
          deliveryDate: params.deliveryDate?.toISOString(),
          notes: params.notes || undefined,
        },
        items: itemsWithNames,
      });
      return result.id;
    },
  };
}

export function useFinalizeSale() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      type,
      version,
      isDeliveryMode,
      deliveryItems,
      amountPaid,
      paymentMode,
    }: {
      id: string;
      type: string;
      version: number;
      isDeliveryMode?: boolean;
      deliveryItems?: Array<{
        itemId: string;
        deliveredQuantity?: number;
        unitPriceFinal?: number;
        subtotal?: number;
      }>;
      amountPaid?: number;
      paymentMode?: string;
    }) => {
      // If in delivery mode, use finalizeDelivery instead
      if (isDeliveryMode) {
        return saleService.finalizeDelivery(id, {
          items: deliveryItems || [],
          amountPaid,
          paymentMode,
        });
      }

      // Otherwise, use the normal confirmation flow
      if (type === "pre_order") {
        return saleService.confirmPreOrder(id, version);
      }
      return saleService.confirm(id);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["sales-new", id] });
      queryClient.invalidateQueries({ queryKey: ["sales-new"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
    },
  });
}

export function useAddSaleItem() {
  const saleService = useSaleService();
  const productService = useProductService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      item,
    }: {
      saleId: string;
      item: {
        productId: string;
        variantId?: string | null;
        quantity: number;
        price: number;
        subtotal: number;
      };
    }) => {
      const [product, variant] = await Promise.all([
        productService.findById(item.productId),
        item.variantId ? productService.findVariantById(item.variantId) : Promise.resolve(null),
      ]);

      if (!product) throw new Error("Product not found");

      // addItem now handles the atomic total update internally
      await saleService.addItem(saleId, {
        productId: item.productId,
        variantId: item.variantId || "",
        productName: product.name,
        variantName: variant?.name || "",
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.subtotal,
      });

      return saleId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sales-new", variables.saleId] });
    },
  });
}

export function useRemoveSaleItem() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      itemId,
    }: {
      saleId: string;
      itemId: string;
    }) => {
      // removeItem now handles the atomic total update internally
      await saleService.removeItem(saleId, itemId);

      return saleId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sales-new", variables.saleId] });
    },
  });
}

export function useUpdateSaleItem() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      itemId,
      data,
    }: {
      saleId: string;
      itemId: string;
      data: {
        quantity: number;
        unitPrice: number;
        subtotal: number;
      };
    }) => {
      await saleService.updateItem(saleId, itemId, data);
      return { saleId, itemId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sales-new", variables.saleId] });
    },
  });
}
