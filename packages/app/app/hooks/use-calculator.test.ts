import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { renderHook, act } from "@testing-library/react";
import { useCalculator } from "./use-calculator";
import type { Product } from "@avileo/shared";
import type { ProductVariant } from "~/hooks/use-product-variants";

// Mock product and variant
const mockKgProduct: Product = {
	id: "prod-1",
	name: "Pollo",
	unit: "kg",
	businessId: "biz-1",
	createdAt: new Date(),
	updatedAt: new Date(),
	deletedAt: null,
};

const mockUnitProduct: Product = {
	id: "prod-2",
	name: "Alitas",
	unit: "unidad",
	businessId: "biz-1",
	createdAt: new Date(),
	updatedAt: new Date(),
	deletedAt: null,
};

const mockVariant: ProductVariant = {
	id: "var-1",
	productId: "prod-1",
	name: "1kg",
	price: "12.00",
	unitQuantity: "1",
	isActive: true,
	businessId: "biz-1",
	createdAt: new Date(),
	updatedAt: new Date(),
	deletedAt: null,
};

const mockUnitVariant: ProductVariant = {
	id: "var-2",
	productId: "prod-2",
	name: "Pack 10",
	price: "25.00",
	unitQuantity: "10",
	isActive: true,
	businessId: "biz-1",
	createdAt: new Date(),
	updatedAt: new Date(),
	deletedAt: null,
};

describe("useCalculator", () => {
	describe("initial state", () => {
		it("should initialize with empty values for kg product", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			expect(result.current.isKgProduct).toBe(true);
			expect(result.current.formValues).toEqual({
				totalAmount: "",
				pricePerKg: "",
				kilos: "",
				tara: "0",
			});
		});

		it("should initialize with empty values for unit product", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockUnitProduct,
					variant: mockUnitVariant,
				}),
			);

			expect(result.current.isKgProduct).toBe(false);
			expect(result.current.formValues).toEqual({
				totalAmount: "",
				packs: "",
				pricePerPack: "",
				units: "",
			});
		});

		it("should use initialPrice when autoFillPrice is true", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
					initialPrice: "15.50",
					autoFillPrice: true,
				}),
			);

			expect(result.current.form.getValues("pricePerKg")).toBe("15.50");
		});

		it("should not use initialPrice when autoFillPrice is false", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
					initialPrice: "15.50",
					autoFillPrice: false,
				}),
			);

			expect(result.current.form.getValues("pricePerKg")).toBe("");
		});

		it("should have isValid false initially", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			expect(result.current.isValid).toBe(false);
			expect(result.current.calculation.isValid).toBe(false);
		});
	});

	describe("field updates", () => {
		it("should update field value", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("totalAmount", "100.50");
			});

			expect(result.current.form.getValues("totalAmount")).toBe("100.50");
		});

		it("should update multiple fields", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("pricePerKg", "10");
				result.current.setFieldValue("kilos", "5");
			});

			expect(result.current.form.getValues("pricePerKg")).toBe("10");
			expect(result.current.form.getValues("kilos")).toBe("5");
		});
	});

	describe("auto-calculation for kg products", () => {
		it("should calculate totalAmount when pricePerKg and kilos are set", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("pricePerKg", "10");
			});

			act(() => {
				result.current.setFieldValue("kilos", "5");
			});

			expect(result.current.form.getValues("totalAmount")).toBe("50.00");
		});

		it("should calculate pricePerKg when totalAmount and kilos are set", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("totalAmount", "100");
			});

			act(() => {
				result.current.setFieldValue("kilos", "5");
			});

			expect(result.current.form.getValues("pricePerKg")).toBe("20.00");
		});

		it("should calculate kilos when totalAmount and pricePerKg are set", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("totalAmount", "75");
			});

			act(() => {
				result.current.setFieldValue("pricePerKg", "15");
			});

			expect(result.current.form.getValues("kilos")).toBe("5.000");
		});

		it("should account for tara when calculating", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("pricePerKg", "10");
			});

			act(() => {
				result.current.setFieldValue("kilos", "5.5");
			});

			act(() => {
				result.current.setFieldValue("tara", "0.5");
			});

			// Net weight = 5.5 - 0.5 = 5kg, total = 5 * 10 = 50
			expect(result.current.form.getValues("totalAmount")).toBe("50.00");
		});
	});

	describe("calculation results", () => {
		it("should calculate correct values for kg product", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("pricePerKg", "12");
				result.current.setFieldValue("kilos", "5");
			});

			expect(result.current.calculation).toMatchObject({
				kgNeto: 5,
				unitPrice: 12,
				quantity: 5,
				subtotal: 60,
				isValid: true,
			});
		});

		it("should calculate correct values for unit product", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockUnitProduct,
					variant: mockUnitVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("packs", "2");
			});

			// 2 packs * 10 units/pack * 2.50 per unit = 50
			expect(result.current.calculation.quantity).toBe(20);
			expect(result.current.calculation.subtotal).toBe(50);
			expect(result.current.calculation.isValid).toBe(true);
		});

		it("should use variant price when pricePerKg is empty", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("kilos", "3");
			});

			// Should use variant price of 12.00
			expect(result.current.calculation.unitPrice).toBe(12);
			expect(result.current.calculation.subtotal).toBe(36);
		});
	});

	describe("handleClear", () => {
		it("should reset all fields for kg product", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
					initialPrice: "15.00",
					autoFillPrice: true,
				}),
			);

			act(() => {
				result.current.setFieldValue("totalAmount", "100");
				result.current.setFieldValue("pricePerKg", "20");
				result.current.setFieldValue("kilos", "5");
				result.current.setFieldValue("tara", "1");
			});

			act(() => {
				result.current.handleClear();
			});

			expect(result.current.form.getValues()).toEqual({
				totalAmount: "",
				pricePerKg: "15.00",
				kilos: "",
				tara: "0",
			});
		});

		it("should reset all fields for unit product", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockUnitProduct,
					variant: mockUnitVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("totalAmount", "100");
				result.current.setFieldValue("packs", "5");
				result.current.setFieldValue("units", "50");
			});

			act(() => {
				result.current.handleClear();
			});

			expect(result.current.form.getValues()).toEqual({
				totalAmount: "",
				packs: "",
				pricePerPack: "",
				units: "",
			});
		});

		it("should reset isValid to false", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("pricePerKg", "10");
				result.current.setFieldValue("kilos", "5");
			});

			expect(result.current.isValid).toBe(true);

			act(() => {
				result.current.handleClear();
			});

			expect(result.current.isValid).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should handle null product", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: undefined,
					variant: undefined,
				}),
			);

			expect(result.current.calculation.isValid).toBe(false);
			expect(result.current.calculation.subtotal).toBe(0);
		});

		it("should handle empty variant price", () => {
			const variantWithoutPrice: ProductVariant = {
				...mockVariant,
				price: "",
			};

			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: variantWithoutPrice,
				}),
			);

			act(() => {
				result.current.setFieldValue("kilos", "5");
			});

			// Without price and without pricePerKg, should be invalid
			expect(result.current.calculation.isValid).toBe(false);
		});

		it("should not auto-calculate when only 1 field is filled", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("pricePerKg", "10");
			});

			expect(result.current.form.getValues("totalAmount")).toBe("");
			expect(result.current.form.getValues("kilos")).toBe("");
		});

		it("should handle zero values correctly", () => {
			const { result } = renderHook(() =>
				useCalculator({
					product: mockKgProduct,
					variant: mockVariant,
				}),
			);

			act(() => {
				result.current.setFieldValue("pricePerKg", "0");
				result.current.setFieldValue("kilos", "5");
			});

			expect(result.current.calculation.isValid).toBe(false);
		});
	});
});
