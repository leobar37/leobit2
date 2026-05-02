import type { CalculationResult, UnitType } from "../types";

export type CalculatorUiField = "price" | "quantity" | "total" | "tara";
export type CalculatorTargetField = "price" | "quantity" | "total";

export type SmartCalculatorFormField =
	| "totalAmount"
	| "pricePerKg"
	| "kilos"
	| "tara"
	| "pricePerPack"
	| "packs"
	| "units";

export interface SmartCalculatorFormValues {
	totalAmount: string;
	pricePerKg: string;
	kilos: string;
	tara: string;
	pricePerPack: string;
	packs: string;
	units: string;
}

export interface SmartCalculatorUiValues {
	price: string;
	quantity: string;
	total: string;
	tara: string;
}

export interface SmartCalculatorInitialValues {
	quantity: string;
	unitPrice: string;
	subtotal: string;
	isKgProduct?: boolean;
}

export interface SmartCalculatorContext {
	unitType: UnitType;
	defaultPrice?: string;
	variantPrice?: string;
	unitQuantity?: number;
}

export interface SmartCalculatorChange {
	field: CalculatorUiField | SmartCalculatorFormField;
	value: string;
}

export type SmartCalculatorPatch = Partial<SmartCalculatorFormValues>;

export interface SmartCalculatorApplyChangeInput {
	values: SmartCalculatorFormValues;
	change: SmartCalculatorChange;
	autoCalculateField: CalculatorTargetField;
	context: SmartCalculatorContext;
}

export interface SmartCalculatorDefaultsInput {
	defaultPrice?: string;
	initialValues?: SmartCalculatorInitialValues;
}

export interface SmartCalculatorStrategy {
	unitType: UnitType;
	getDefaults(input: SmartCalculatorDefaultsInput): SmartCalculatorFormValues;
	clear(input: { defaultPrice?: string }): SmartCalculatorFormValues;
	mapToUiValues(values: Partial<SmartCalculatorFormValues>): SmartCalculatorUiValues;
	getFormFieldForUiField(field: CalculatorUiField): SmartCalculatorFormField;
	applyChange(input: SmartCalculatorApplyChangeInput): SmartCalculatorPatch;
	calculateResult(input: {
		values: SmartCalculatorFormValues;
		variantPrice?: string;
		unitQuantity?: number;
	}): CalculationResult;
}
