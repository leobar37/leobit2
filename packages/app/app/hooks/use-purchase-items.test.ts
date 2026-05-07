import { describe, it, expect, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Window } from "happy-dom";
import { usePurchaseItems } from "./use-purchase-items";

beforeAll(() => {
  const window = new Window();
  global.document = window.document as unknown as Document;
  global.window = window as unknown as Window & typeof globalThis;
});

describe("usePurchaseItems", () => {
  const sampleItem = {
    productId: "prod-1",
    variantId: "var-1",
    unitId: "unit-1",
    productName: "Pollo",
    variantName: "Entero",
    quantity: "10",
    unitCost: "25.00",
    totalCost: "250.00",
  };

  it("should start with empty items", () => {
    const { result } = renderHook(() => usePurchaseItems());
    expect(result.current.items).toEqual([]);
    expect(result.current.cartItemsCount).toBe(0);
    expect(result.current.totalAmount).toBe(0);
  });

  it("should add an item with generated id", () => {
    const { result } = renderHook(() => usePurchaseItems());
    act(() => {
      result.current.addItem(sampleItem);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBeDefined();
    expect(result.current.items[0].productName).toBe("Pollo");
    expect(result.current.cartItemsCount).toBe(1);
    expect(result.current.totalAmount).toBe(250);
  });

  it("should remove an item by id", () => {
    const { result } = renderHook(() => usePurchaseItems());
    act(() => {
      result.current.addItem(sampleItem);
    });
    const id = result.current.items[0].id;
    act(() => {
      result.current.removeItem(id);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("should update an item", () => {
    const { result } = renderHook(() => usePurchaseItems());
    act(() => {
      result.current.addItem(sampleItem);
    });
    const id = result.current.items[0].id;
    act(() => {
      result.current.updateItem(id, { quantity: "20", totalCost: "500.00" });
    });
    expect(result.current.items[0].quantity).toBe("20");
    expect(result.current.totalAmount).toBe(500);
  });

  it("should calculate total amount correctly", () => {
    const { result } = renderHook(() => usePurchaseItems());
    act(() => {
      result.current.addItem(sampleItem);
      result.current.addItem({ ...sampleItem, totalCost: "100.00" });
    });
    expect(result.current.totalAmount).toBe(350);
  });

  it("should set items directly", () => {
    const { result } = renderHook(() => usePurchaseItems());
    act(() => {
      result.current.setItems([
        { ...sampleItem, id: "existing-id" },
      ]);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe("existing-id");
  });
});
