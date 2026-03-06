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
 * When 3 fields are filled, recalculate the oldest field (smart recalculate)
 */
export function autoCalculateKgField(
	values: AutoCalculateInput,
	activeField: KgCalculatorFieldName | null,
	timestamps?: { totalAmount: number; pricePerKg: number; kilos: number; tara: number },
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

	// Check which of the 3 main fields are filled
	const mainFields: Array<{ name: "totalAmount" | "pricePerKg" | "kilos"; value: string }> = [
		{ name: "totalAmount", value: values.totalAmount },
		{ name: "pricePerKg", value: values.pricePerKg },
		{ name: "kilos", value: values.kilos },
	];

	const filledMainFields = mainFields.filter((f) => f.value);
	const emptyMainFields = mainFields.filter((f) => !f.value);

	// Case 1: Exactly 2 fields filled - calculate the missing one (standard behavior)
	if (filledMainFields.length === 2 && emptyMainFields.length === 1) {
		const missingField = emptyMainFields[0].name;

		// Calculate missing total
		if (missingField === "totalAmount" && price > 0 && kgNeto > 0) {
			return { totalAmount: (price * kgNeto).toFixed(2) };
		}

		// Calculate missing price per kg
		if (missingField === "pricePerKg" && total > 0 && kgNeto > 0) {
			return { pricePerKg: (total / kgNeto).toFixed(2) };
		}

		// Calculate missing kilos
		if (missingField === "kilos" && total > 0 && price > 0) {
			const taraNum = parseNumber(values.tara);
			const kgBruto = total / price + taraNum;
			return { kilos: kgBruto.toFixed(3) };
		}
	}

	// Case 2: All 3 fields filled + timestamps available - smart recalculate (Option 1)
	if (filledMainFields.length === 3 && timestamps && activeField) {
		// Find the field with the oldest timestamp (excluding the active field being edited)
		const fieldEntries: Array<{ name: "totalAmount" | "pricePerKg" | "kilos"; timestamp: number }> = [
			{ name: "totalAmount", timestamp: timestamps.totalAmount },
			{ name: "pricePerKg", timestamp: timestamps.pricePerKg },
			{ name: "kilos", timestamp: timestamps.kilos },
		];

		// Filter out the active field and find oldest
		const otherFields = fieldEntries.filter((f) => f.name !== activeField);
		const oldestField = otherFields.reduce((oldest, current) =>
			current.timestamp < oldest.timestamp ? current : oldest,
		);

		// Recalculate the oldest field based on the other two
		if (oldestField.name === "totalAmount" && price > 0 && kgNeto > 0) {
			return { totalAmount: (price * kgNeto).toFixed(2) };
		}

		if (oldestField.name === "pricePerKg" && total > 0 && kgNeto > 0) {
			return { pricePerKg: (total / kgNeto).toFixed(2) };
		}

		if (oldestField.name === "kilos" && total > 0 && price > 0) {
			const taraNum = parseNumber(values.tara);
			const kgBruto = total / price + taraNum;
			return { kilos: kgBruto.toFixed(3) };
		}
	}

	return {};
}

/**
 * Auto-calculate missing field in unit calculator
 * When 2 of 3 fields are filled, calculate the third
 * When 3 fields are filled, recalculate the oldest field (smart recalculate)
 */
export function autoCalculateUnitField(
	values: { totalAmount: string; packs: string; units: string },
	activeField: "totalAmount" | "packs" | "units" | null,
	unitQuantity: number,
	timestamps?: { totalAmount: number; packs: number; units: number },
): Partial<{ totalAmount: string; packs: string; units: string }> {
	const total = parseNumber(values.totalAmount);
	const packs = parseNumber(values.packs);
	const units = parseNumber(values.units);
	const unitsPerPack = Math.max(1, unitQuantity);

	// Check which of the 3 main fields are filled
	const mainFields: Array<{ name: "totalAmount" | "packs" | "units"; value: string }> = [
		{ name: "totalAmount", value: values.totalAmount },
		{ name: "packs", value: values.packs },
		{ name: "units", value: values.units },
	];

	const filledMainFields = mainFields.filter((f) => f.value);
	const emptyMainFields = mainFields.filter((f) => !f.value);

	// Case 1: Exactly 2 fields filled - calculate the missing one (standard behavior)
	if (filledMainFields.length === 2 && emptyMainFields.length === 1) {
		const missingField = emptyMainFields[0].name;

		// Calculate missing total
		if (missingField === "totalAmount") {
			if (packs > 0) {
				// Calculate from packs
				const unitPrice = units > 0 ? total / units : 0;
				const totalUnits = packs * unitsPerPack;
				return { totalAmount: (totalUnits * unitPrice).toFixed(2) };
			} else if (units > 0 && total > 0) {
				// Keep current total if units exist and total was entered
				return {};
			}
		}

		// Calculate missing packs
		if (missingField === "packs" && units > 0) {
			const calculatedPacks = Math.ceil(units / unitsPerPack);
			return { packs: calculatedPacks.toString() };
		}

		// Calculate missing units
		if (missingField === "units" && packs > 0) {
			const calculatedUnits = packs * unitsPerPack;
			return { units: calculatedUnits.toString() };
		}
	}

	// Case 2: All 3 fields filled + timestamps available - smart recalculate
	if (filledMainFields.length === 3 && timestamps && activeField) {
		// Find the field with the oldest timestamp (excluding the active field being edited)
		const fieldEntries: Array<{ name: "totalAmount" | "packs" | "units"; timestamp: number }> = [
			{ name: "totalAmount", timestamp: timestamps.totalAmount },
			{ name: "packs", timestamp: timestamps.packs },
			{ name: "units", timestamp: timestamps.units },
		];

		// Filter out the active field and find oldest
		const otherFields = fieldEntries.filter((f) => f.name !== activeField);
		const oldestField = otherFields.reduce((oldest, current) =>
			current.timestamp < oldest.timestamp ? current : oldest,
		);

		// Recalculate the oldest field based on the other two
		if (oldestField.name === "totalAmount" && packs > 0) {
			const unitPrice = units > 0 && total > 0 ? total / units : 0;
			const totalUnits = packs * unitsPerPack;
			return { totalAmount: (totalUnits * unitPrice).toFixed(2) };
		}

		if (oldestField.name === "packs" && units > 0) {
			const calculatedPacks = Math.ceil(units / unitsPerPack);
			return { packs: calculatedPacks.toString() };
		}

		if (oldestField.name === "units" && packs > 0) {
			const calculatedUnits = packs * unitsPerPack;
			return { units: calculatedUnits.toString() };
		}
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
