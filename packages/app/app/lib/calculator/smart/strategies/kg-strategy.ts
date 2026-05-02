import { formatNumber } from "~/lib/utils";
import {
	calculateKgProduct,
	getKgDefaultValues,
	parseNumber,
} from "../../logic";
import type {
	CalculatorUiField,
	SmartCalculatorFormField,
	SmartCalculatorFormValues,
	SmartCalculatorPatch,
	SmartCalculatorStrategy,
} from "../types";

const kgFormFields = new Set<string>([
	"totalAmount",
	"pricePerKg",
	"kilos",
	"tara",
]);

function withOnlyKgValues(values: SmartCalculatorFormValues): SmartCalculatorFormValues {
	return {
		...values,
		pricePerPack: "",
		packs: "",
		units: "",
	};
}

function getKgBaseDefaults(defaultPrice = ""): SmartCalculatorFormValues {
	return {
		...getKgDefaultValues(defaultPrice),
		pricePerPack: "",
		packs: "",
		units: "",
	};
}

function calculateTargetField(
	values: SmartCalculatorFormValues,
	targetField: "price" | "quantity" | "total",
): SmartCalculatorPatch {
	const kgNeto = parseNumber(values.kilos) - parseNumber(values.tara);
	const price = parseNumber(values.pricePerKg);
	const total = parseNumber(values.totalAmount);

	if (targetField === "total" && price > 0 && kgNeto > 0) {
		return { totalAmount: formatNumber(price * kgNeto) };
	}

	if (targetField === "price" && total > 0 && kgNeto > 0) {
		return { pricePerKg: formatNumber(total / kgNeto) };
	}

	if (targetField === "quantity" && total > 0 && price > 0) {
		const kgBruto = total / price + parseNumber(values.tara);
		return { kilos: kgBruto.toFixed(3) };
	}

	return {};
}

function getKgFormFieldForUiField(field: CalculatorUiField): SmartCalculatorFormField {
	if (field === "price") return "pricePerKg";
	if (field === "quantity") return "kilos";
	if (field === "total") return "totalAmount";
	return "tara";
}

export const kgCalculatorStrategy: SmartCalculatorStrategy = {
	unitType: "kg",

	getDefaults({ defaultPrice = "", initialValues }) {
		if (initialValues) {
			return {
				totalAmount: initialValues.subtotal || "",
				pricePerKg: initialValues.unitPrice || "",
				kilos: initialValues.quantity || "",
				tara: "0",
				pricePerPack: "",
				packs: "",
				units: "",
			};
		}

		return getKgBaseDefaults(defaultPrice);
	},

	clear({ defaultPrice = "" }) {
		return getKgBaseDefaults(defaultPrice);
	},

	mapToUiValues(values) {
		return {
			price: values.pricePerKg ?? "",
			quantity: values.kilos ?? "",
			total: values.totalAmount ?? "",
			tara: values.tara ?? "0",
		};
	},

	getFormFieldForUiField(field: CalculatorUiField): SmartCalculatorFormField {
		return getKgFormFieldForUiField(field);
	},

	applyChange({ values, change, autoCalculateField }) {
		const field = kgFormFields.has(change.field)
			? (change.field as SmartCalculatorFormField)
			: getKgFormFieldForUiField(change.field as CalculatorUiField);
		const nextValues = withOnlyKgValues({ ...values, [field]: change.value });
		if (change.value === "") return { [field]: change.value };
		const calculated = calculateTargetField(nextValues, autoCalculateField);
		delete calculated[field as keyof SmartCalculatorPatch];

		return {
			[field]: change.value,
			...calculated,
		};
	},

	calculateResult({ values, variantPrice = "0" }) {
		return calculateKgProduct(values, variantPrice);
	},
};
