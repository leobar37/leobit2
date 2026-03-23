import { describe, it, expect } from "vitest";
import {
	parseNumber,
	calculateKgNeto,
	calculateKgProduct,
	calculateUnitProduct,
	autoCalculateKgField,
	autoCalculateUnitField,
	getKgDefaultValues,
	getUnitDefaultValues,
} from "./logic";

describe("parseNumber", () => {
	it("returns 0 for empty string", () => {
		expect(parseNumber("")).toBe(0);
	});

	it("returns 0 for null", () => {
		expect(parseNumber(null)).toBe(0);
	});

	it("returns 0 for undefined", () => {
		expect(parseNumber(undefined)).toBe(0);
	});

	it("returns 0 for non-numeric string", () => {
		expect(parseNumber("abc")).toBe(0);
	});

	it("parses integer string", () => {
		expect(parseNumber("10")).toBe(10);
	});

	it("parses decimal string", () => {
		expect(parseNumber("10.5")).toBe(10.5);
	});

	it("parses zero string", () => {
		expect(parseNumber("0")).toBe(0);
	});

	it("parses negative number", () => {
		expect(parseNumber("-5")).toBe(-5);
	});
});

describe("calculateKgNeto", () => {
	it("subtracts tara from kilos", () => {
		expect(calculateKgNeto("5", "0.5")).toBe(4.5);
	});

	it("returns full kilos when tara is 0", () => {
		expect(calculateKgNeto("5", "0")).toBe(5);
	});

	it("returns 0 when tara equals kilos", () => {
		expect(calculateKgNeto("5", "5")).toBe(0);
	});

	it("returns 0 when tara exceeds kilos (no negative)", () => {
		expect(calculateKgNeto("3", "5")).toBe(0);
	});

	it("returns 0 for empty strings", () => {
		expect(calculateKgNeto("", "")).toBe(0);
	});
});

describe("calculateKgProduct", () => {
	it("calculates subtotal from price and kilos", () => {
		const result = calculateKgProduct(
			{ totalAmount: "", pricePerKg: "10", kilos: "5", tara: "0" },
			"0",
		);
		expect(result.kgNeto).toBe(5);
		expect(result.unitPrice).toBe(10);
		expect(result.subtotal).toBe(50);
		expect(result.isValid).toBe(true);
	});

	it("accounts for tara in kg calculation", () => {
		const result = calculateKgProduct(
			{ totalAmount: "", pricePerKg: "10", kilos: "5.5", tara: "0.5" },
			"0",
		);
		expect(result.kgNeto).toBe(5);
		expect(result.subtotal).toBe(50);
	});

	it("derives price per kg from totalAmount when provided", () => {
		const result = calculateKgProduct(
			{ totalAmount: "50", pricePerKg: "", kilos: "5", tara: "0" },
			"0",
		);
		expect(result.unitPrice).toBe(10);
		expect(result.subtotal).toBe(50);
		expect(result.isValid).toBe(true);
	});

	it("falls back to variantPrice when pricePerKg is empty", () => {
		const result = calculateKgProduct(
			{ totalAmount: "", pricePerKg: "", kilos: "5", tara: "0" },
			"12",
		);
		expect(result.unitPrice).toBe(12);
		expect(result.subtotal).toBe(60);
	});

	it("returns invalid when kilos is 0", () => {
		const result = calculateKgProduct(
			{ totalAmount: "", pricePerKg: "10", kilos: "0", tara: "0" },
			"0",
		);
		expect(result.isValid).toBe(false);
		expect(result.subtotal).toBe(0);
	});

	it("returns invalid when price is 0 and no totalAmount", () => {
		const result = calculateKgProduct(
			{ totalAmount: "", pricePerKg: "0", kilos: "5", tara: "0" },
			"0",
		);
		expect(result.isValid).toBe(false);
	});

	it("sets quantity equal to kgNeto", () => {
		const result = calculateKgProduct(
			{ totalAmount: "", pricePerKg: "10", kilos: "3.5", tara: "0.5" },
			"0",
		);
		expect(result.quantity).toBe(result.kgNeto);
		expect(result.quantity).toBe(3);
	});
});

describe("calculateUnitProduct", () => {
	it("calculates from packs with unit quantity", () => {
		const result = calculateUnitProduct(
			{ totalAmount: "", pricePerPack: "25", packs: "2", units: "" },
			"25",
			10,
		);
		expect(result.quantity).toBe(20);
		expect(result.subtotal).toBe(50);
		expect(result.isValid).toBe(true);
	});

	it("calculates from loose units when no packs", () => {
		const result = calculateUnitProduct(
			{ totalAmount: "", pricePerPack: "", packs: "", units: "5" },
			"25",
			10,
		);
		expect(result.quantity).toBe(5);
		expect(result.subtotal).toBeCloseTo(12.5);
	});

	it("uses totalAmount when provided, overriding calculated value", () => {
		const result = calculateUnitProduct(
			{ totalAmount: "60", pricePerPack: "25", packs: "2", units: "" },
			"25",
			10,
		);
		expect(result.subtotal).toBe(60);
	});

	it("handles unitQuantity of 1", () => {
		const result = calculateUnitProduct(
			{ totalAmount: "", pricePerPack: "10", packs: "3", units: "" },
			"10",
			1,
		);
		expect(result.quantity).toBe(3);
		expect(result.subtotal).toBe(30);
	});

	it("returns invalid when no quantity can be calculated", () => {
		const result = calculateUnitProduct(
			{ totalAmount: "", pricePerPack: "", packs: "", units: "" },
			"25",
			10,
		);
		expect(result.isValid).toBe(false);
		expect(result.quantity).toBe(0);
	});

	it("prefers pricePerPack from input over variantPrice", () => {
		const result = calculateUnitProduct(
			{ totalAmount: "", pricePerPack: "30", packs: "2", units: "" },
			"25",
			10,
		);
		expect(result.subtotal).toBe(60);
	});
});

describe("autoCalculateKgField", () => {
	it("returns empty when less than 2 fields are filled", () => {
		const result = autoCalculateKgField(
			{ totalAmount: "", pricePerKg: "10", kilos: "", tara: "0" },
			"pricePerKg",
		);
		expect(result).toEqual({});
	});

	it("calculates totalAmount when pricePerKg and kilos are filled", () => {
		const result = autoCalculateKgField(
			{ totalAmount: "", pricePerKg: "10", kilos: "5", tara: "0" },
			"kilos",
		);
		expect(result).toEqual({ totalAmount: "50.00" });
	});

	it("calculates pricePerKg when totalAmount and kilos are filled", () => {
		const result = autoCalculateKgField(
			{ totalAmount: "50", pricePerKg: "", kilos: "5", tara: "0" },
			"totalAmount",
		);
		expect(result).toEqual({ pricePerKg: "10.00" });
	});

	it("calculates kilos when totalAmount and pricePerKg are filled", () => {
		const result = autoCalculateKgField(
			{ totalAmount: "50", pricePerKg: "10", kilos: "", tara: "0" },
			"totalAmount",
		);
		expect(result.kilos).toBe("5.000");
	});

	it("recalculates total when tara changes", () => {
		const result = autoCalculateKgField(
			{ totalAmount: "55", pricePerKg: "10", kilos: "5.5", tara: "0.5" },
			"tara",
		);
		expect(result).toEqual({ totalAmount: "50.00" });
	});

	it("accounts for tara in totalAmount calculation", () => {
		const result = autoCalculateKgField(
			{ totalAmount: "", pricePerKg: "10", kilos: "5.5", tara: "0.5" },
			"kilos",
		);
		expect(result).toEqual({ totalAmount: "50.00" });
	});

	it("smart recalculates oldest field when all 3 are filled", () => {
		const now = Date.now();
		const result = autoCalculateKgField(
			{ totalAmount: "99", pricePerKg: "10", kilos: "5", tara: "0" },
			"kilos",
			{
				totalAmount: now - 3000,
				pricePerKg: now - 1000,
				kilos: now,
				tara: now - 5000,
			},
		);
		// totalAmount is oldest among non-active fields → recalculate it
		expect(result).toEqual({ totalAmount: "50.00" });
	});

	it("returns empty when all 3 filled but no timestamps", () => {
		const result = autoCalculateKgField(
			{ totalAmount: "50", pricePerKg: "10", kilos: "5", tara: "0" },
			"kilos",
		);
		expect(result).toEqual({});
	});
});

describe("autoCalculateUnitField", () => {
	it("returns empty when less than 3 fields are filled", () => {
		const result = autoCalculateUnitField(
			{ totalAmount: "", pricePerPack: "25", packs: "", units: "" },
			"pricePerPack",
			10,
		);
		expect(result).toEqual({});
	});

	it("calculates totalAmount when pricePerPack and packs are filled", () => {
		const result = autoCalculateUnitField(
			{ totalAmount: "", pricePerPack: "25", packs: "2", units: "2" },
			"packs",
			10,
		);
		expect(result).toEqual({ totalAmount: "50.00" });
	});

	it("calculates pricePerPack when totalAmount and packs are filled", () => {
		const result = autoCalculateUnitField(
			{ totalAmount: "50", pricePerPack: "", packs: "2", units: "2" },
			"totalAmount",
			10,
		);
		expect(result).toEqual({ pricePerPack: "25.00" });
	});

	it("calculates packs when totalAmount and pricePerPack are filled", () => {
		const result = autoCalculateUnitField(
			{ totalAmount: "50", pricePerPack: "25", packs: "", units: "5" },
			"totalAmount",
			10,
		);
		expect(result).toEqual({ packs: "2" });
	});

	it("case 1b: calculates packs from units when no packs field", () => {
		const result = autoCalculateUnitField(
			{ totalAmount: "25", pricePerPack: "25", packs: "", units: "5" },
			"units",
			10,
		);
		expect(result).toEqual({ packs: "1" });
	});

	it("case 1c: calculates pricePerPack from units+packs+total", () => {
		const result = autoCalculateUnitField(
			{ totalAmount: "50", pricePerPack: "", packs: "2", units: "5" },
			"units",
			10,
		);
		expect(result).toEqual({ pricePerPack: "25.00" });
	});

	it("smart recalculates oldest field when all 4 are filled", () => {
		const now = Date.now();
		const result = autoCalculateUnitField(
			{ totalAmount: "99", pricePerPack: "25", packs: "2", units: "2" },
			"packs",
			10,
			{
				totalAmount: now - 4000,
				pricePerPack: now - 1000,
				packs: now,
				units: now - 2000,
			},
		);
		// totalAmount is oldest non-active → recalculate
		expect(result).toEqual({ totalAmount: "50.00" });
	});
});

describe("getKgDefaultValues", () => {
	it("returns defaults with empty price when no arg", () => {
		expect(getKgDefaultValues()).toEqual({
			totalAmount: "",
			pricePerKg: "",
			kilos: "",
			tara: "0",
		});
	});

	it("sets pricePerKg from argument", () => {
		expect(getKgDefaultValues("12.50")).toEqual({
			totalAmount: "",
			pricePerKg: "12.50",
			kilos: "",
			tara: "0",
		});
	});
});

describe("getUnitDefaultValues", () => {
	it("returns defaults with empty price when no arg", () => {
		expect(getUnitDefaultValues()).toEqual({
			totalAmount: "",
			pricePerPack: "",
			packs: "",
			units: "",
		});
	});

	it("sets pricePerPack from argument", () => {
		expect(getUnitDefaultValues("25")).toEqual({
			totalAmount: "",
			pricePerPack: "25",
			packs: "",
			units: "",
		});
	});
});
