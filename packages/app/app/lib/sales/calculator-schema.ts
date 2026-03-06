import { z } from "zod";

/**
 * Schema for kg-based product calculator
 */
export const kgCalculatorSchema = z.object({
	totalAmount: z.string().default(""),
	pricePerKg: z.string().default(""),
	kilos: z.string().default(""),
	tara: z.string().default("0"),
});

/**
 * Schema for unit-based product calculator
 */
export const unitCalculatorSchema = z.object({
	totalAmount: z.string().default(""),
	pricePerPack: z.string().default(""),
	packs: z.string().default(""),
	units: z.string().default(""),
});

export type KgCalculatorFormData = z.infer<typeof kgCalculatorSchema>;
export type UnitCalculatorFormData = z.infer<typeof unitCalculatorSchema>;

/**
 * Union type for calculator form data
 */
export type CalculatorFormData = KgCalculatorFormData | UnitCalculatorFormData;

/**
 * Check if value is valid numeric text (digits with optional decimal)
 */
export function isNumericText(value: string): boolean {
	if (!value) return true;
	return /^\d*\.?\d*$/.test(value);
}

/**
 * Parse numeric string to number, returns 0 if invalid
 */
export function parseNumber(value: string): number {
	const parsed = parseFloat(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}
