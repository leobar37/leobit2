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
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
import type { SaleWithItems, SaleItem, UpdateSaleInput } from "./use-sales";

export { useSales, useSalesByCustomer, useConfirmSale, useCancelSale, useDeleteSale, useDeliverSale };
export { useUpdateSaleBase as useUpdateSale };

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

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
          const productResponse = await api.products({ id: item.productId }).get();
          const product = extractData<{ name: string } | null>(productResponse);

          let variant: { name: string } | null = null;
          if (item.variantId) {
            const variantResponse = await api.variants({ id: item.variantId }).get();
            variant = extractData<{ name: string } | null>(variantResponse);
          }

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
          sellerId: params.sellerId,
          totalAmount: params.totalAmount,
          amountPaid: params.amountPaid,
          customerId: params.customerId || undefined,
          deliveryDate: params.deliveryDate?.toISOString(),
        },
        items: itemsWithNames,
      });
      return result.id;
    },
  };
}

export function useFinalizeSale() {
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
      paymentMode?: "pago_total" | "a_cuenta" | "debe_todo";
    }) => {
      if (isDeliveryMode) {
        for (const item of deliveryItems || []) {
          const patchResponse = await api.sales({ id }).items({ itemId: item.itemId }).patch({
            deliveredQuantity: item.deliveredQuantity,
            unitPriceFinal: item.unitPriceFinal,
            subtotal: item.subtotal,
          });
          extractData(patchResponse);
        }

        const deliverResponse = await api.sales({ id }).deliver.post({ baseVersion: version });
        extractData(deliverResponse);
        return;
      }

      if (type === "pre_order") {
        const response = await api.sales({ id }).confirm.post({ baseVersion: version });
        extractData(response);
        return;
      }

      const response = await api.sales({ id }).confirm.post({});
      extractData(response);
    },
    onSettled: async (_data, _error) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.lists({}), exact: false });
    },
  });
}

export function useAddSaleItem() {
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
      const [productResponse, variantResponse] = await Promise.all([
        api.products({ id: item.productId }).get(),
        item.variantId ? api.variants({ id: item.variantId }).get() : Promise.resolve(null),
      ]);

      const product = extractData<{ name: string } | null>(productResponse);
      const variant = variantResponse ? extractData<{ name: string } | null>(variantResponse) : null;

      if (!product) throw new Error("Product not found");

      const response = await api.sales({ id: saleId }).items.post({
        productId: item.productId,
        variantId: item.variantId || "",
        productName: product.name,
        variantName: variant?.name || "",
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.subtotal,
      });

      const createdItem = extractData<SaleItem>(response);
      return { saleId, createdItem };
    },
    onSuccess: ({ saleId, createdItem }) => {
      queryClient.setQueryData(queryKeys.sales.detail(saleId), (previous: SaleWithItems | null | undefined) => {
        if (!previous) return previous;

        const subtotal = toNumber(createdItem.subtotal);
        const totalAmount = (toNumber(previous.totalAmount) + subtotal).toString();
        const balanceDue = (toNumber(previous.balanceDue) + subtotal).toString();

        return {
          ...previous,
          totalAmount,
          balanceDue,
          items: [...(previous.items ?? []), createdItem],
          updatedAt: new Date().toISOString(),
        };
      });
    },
  });
}

export function useRemoveSaleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      itemId,
    }: {
      saleId: string;
      itemId: string;
    }) => {
      const response = await api.sales({ id: saleId }).items({ itemId }).delete();
      if (response.error) throw new Error(String(response.error.value));
      return saleId;
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(queryKeys.sales.detail(variables.saleId), (previous: SaleWithItems | null | undefined) => {
        if (!previous) return previous;

        const existingItem = (previous.items ?? []).find((item) => item.id === variables.itemId);
        const subtotal = toNumber(existingItem?.subtotal);

        return {
          ...previous,
          totalAmount: (toNumber(previous.totalAmount) - subtotal).toString(),
          balanceDue: (toNumber(previous.balanceDue) - subtotal).toString(),
          items: (previous.items ?? []).filter((item) => item.id !== variables.itemId),
          updatedAt: new Date().toISOString(),
        };
      });
    },
  });
}

export function useUpdateSaleItem() {
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
      const response = await api.sales({ id: saleId }).items({ itemId }).patch({
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        subtotal: data.subtotal,
      });
      const updatedItem = extractData<SaleItem>(response);
      return { saleId, itemId, updatedItem };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.sales.detail(result.saleId), (previous: SaleWithItems | null | undefined) => {
        if (!previous) return previous;

        const oldItem = (previous.items ?? []).find((item) => item.id === result.itemId);
        const oldSubtotal = toNumber(oldItem?.subtotal);
        const newSubtotal = toNumber(result.updatedItem.subtotal);
        const subtotalDiff = newSubtotal - oldSubtotal;

        const nextItems: SaleItem[] = (previous.items ?? []).map((item) =>
          item.id === result.itemId ? result.updatedItem : item
        );

        return {
          ...previous,
          totalAmount: (toNumber(previous.totalAmount) + subtotalDiff).toString(),
          balanceDue: (toNumber(previous.balanceDue) + subtotalDiff).toString(),
          items: nextItems,
          updatedAt: new Date().toISOString(),
        };
      });
    },
  });
}
