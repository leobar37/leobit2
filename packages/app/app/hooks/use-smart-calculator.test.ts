import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSmartCalculator } from "./use-smart-calculator";
import type { ProductVariant } from "~/hooks/use-product-variants";

const kgProduct = {
  id: "prod-kg",
  unit: "kg",
};

const kgVariant: ProductVariant = {
  id: "var-kg",
  productId: "prod-kg",
  name: "Pollo entero",
  price: "12.50",
  unitQuantity: "1",
  isActive: true,
  businessId: "biz-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe("useSmartCalculator", () => {
  it("fills the selected variant price when autoFillPrice is enabled", () => {
    const { result } = renderHook(() =>
      useSmartCalculator({
        product: kgProduct,
        variant: kgVariant,
        initialPrice: kgVariant.price,
        autoFillPrice: true,
      }),
    );

    expect(result.current.form.getValues("pricePerKg")).toBe("12.50");
    expect(result.current.values.price).toBe("12.50");
  });

  it("leaves price empty when autoFillPrice is disabled", () => {
    const { result } = renderHook(() =>
      useSmartCalculator({
        product: kgProduct,
        variant: kgVariant,
        initialPrice: kgVariant.price,
        autoFillPrice: false,
      }),
    );

    expect(result.current.form.getValues("pricePerKg")).toBe("");
    expect(result.current.values.price).toBe("");
  });

  it("calculates kg sales with tara set to zero when hideTara is enabled", async () => {
    const { result } = renderHook(() =>
      useSmartCalculator({
        product: kgProduct,
        variant: kgVariant,
        initialPrice: kgVariant.price,
        autoFillPrice: true,
        hideTara: true,
      }),
    );

    expect(result.current.values.tara).toBe("0");

    await act(async () => {
      result.current.setFieldValue("quantity", "2");
    });

    expect(result.current.calculation.quantity).toBe(2);
    expect(result.current.calculation.subtotal).toBe(25);
    expect(result.current.calculation.isValid).toBe(true);
  });
});
