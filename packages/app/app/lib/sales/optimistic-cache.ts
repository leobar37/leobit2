import type { QueryClient } from "@tanstack/react-query";
import type { SaleItem, SaleWithItems } from "~/hooks/use-sales";
import { queryKeys } from "~/lib/query-keys";
import { getSaleFinancialState } from "~/hooks/use-sale-calculations";
import { decimalToNumber } from "@avileo/shared";

export function generateOptimisticItemId(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface BuildOptimisticSaleItemParams {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export function buildOptimisticSaleItem(
  params: BuildOptimisticSaleItemParams
): SaleItem {
  const now = new Date().toISOString();
  return {
    id: generateOptimisticItemId(),
    businessId: "",
    saleId: "",
    productId: params.productId,
    variantId: params.variantId,
    productName: params.productName,
    variantName: params.variantName,
    quantity: String(params.quantity),
    orderedQuantity: null,
    deliveredQuantity: null,
    unitPrice: String(params.unitPrice),
    unitPriceQuoted: null,
    unitPriceFinal: null,
    subtotal: String(params.subtotal),
    isModified: false,
    originalQuantity: null,
    createdAt: now,
    updatedAt: now,
    isOptimistic: true,
  };
}

export function addOptimisticSaleItem(
  queryClient: QueryClient,
  saleId: string,
  item: SaleItem
): void {
  queryClient.setQueryData(
    queryKeys.sales.detail(saleId),
    (previous: SaleWithItems | null | undefined) => {
      if (!previous) return previous;

      const subtotal = decimalToNumber(item.subtotal);
      const newTotal = decimalToNumber(previous.totalAmount) + subtotal;
      const { balanceDue } = getSaleFinancialState({
        saleType: previous.saleType,
        totalAmount: newTotal,
        amountPaid: decimalToNumber(previous.amountPaid),
      });

      return {
        ...previous,
        totalAmount: newTotal.toString(),
        balanceDue: balanceDue.toString(),
        items: [...(previous.items ?? []), item],
        updatedAt: new Date().toISOString(),
      };
    }
  );
}

export function replaceOptimisticSaleItem(
  queryClient: QueryClient,
  saleId: string,
  optimisticId: string,
  realItem: SaleItem
): void {
  queryClient.setQueryData(
    queryKeys.sales.detail(saleId),
    (previous: SaleWithItems | null | undefined) => {
      if (!previous) return previous;

      return {
        ...previous,
        items: (previous.items ?? []).map((i) =>
          i.id === optimisticId ? { ...realItem, isOptimistic: false } : i
        ),
      };
    }
  );
}

export function removeOptimisticSaleItem(
  queryClient: QueryClient,
  saleId: string,
  itemId: string
): void {
  queryClient.setQueryData(
    queryKeys.sales.detail(saleId),
    (previous: SaleWithItems | null | undefined) => {
      if (!previous) return previous;

      const removedItem = (previous.items ?? []).find((i) => i.id === itemId);
      const subtotal = decimalToNumber(removedItem?.subtotal);
      const newTotal = decimalToNumber(previous.totalAmount) - subtotal;
      const { balanceDue } = getSaleFinancialState({
        saleType: previous.saleType,
        totalAmount: newTotal,
        amountPaid: decimalToNumber(previous.amountPaid),
      });

      return {
        ...previous,
        totalAmount: newTotal.toString(),
        balanceDue: balanceDue.toString(),
        items: (previous.items ?? []).filter((i) => i.id !== itemId),
        updatedAt: new Date().toISOString(),
      };
    }
  );
}
