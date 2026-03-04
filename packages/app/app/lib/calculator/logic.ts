import type {
	KgCalculatorFields,
	UnitCalculatorFields,
	CalculationResult,
	AutoCalculateInput,
	KgCalculatorFieldName,
} from "./types";

/**
 * Parse a string to number, returning 0 if invalid
 */
export function parseNumber(value: string | undefined | null): number {
	if (value === undefined || value === null || value === "") {
		return 0;
	}
	const parsed = parseFloat(value);
	return Number.isNaN(parsed) ? 0 : parsed;
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
	input: KgCalculatorFields,
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
	input: {
		totalAmount: string;
		packs: string;
		units: string;
	},
	variantPrice: string,
	unitQuantity: number,
): CalculationResult {
	const packs = parseNumber(input.packs);
	const units = parseNumber(input.units);
	const variantPriceNum = parseNumber(variantPrice);

	// Calculate total units
	const quantityUnits =
		packs > 0 ? packs * Math.max(1, unitQuantity) : units;

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
				? packs * variantPriceNum
				: quantityUnits *
					(unitQuantity > 0 ? variantPriceNum / unitQuantity : 0);

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
 * Auto-calculate missing field in kg calculator
 * When 2 of 3 fields are filled, calculate the third
 */
export function autoCalculateKgField(
	values: AutoCalculateInput,
	activeField: KgCalculatorFieldName | null,
): Partial<KgCalculatorFields> {
	const kgNeto = calculateKgNeto(values.kilos, values.tara);
	const price = parseNumber(values.pricePerKg);
	const total = parseNumber(values.totalAmount);

	// If user is editing tara, recalculate total
	if (activeField === "tara" && price > 0 && kgNeto > 0) {
		return {
			totalAmount: (price * kgNeto).toFixed(2),
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
		return { totalAmount: (price * kgNeto).toFixed(2) };
	}

	// Calculate missing price per kg
	if (!values.pricePerKg && total > 0 && kgNeto > 0) {
		return { pricePerKg: (total / kgNeto).toFixed(2) };
	}

	// Calculate missing kilos
	if (!values.kilos && total > 0 && price > 0) {
		const taraNum = parseNumber(values.tara);
		const kgBruto = total / price + taraNum;
		return { kilos: kgBruto.toFixed(3) };
	}

	return {};
}

/**
 * Get default values for kg calculator
 */
export function getKgDefaultValues(
	defaultPrice: string = "",
): KgCalculatorFields {
	return {
		totalAmount: "",
		pricePerKg: defaultPrice,
		kilos: "",
		tara: "0",
	};
}

/**
 * Get default values for unit calculator
 */
export function getUnitDefaultValues(): UnitCalculatorFields {
	return {
		totalAmount: "",
		packs: "",
		units: "",
	};
}
