import { describe, expect, it } from "vitest";
import {
	applySmartCalculatorChange,
	calculateSmartCalculatorResult,
	getSmartCalculatorDefaults,
	mapSmartCalculatorValuesToUi,
} from "./engine";

describe("smart calculator engine", () => {
	it("maps kg form values to UI values", () => {
		expect(
			mapSmartCalculatorValuesToUi({
				unitType: "kg",
				values: {
					pricePerKg: "10",
					kilos: "5",
					totalAmount: "50",
					tara: "0.5",
				},
			}),
		).toEqual({
			price: "10",
			quantity: "5",
			total: "50",
			tara: "0.5",
		});
	});

	it("calculates kg total as one patch", () => {
		const values = getSmartCalculatorDefaults({ unitType: "kg" });
		const withPrice = applySmartCalculatorChange({
			unitType: "kg",
			values,
			change: { field: "price", value: "10" },
			autoCalculateField: "total",
		});

		const patch = applySmartCalculatorChange({
			unitType: "kg",
			values: { ...values, ...withPrice },
			change: { field: "quantity", value: "5" },
			autoCalculateField: "total",
		});

		expect(patch).toEqual({
			kilos: "5",
			totalAmount: "50.00",
		});
	});

	it("calculates kg quantity with tara as one patch", () => {
		const values = {
			...getSmartCalculatorDefaults({ unitType: "kg" }),
			totalAmount: "75",
			pricePerKg: "15",
			tara: "0.5",
		};

		expect(
			applySmartCalculatorChange({
				unitType: "kg",
				values,
				change: { field: "total", value: "75" },
				autoCalculateField: "quantity",
			}),
		).toEqual({
			totalAmount: "75",
			kilos: "5.500",
		});
	});

	it("does not overwrite the edited field when it is the auto target", () => {
		const values = {
			...getSmartCalculatorDefaults({ unitType: "kg" }),
			pricePerKg: "10",
			kilos: "5",
		};

		expect(
			applySmartCalculatorChange({
				unitType: "kg",
				values,
				change: { field: "total", value: "60" },
				autoCalculateField: "total",
			}),
		).toEqual({ totalAmount: "60" });
	});

	it("calculates unit total as one patch", () => {
		const values = {
			...getSmartCalculatorDefaults({ unitType: "unidad" }),
			pricePerPack: "25",
		};

		expect(
			applySmartCalculatorChange({
				unitType: "unidad",
				values,
				change: { field: "quantity", value: "2" },
				autoCalculateField: "total",
				unitQuantity: 10,
			}),
		).toEqual({
			packs: "2",
			totalAmount: "50.00",
		});
	});

	it("calculates result for unit products", () => {
		const values = {
			...getSmartCalculatorDefaults({ unitType: "unidad" }),
			packs: "2",
			pricePerPack: "25",
		};

		expect(
			calculateSmartCalculatorResult({
				unitType: "unidad",
				values,
				variantPrice: "25",
				unitQuantity: 10,
			}),
		).toMatchObject({
			quantity: 20,
			unitPrice: 2.5,
			subtotal: 50,
			isValid: true,
		});
	});
});
