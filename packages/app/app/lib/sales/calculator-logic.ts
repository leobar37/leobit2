import type { Product } from "~/lib/db/schema";
import { formatNumber } from "~/lib/utils";
import type { ProductVariant } from "~/hooks/use-product-variants";
import type { CartItem } from "./types";
import { parseNumber } from "./calculator-schema";

export interface KgCalculationInput {
	kilos: string;
	tara: string;
	pricePerKg: string;
	totalAmount: string;
}

export interface UnitCalculationInput {
	packs: string;
	units: string;
	totalAmount: string;
}

export interface CalculationResult {
	/** Net weight (kg - tara) */
	kgNeto: number;
	/** Unit price (price per kg or calculated) */
	unitPrice: number;
	/** Total quantity (kg for kg products, units for unit products) */
	quantity: number;
	/** Subtotal for the line item */
	subtotal: number;
	/** Whether the calculation is valid */
	isValid: boolean;
}

/**
 * Calculate net weight from gross weight and tare
 */
export function calculateKgNeto(kilos: string, tara: string): number {
	const kg = parseNumber(kilos);
	const taraNum = parseNumber(tara);
	return Math.max(0, kg - taraNum);
}

/**
 * Calculate kg-based product values
 */
export function calculateKgProduct(
	input: KgCalculationInput,
	variantPrice: string,
): CalculationResult {
	const kgNeto = calculateKgNeto(input.kilos, input.tara);
	const pricePerKg = parseNumber(input.pricePerKg || variantPrice);
	const totalFromInput = parseNumber(input.totalAmount);

	// Determine unit price and subtotal
	let unitPrice = pricePerKg;
	let subtotal: number;

	if (totalFromInput > 0 && kgNeto > 0) {
		// User entered total, calculate price per kg
		unitPrice = parseFloat((totalFromInput / kgNeto).toFixed(2));
		subtotal = totalFromInput;
	} else {
		subtotal = parseFloat((kgNeto * unitPrice).toFixed(2));
	}

	return {
		kgNeto,
		unitPrice,
		quantity: kgNeto,
		subtotal,
		isValid: kgNeto > 0 && unitPrice > 0 && subtotal > 0,
	};
}

/**
 * Calculate unit-based product values
 */
export function calculateUnitProduct(
	input: UnitCalculationInput,
	variant: ProductVariant,
	product: Product,
): CalculationResult {
	const unitQuantity = Math.max(1, parseNumber(variant.unitQuantity || "1") || 1);
	const variantPrice = parseNumber(variant.price || "0");

	const packs = parseNumber(input.packs);
	const units = parseNumber(input.units);

	// Calculate total units
	const quantityUnits = packs > 0 ? packs * unitQuantity : units;

	if (quantityUnits <= 0) {
		return {
			kgNeto: 0,
			unitPrice: 0,
			quantity: 0,
			subtotal: 0,
			isValid: false,
		};
	}

	const totalFromInput = parseNumber(input.totalAmount);

	// Calculate subtotal
	const initialSubtotal =
		totalFromInput > 0
			? totalFromInput
			: packs > 0
				? packs * variantPrice
				: quantityUnits * (unitQuantity > 0 ? variantPrice / unitQuantity : 0);

	// Recalculate unit price from subtotal
	const unitPrice =
		quantityUnits > 0
			? parseFloat((initialSubtotal / quantityUnits).toFixed(2))
			: 0;

	const finalSubtotal = parseFloat((quantityUnits * unitPrice).toFixed(2));

	return {
		kgNeto: 0,
		unitPrice,
		quantity: quantityUnits,
		subtotal: finalSubtotal,
		isValid: finalSubtotal > 0 && unitPrice > 0,
	};
}

/**
 * Create a cart item from calculation result
 */
export function createCartItem(
	product: Product,
	variant: ProductVariant,
	calculation: CalculationResult,
): CartItem | null {
	if (!calculation.isValid) {
		return null;
	}

	return {
		productId: product.id,
		variantId: variant.id,
		productName: product.name,
		variantName: variant.name,
		unit: product.unit as "kg" | "unidad",
		variantUnitQuantity:
			product.unit === "unidad"
				? Math.max(1, parseNumber(variant.unitQuantity || "1") || 1)
				: 1,
		quantity: calculation.quantity,
		unitPrice: calculation.unitPrice,
		subtotal: calculation.subtotal,
	};
}

/**
 * Auto-calculate missing field in kg calculator
 * When 2 of 3 fields are filled, calculate the third
 */
export function autoCalculateKgField(
	values: KgCalculationInput,
	activeField: keyof KgCalculationInput | null,
): Partial<KgCalculationInput> {
	const kgNeto = calculateKgNeto(values.kilos, values.tara);
	const price = parseNumber(values.pricePerKg);
	const total = parseNumber(values.totalAmount);

	// If user is editing tara, recalculate total
	if (activeField === "tara" && price > 0 && kgNeto > 0) {
		return {
			totalAmount: formatNumber(price * kgNeto),
		};
	}

	const filledFields = [
		values.totalAmount && "totalAmount",
		values.pricePerKg && "pricePerKg",
		values.kilos && "kilos",
	].filter(Boolean);

	if (filledFields.length !== 2) {
		return {};
	}

	// Calculate missing total
	if (!values.totalAmount && price > 0 && kgNeto > 0) {
		return { totalAmount: formatNumber(price * kgNeto) };
	}

	// Calculate missing price per kg
	if (!values.pricePerKg && total > 0 && kgNeto > 0) {
		return { pricePerKg: formatNumber(total / kgNeto) };
	}

	// Calculate missing kilos
	if (!values.kilos && total > 0 && price > 0) {
		const taraNum = parseNumber(values.tara);
		const kgBruto = total / price + taraNum;
		return { kilos: kgBruto.toFixed(3) };
	}

	return {};
}
