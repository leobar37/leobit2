import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { formatNumber } from "~/lib/utils";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface CalculatorProduct {
  id: string;
  unit: string;
}
import {
	calculateKgProduct,
	calculateUnitProduct,
	getKgDefaultValues,
	getUnitDefaultValues,
	parseNumber,
} from "~/lib/calculator";
import type { CalculationResult, UnitType, KgCalculatorFields, UnitCalculatorFields } from "~/lib/calculator/types";

export type CalculatorField = "price" | "quantity" | "total";

// Unified schema that handles both kg and unit products
// This prevents React hooks count mismatch when switching product types
const calculatorSchema = z.object({
	totalAmount: z.string(),
	pricePerKg: z.string(),
	kilos: z.string(),
	tara: z.string(),
	pricePerPack: z.string(),
	packs: z.string(),
	units: z.string(),
});

export type CalculatorFormData = z.infer<typeof calculatorSchema>;

interface UseSmartCalculatorOptions {
	product: CalculatorProduct | undefined;
	variant: ProductVariant | undefined;
	initialPrice?: string;
	autoFillPrice?: boolean;
	hideTara?: boolean;
	initialValues?: {
		quantity: string;
		unitPrice: string;
		subtotal: string;
		isKgProduct?: boolean;
	};
}

interface UseSmartCalculatorReturn {
	form: any;
	values: {
		price: string;
		quantity: string;
		total: string;
		tara: string;
	};
	unitType: UnitType;
	isKgProduct: boolean;
	autoCalculateField: CalculatorField;
	toggleAutoCalculateField: (field: CalculatorField) => void;
	isFieldAutoCalculated: (field: CalculatorField) => boolean;
	setFieldValue: (field: string, value: string) => void;
	calculation: CalculationResult;
	handleClear: () => void;
	isValid: boolean;
}

function getFieldNameForUnitType(field: CalculatorField, unitType: UnitType): string {
	if (unitType === "kg") {
		return field === "price" ? "pricePerKg" : field === "quantity" ? "kilos" : "totalAmount";
	}
	return field === "price" ? "pricePerPack" : field === "quantity" ? "packs" : "totalAmount";
}

function mapFormToValues(
	formValues: Partial<CalculatorFormData>,
	unitType: UnitType
): {
	price: string;
	quantity: string;
	total: string;
	tara: string;
} {
	if (unitType === "kg") {
		return {
			price: formValues.pricePerKg ?? "",
			quantity: formValues.kilos ?? "",
			total: formValues.totalAmount ?? "",
			tara: formValues.tara ?? "0",
		};
	}
	return {
		price: formValues.pricePerPack ?? "",
		quantity: formValues.packs ?? "",
		total: formValues.totalAmount ?? "",
		tara: "0",
	};
}

export function useSmartCalculator(
	options: UseSmartCalculatorOptions,
): UseSmartCalculatorReturn {
	const { product, variant, initialPrice = "", autoFillPrice = false, hideTara = false, initialValues } = options;

	const isKgProduct = product?.unit === "kg";
	const unitType: UnitType = isKgProduct ? "kg" : "unidad";

	const [autoCalculateField, setAutoCalculateField] = useState<CalculatorField>("total");

	const defaultPrice = autoFillPrice ? initialPrice : "";

	const getDefaultValues = useCallback((): CalculatorFormData => {
		const productIsKg = initialValues?.isKgProduct ?? isKgProduct;

		if (initialValues) {
			if (productIsKg) {
				return {
					totalAmount: initialValues.subtotal || "",
					pricePerKg: initialValues.unitPrice || "",
					kilos: initialValues.quantity || "",
					tara: "0",
					pricePerPack: "",
					packs: "",
					units: "",
				};
			} else {
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
		}

		if (isKgProduct) {
			return {
				...getKgDefaultValues(defaultPrice),
				pricePerPack: "",
				packs: "",
				units: "",
			} as CalculatorFormData;
		} else {
			return {
				...getUnitDefaultValues(defaultPrice),
				pricePerKg: "",
				kilos: "",
				tara: "0",
			} as CalculatorFormData;
		}
	}, [isKgProduct, defaultPrice, initialValues]);

	const form = useForm<CalculatorFormData>({
		resolver: zodResolver(calculatorSchema),
		defaultValues: getDefaultValues(),
	});

	const formValues = useWatch({ control: form.control });

	const isFirstRender = useRef(true);
	const prevProductId = useRef<string | undefined>(undefined);
	const prevVariantId = useRef<string | undefined>(undefined);
	const prevInitialPrice = useRef<string>(initialPrice);
	const prevHideTara = useRef<boolean>(hideTara);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			prevProductId.current = product?.id;
			prevVariantId.current = variant?.id;
			prevInitialPrice.current = initialPrice;
			prevHideTara.current = hideTara;
			return;
		}

		const productChanged = product?.id !== prevProductId.current;
		const variantChanged = variant?.id !== prevVariantId.current;
		const initialPriceChanged = initialPrice !== prevInitialPrice.current;
		const hideTaraChanged = hideTara !== prevHideTara.current;

		if (!productChanged && !variantChanged && !initialPriceChanged && !hideTaraChanged) {
			return;
		}

		prevProductId.current = product?.id;
		prevVariantId.current = variant?.id;
		prevInitialPrice.current = initialPrice;
		prevHideTara.current = hideTara;

		const newDefaultPrice = autoFillPrice ? initialPrice : "";
		if (isKgProduct) {
			form.reset({
				...getKgDefaultValues(newDefaultPrice),
				pricePerPack: "",
				packs: "",
				units: "",
			} as CalculatorFormData);
		} else {
			form.reset({
				...getUnitDefaultValues(newDefaultPrice),
				pricePerKg: "",
				kilos: "",
				tara: "0",
			} as CalculatorFormData);
		}

		if (productChanged) {
			setAutoCalculateField("total");
		}
	}, [form, isKgProduct, autoFillPrice, initialPrice, product?.id, variant?.id, hideTara]);

	const calculation = useMemo<CalculationResult>(() => {
		if (!product || !variant) {
			return {
				kgNeto: 0,
				unitPrice: 0,
				quantity: 0,
				subtotal: 0,
				isValid: false,
			};
		}

		if (isKgProduct) {
			return calculateKgProduct(formValues as KgCalculatorFields, variant.price || "0");
		}

		const unitQuantity = Math.max(1, parseInt(variant.unitQuantity || "1", 10) || 1);
		return calculateUnitProduct(formValues as UnitCalculatorFields, variant.price || "0", unitQuantity);
	}, [formValues, product, variant, isKgProduct]);

	const toggleAutoCalculateField = useCallback((field: CalculatorField) => {
		setAutoCalculateField(field);
	}, []);

	const isFieldAutoCalculated = useCallback(
		(field: CalculatorField) => {
			return autoCalculateField === field;
		},
		[autoCalculateField],
	);

	const calculateTargetField = useCallback(
		(
			values: CalculatorFormData,
			targetField: CalculatorField,
		): Partial<CalculatorFormData> => {
			if (isKgProduct) {
				const v = values as KgCalculatorFields;
				const kgNeto = parseNumber(v.kilos) - parseNumber(v.tara);
				const price = parseNumber(v.pricePerKg);
				const total = parseNumber(v.totalAmount);

				if (targetField === "total" && price > 0 && kgNeto > 0) {
					return { totalAmount: formatNumber(price * kgNeto) } as Partial<CalculatorFormData>;
				}
				if (targetField === "price" && total > 0 && kgNeto > 0) {
					return { pricePerKg: formatNumber(total / kgNeto) } as Partial<CalculatorFormData>;
				}
				if (targetField === "quantity" && total > 0 && price > 0) {
					const taraNum = parseNumber(v.tara);
					const kgBruto = total / price + taraNum;
					return { kilos: kgBruto.toFixed(3) } as Partial<CalculatorFormData>;
				}
			} else {
				const v = values as UnitCalculatorFields;
				const packs = parseNumber(v.packs);
				const pricePerPack = parseNumber(v.pricePerPack);
				const total = parseNumber(v.totalAmount);
				const unitQuantity = Math.max(1, parseInt(variant?.unitQuantity || "1", 10) || 1);

				if (targetField === "total" && pricePerPack > 0 && packs > 0) {
					return { totalAmount: formatNumber(packs * pricePerPack) } as Partial<CalculatorFormData>;
				}
				if (targetField === "price" && total > 0 && packs > 0) {
					const unitPrice = total / (packs * unitQuantity);
					return { pricePerPack: formatNumber(unitPrice * unitQuantity) } as Partial<CalculatorFormData>;
				}
				if (targetField === "quantity" && total > 0 && pricePerPack > 0) {
					const totalUnits = total / (pricePerPack / unitQuantity);
					const calculatedPacks = Math.ceil(totalUnits / unitQuantity);
					return { packs: calculatedPacks.toString() } as Partial<CalculatorFormData>;
				}
			}
			return {} as Partial<CalculatorFormData>;
		},
		[isKgProduct, variant],
	);

	const setFieldValue = useCallback(
		(field: string, value: string) => {
			form.setValue(field as never, value as never, {
				shouldValidate: true,
			});

			if (value === "") return;

			const currentValues = form.getValues() as CalculatorFormData;
			const calculated = calculateTargetField(currentValues, autoCalculateField);

			Object.entries(calculated).forEach(([key, val]) => {
				if (typeof val === "string" && key !== field) {
					form.setValue(key as never, val as never, {
						shouldValidate: true,
					});
				}
			});
		},
		[form, calculateTargetField, autoCalculateField],
	);

	const handleClear = useCallback(() => {
		const currentDefaultPrice = autoFillPrice ? initialPrice : "";
		setAutoCalculateField("total");

		if (isKgProduct) {
			form.reset({
				totalAmount: "",
				pricePerKg: currentDefaultPrice,
				kilos: "",
				tara: "0",
				pricePerPack: "",
				packs: "",
				units: "",
			} as CalculatorFormData);
		} else {
			form.reset({
				totalAmount: "",
				pricePerKg: "",
				kilos: "",
				tara: "0",
				pricePerPack: currentDefaultPrice,
				packs: "",
				units: "",
			} as CalculatorFormData);
		}
	}, [form, isKgProduct, autoFillPrice, initialPrice]);

	const values = useMemo(() => {
		return mapFormToValues(formValues ?? {
			totalAmount: "",
			pricePerKg: "",
			kilos: "",
			tara: "0",
			pricePerPack: "",
			packs: "",
			units: "",
		}, unitType);
	}, [formValues, unitType]);

	return {
		form,
		values,
		unitType,
		isKgProduct,
		autoCalculateField,
		toggleAutoCalculateField,
		isFieldAutoCalculated,
		setFieldValue,
		calculation,
		handleClear,
		isValid: calculation.isValid,
	};
}
