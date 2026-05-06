import { describe, it, expect, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  generateOptimisticItemId,
  buildOptimisticSaleItem,
  addOptimisticSaleItem,
  replaceOptimisticSaleItem,
  removeOptimisticSaleItem,
} from "./optimistic-cache";
import { queryKeys } from "~/lib/query-keys";
import type { SaleWithItems } from "~/hooks/use-sales";

function createMockSale(overrides?: Partial<SaleWithItems>): SaleWithItems {
  return {
    id: "sale-1",
    businessId: "biz-1",
    customerId: null,
    sellerId: "seller-1",
    distribucionId: null,
    visitaId: null,
    type: "instant_sale",
    saleType: "contado",
    paymentMode: "pago_total",
    paymentMethod: null,
    totalAmount: "100",
    amountPaid: "100",
    balanceDue: "0",
    tara: null,
    netWeight: null,
    saleDate: new Date().toISOString(),
    deliveryDate: null,
    orderDate: null,
    status: "draft",
    version: 1,
    allowCustomerEdit: true,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    refundAmount: null,
    refundDate: null,
    refundMethod: null,
    refundReference: null,
    refundNotes: null,
    advancePaymentMethod: null,
    advanceReferenceNumber: null,
    advanceProofImageId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
    ...overrides,
  };
}

describe("optimistic-cache helpers", () => {
  let queryClient: QueryClient;
  const saleId = "sale-1";

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  describe("generateOptimisticItemId", () => {
    it("generates unique ids with opt- prefix", () => {
      const id1 = generateOptimisticItemId();
      const id2 = generateOptimisticItemId();
      expect(id1).toMatch(/^opt-/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("buildOptimisticSaleItem", () => {
    it("creates item with all required fields", () => {
      const item = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 2.5,
        unitPrice: 12,
        subtotal: 30,
      });

      expect(item.productId).toBe("p1");
      expect(item.variantId).toBe("v1");
      expect(item.productName).toBe("Pollo");
      expect(item.variantName).toBe("Entero");
      expect(item.quantity).toBe("2.5");
      expect(item.unitPrice).toBe("12");
      expect(item.subtotal).toBe("30");
      expect(item.isOptimistic).toBe(true);
      expect(item.id).toMatch(/^opt-/);
    });

    it("sets createdAt and updatedAt to current time", () => {
      const before = Date.now();
      const item = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 1,
        unitPrice: 10,
        subtotal: 10,
      });
      const after = Date.now();

      const createdAtMs = new Date(item.createdAt).getTime();
      expect(createdAtMs).toBeGreaterThanOrEqual(before);
      expect(createdAtMs).toBeLessThanOrEqual(after);
      expect(item.updatedAt).toBe(item.createdAt);
    });
  });

  describe("addOptimisticSaleItem", () => {
    it("adds item and recalculates totals for contado sale", () => {
      queryClient.setQueryData(
        queryKeys.sales.detail(saleId),
        createMockSale({ totalAmount: "100", amountPaid: "100", balanceDue: "0", items: [] })
      );

      const item = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 2,
        unitPrice: 15,
        subtotal: 30,
      });

      addOptimisticSaleItem(queryClient, saleId, item);

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale).not.toBeNull();
      expect(sale!.items).toHaveLength(1);
      expect(sale!.totalAmount).toBe("130");
      expect(sale!.balanceDue).toBe("0");
    });

    it("recalculates balanceDue for credit sale", () => {
      queryClient.setQueryData(
        queryKeys.sales.detail(saleId),
        createMockSale({
          saleType: "credito",
          paymentMode: "debe_todo",
          totalAmount: "100",
          amountPaid: "0",
          balanceDue: "100",
          items: [],
        })
      );

      const item = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 1,
        unitPrice: 50,
        subtotal: 50,
      });

      addOptimisticSaleItem(queryClient, saleId, item);

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale!.totalAmount).toBe("150");
      expect(sale!.balanceDue).toBe("150");
    });

    it("does nothing when sale is not in cache", () => {
      const item = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 1,
        unitPrice: 10,
        subtotal: 10,
      });

      addOptimisticSaleItem(queryClient, saleId, item);

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale).toBeUndefined();
    });

    it("appends item to existing items", () => {
      const existingItem = buildOptimisticSaleItem({
        productId: "p0",
        variantId: "v0",
        productName: "Existing",
        variantName: "Variant",
        quantity: 1,
        unitPrice: 10,
        subtotal: 10,
      });
      existingItem.id = "existing-1";
      existingItem.isOptimistic = false;

      queryClient.setQueryData(
        queryKeys.sales.detail(saleId),
        createMockSale({ totalAmount: "10", amountPaid: "10", balanceDue: "0", items: [existingItem] })
      );

      const newItem = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 1,
        unitPrice: 20,
        subtotal: 20,
      });

      addOptimisticSaleItem(queryClient, saleId, newItem);

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale!.items).toHaveLength(2);
      expect(sale!.totalAmount).toBe("30");
    });
  });

  describe("replaceOptimisticSaleItem", () => {
    it("replaces optimistic item with real one and removes isOptimistic flag", () => {
      const optimisticItem = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 2,
        unitPrice: 15,
        subtotal: 30,
      });

      queryClient.setQueryData(
        queryKeys.sales.detail(saleId),
        createMockSale({ totalAmount: "130", amountPaid: "130", balanceDue: "0", items: [optimisticItem] })
      );

      const realItem: SaleWithItems["items"][number] = {
        id: "real-1",
        businessId: "biz-1",
        saleId,
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: "2",
        orderedQuantity: null,
        deliveredQuantity: null,
        unitPrice: "15",
        unitPriceQuoted: null,
        unitPriceFinal: null,
        subtotal: "30",
        isModified: false,
        originalQuantity: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      replaceOptimisticSaleItem(queryClient, saleId, optimisticItem.id, realItem);

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale!.items).toHaveLength(1);
      expect(sale!.items[0].id).toBe("real-1");
      expect(sale!.items[0].isOptimistic).toBe(false);
    });

    it("does nothing when sale is not in cache", () => {
      const realItem: SaleWithItems["items"][number] = {
        id: "real-1",
        businessId: "biz-1",
        saleId,
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: "1",
        orderedQuantity: null,
        deliveredQuantity: null,
        unitPrice: "10",
        unitPriceQuoted: null,
        unitPriceFinal: null,
        subtotal: "10",
        isModified: false,
        originalQuantity: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      replaceOptimisticSaleItem(queryClient, saleId, "opt-123", realItem);

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale).toBeUndefined();
    });
  });

  describe("removeOptimisticSaleItem", () => {
    it("removes item and recalculates totals", () => {
      const item1 = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 1,
        unitPrice: 30,
        subtotal: 30,
      });
      item1.id = "item-1";
      item1.isOptimistic = false;

      const item2 = buildOptimisticSaleItem({
        productId: "p2",
        variantId: "v2",
        productName: "Pavo",
        variantName: "Trozado",
        quantity: 1,
        unitPrice: 20,
        subtotal: 20,
      });
      item2.id = "item-2";
      item2.isOptimistic = false;

      queryClient.setQueryData(
        queryKeys.sales.detail(saleId),
        createMockSale({ totalAmount: "50", amountPaid: "50", balanceDue: "0", items: [item1, item2] })
      );

      removeOptimisticSaleItem(queryClient, saleId, "item-1");

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale!.items).toHaveLength(1);
      expect(sale!.items[0].id).toBe("item-2");
      expect(sale!.totalAmount).toBe("20");
    });

    it("does nothing when item is not found", () => {
      const item = buildOptimisticSaleItem({
        productId: "p1",
        variantId: "v1",
        productName: "Pollo",
        variantName: "Entero",
        quantity: 1,
        unitPrice: 10,
        subtotal: 10,
      });
      item.id = "item-1";
      item.isOptimistic = false;

      queryClient.setQueryData(
        queryKeys.sales.detail(saleId),
        createMockSale({ totalAmount: "10", amountPaid: "10", balanceDue: "0", items: [item] })
      );

      removeOptimisticSaleItem(queryClient, saleId, "non-existent");

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale!.items).toHaveLength(1);
      expect(sale!.totalAmount).toBe("10");
    });

    it("does nothing when sale is not in cache", () => {
      removeOptimisticSaleItem(queryClient, saleId, "item-1");

      const sale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
      expect(sale).toBeUndefined();
    });
  });
});
