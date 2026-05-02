import { formatNumber } from "~/lib/utils";
import {
	calculateUnitProduct,
	getUnitDefaultValues,
	parseNumber,
} from "../../logic";
import type {
	CalculatorUiField,
	SmartCalculatorFormField,
	SmartCalculatorFormValues,
	SmartCalculatorPatch,
	SmartCalculatorStrategy,
} from "../types";

const unitFormFields = new Set<string>([
	"totalAmount",
	"pricePerPack",
	"packs",
	"units",
	"tara",
]);

function getSafeUnitQuantity(unitQuantity?: number): number {
	return Math.max(1, unitQuantity || 1);
}

function withOnlyUnitValues(values: SmartCalculatorFormValues): SmartCalculatorFormValues {
	return {
		...values,
		pricePerKg: "",
		kilos: "",
		tara: "0",
	};
}

function getUnitBaseDefaults(defaultPrice = ""): SmartCalculatorFormValues {
	return {
		...getUnitDefaultValues(defaultPrice),
		pricePerKg: "",
		kilos: "",
		tara: "0",
	};
}

function calculateTargetField(
	values: SmartCalculatorFormValues,
	targetField: "price" | "quantity" | "total",
	unitQuantity?: number,
): SmartCalculatorPatch {
	const packs = parseNumber(values.packs);
	const pricePerPack = parseNumber(values.pricePerPack);
	const total = parseNumber(values.totalAmount);
	const unitsPerPack = getSafeUnitQuantity(unitQuantity);

	if (targetField === "total" && pricePerPack > 0 && packs > 0) {
		return { totalAmount: formatNumber(packs * pricePerPack) };
	}

	if (targetField === "price" && total > 0 && packs > 0) {
		const unitPrice = total / (packs * unitsPerPack);
		return { pricePerPack: formatNumber(unitPrice * unitsPerPack) };
	}

	if (targetField === "quantity" && total > 0 && pricePerPack > 0) {
		const totalUnits = total / (pricePerPack / unitsPerPack);
		return { packs: Math.ceil(totalUnits / unitsPerPack).toString() };
	}

	return {};
}

function getUnitFormFieldForUiField(field: CalculatorUiField): SmartCalculatorFormField {
	if (field === "price") return "pricePerPack";
	if (field === "quantity") return "packs";
	if (field === "total") return "totalAmount";
	return "tara";
}

export const unitCalculatorStrategy: SmartCalculatorStrategy = {
	unitType: "unidad",

	getDefaults({ defaultPrice = "", initialValues }) {
		if (initialValues) {
			return {
				totalAmount: initialValues.subtotal || "",
				pricePerKg: "",
				kilos: "",
				tara: "0",
				pricePerPack: initialValues.unitPrice || "",
				packs: initialValues.quantity || "",
				units: "",
			};
		}

		return getUnitBaseDefaults(defaultPrice);
	},

	clear({ defaultPrice = "" }) {
		return getUnitBaseDefaults(defaultPrice);
	},

	mapToUiValues(values) {
		return {
			price: values.pricePerPack ?? "",
			quantity: values.packs ?? "",
			total: values.totalAmount ?? "",
			tara: "0",
		};
	},

	getFormFieldForUiField(field: CalculatorUiField): SmartCalculatorFormField {
		return getUnitFormFieldForUiField(field);
	},

	applyChange({ values, change, autoCalculateField, context }) {
		const field = unitFormFields.has(change.field)
			? (change.field as SmartCalculatorFormField)
			: getUnitFormFieldForUiField(change.field as CalculatorUiField);
		const nextValues = withOnlyUnitValues({ ...values, [field]: change.value });
		if (change.value === "") return { [field]: change.value };
		const calculated = calculateTargetField(nextValues, autoCalculateField, context.unitQuantity);
		delete calculated[field as keyof SmartCalculatorPatch];

		return {
			[field]: change.value,
			...calculated,
		};
	},

	calculateResult({ values, variantPrice = "0", unitQuantity }) {
		return calculateUnitProduct(values, variantPrice, getSafeUnitQuantity(unitQuantity));
	},
};
