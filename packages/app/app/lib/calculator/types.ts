/**
 * Shared calculator types for all calculators (sales, purchases, orders)
 */

// Base field types
export interface KgCalculatorFields {
	totalAmount: string;
	pricePerKg: string;
	kilos: string;
	tara: string;
}

export interface UnitCalculatorFields {
	totalAmount: string;
	pricePerPack: string;
	packs: string;
	units: string;
}

// Calculation result shared across all calculators
export interface CalculationResult {
	/** Net weight (for kg products) */
	kgNeto: number;
	/** Unit price (price per kg or per unit) */
	unitPrice: number;
	/** Total quantity (kg for kg products, units for unit products) */
	quantity: number;
	/** Subtotal for the line item */
	subtotal: number;
	/** Whether the calculation is valid */
	isValid: boolean;
}

// Auto-calculation input
export interface AutoCalculateInput {
	totalAmount: string;
	pricePerKg: string;
	kilos: string;
	tara: string;
}

// Field names for kg calculator
export type KgCalculatorFieldName = keyof KgCalculatorFields;

// Field names for unit calculator
export type UnitCalculatorFieldName = keyof UnitCalculatorFields;

// Unit types
export type UnitType = "kg" | "unidad";

// Calculator configuration
export interface CalculatorConfig {
	/** Unit type for this calculator */
	unitType: UnitType;
	/** Whether to auto-fill price from variant */
	autoFillPrice?: boolean;
	/** Whether to hide tara field */
	hideTara?: boolean;
	/** Default price to use */
	defaultPrice?: string;
}
