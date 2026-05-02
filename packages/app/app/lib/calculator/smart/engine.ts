import type { CalculationResult, UnitType } from "../types";
import { getSmartCalculatorStrategy } from "./strategy-registry";
import type {
	CalculatorUiField,
	SmartCalculatorChange,
	SmartCalculatorFormField,
	SmartCalculatorFormValues,
	SmartCalculatorInitialValues,
	SmartCalculatorPatch,
	SmartCalculatorUiValues,
} from "./types";

export function getSmartCalculatorUnitType(product?: { unit?: string }): UnitType {
	return product?.unit === "kg" ? "kg" : "unidad";
}

export function normalizeSmartCalculatorValues(
	values?: Partial<SmartCalculatorFormValues>,
): SmartCalculatorFormValues {
	return {
		totalAmount: values?.totalAmount ?? "",
		pricePerKg: values?.pricePerKg ?? "",
		kilos: values?.kilos ?? "",
		tara: values?.tara ?? "0",
		pricePerPack: values?.pricePerPack ?? "",
		packs: values?.packs ?? "",
		units: values?.units ?? "",
	};
}

export function getSmartCalculatorDefaults(input: {
	unitType: UnitType;
	defaultPrice?: string;
	initialValues?: SmartCalculatorInitialValues;
}): SmartCalculatorFormValues {
	const strategy = getSmartCalculatorStrategy(input.unitType);
	const initialValues =
		input.initialValues?.isKgProduct === undefined ||
		input.initialValues.isKgProduct === (input.unitType === "kg")
			? input.initialValues
			: undefined;

	return strategy.getDefaults({
		defaultPrice: input.defaultPrice,
		initialValues,
	});
}

export function clearSmartCalculator(input: {
	unitType: UnitType;
	defaultPrice?: string;
}): SmartCalculatorFormValues {
	return getSmartCalculatorStrategy(input.unitType).clear({
		defaultPrice: input.defaultPrice,
	});
}

export function mapSmartCalculatorValuesToUi(input: {
	unitType: UnitType;
	values?: Partial<SmartCalculatorFormValues>;
}): SmartCalculatorUiValues {
	return getSmartCalculatorStrategy(input.unitType).mapToUiValues(
		normalizeSmartCalculatorValues(input.values),
	);
}

export function getSmartCalculatorFormField(input: {
	unitType: UnitType;
	field: CalculatorUiField;
}): SmartCalculatorFormField {
	return getSmartCalculatorStrategy(input.unitType).getFormFieldForUiField(
		input.field,
	);
}

export function applySmartCalculatorChange(input: {
	unitType: UnitType;
	values: SmartCalculatorFormValues;
	change: SmartCalculatorChange;
	autoCalculateField: "price" | "quantity" | "total";
	variantPrice?: string;
	unitQuantity?: number;
}): SmartCalculatorPatch {
	return getSmartCalculatorStrategy(input.unitType).applyChange({
		values: input.values,
		change: input.change,
		autoCalculateField: input.autoCalculateField,
		context: {
			unitType: input.unitType,
			variantPrice: input.variantPrice,
			unitQuantity: input.unitQuantity,
		},
	});
}

export function calculateSmartCalculatorResult(input: {
	unitType: UnitType;
	values: SmartCalculatorFormValues;
	variantPrice?: string;
	unitQuantity?: number;
}): CalculationResult {
	return getSmartCalculatorStrategy(input.unitType).calculateResult({
		values: input.values,
		variantPrice: input.variantPrice,
		unitQuantity: input.unitQuantity,
	});
}
