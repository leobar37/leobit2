import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import {
	calculateKgProduct,
	calculateUnitProduct,
	getKgDefaultValues,
	getUnitDefaultValues,
	parseNumber,
} from "~/lib/calculator";
import type { CalculationResult, UnitType } from "~/lib/calculator/types";

export type CalculatorField = "price" | "quantity" | "total";

const kgCalculatorSchema = z.object({
	totalAmount: z.string(),
	pricePerKg: z.string(),
	kilos: z.string(),
	tara: z.string(),
});

const unitCalculatorSchema = z.object({
	totalAmount: z.string(),
	pricePerPack: z.string(),
	packs: z.string(),
	units: z.string(),
});

export type KgCalculatorFormData = z.infer<typeof kgCalculatorSchema>;
export type UnitCalculatorFormData = z.infer<typeof unitCalculatorSchema>;

interface UseSmartCalculatorOptions {
	product: Product | undefined;
	variant: ProductVariant | undefined;
	initialPrice?: string;
	autoFillPrice?: boolean;
	hideTara?: boolean;
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
	formValues: { totalAmount?: string; pricePerKg?: string; kilos?: string; tara?: string } | { totalAmount?: string; pricePerPack?: string; packs?: string; units?: string },
	unitType: UnitType
): {
	price: string;
	quantity: string;
	total: string;
	tara: string;
} {
	if (unitType === "kg") {
		const v = formValues as { totalAmount?: string; pricePerKg?: string; kilos?: string; tara?: string };
		return {
			price: v.pricePerKg ?? "",
			quantity: v.kilos ?? "",
			total: v.totalAmount ?? "",
			tara: v.tara ?? "0",
		};
	}
	const v = formValues as { totalAmount?: string; pricePerPack?: string; packs?: string; units?: string };
	return {
		price: v.pricePerPack ?? "",
		quantity: v.packs ?? "",
		total: v.totalAmount ?? "",
		tara: "0",
	};
}

export function useSmartCalculator(
	options: UseSmartCalculatorOptions,
): UseSmartCalculatorReturn {
	const { product, variant, initialPrice = "", autoFillPrice = false, hideTara = false } = options;

	const isKgProduct = product?.unit === "kg";
	const unitType: UnitType = isKgProduct ? "kg" : "unidad";

	const [autoCalculateField, setAutoCalculateField] = useState<CalculatorField>("total");

	const defaultPrice = autoFillPrice ? initialPrice : "";

	const form = useForm<KgCalculatorFormData | UnitCalculatorFormData>({
		resolver: zodResolver(isKgProduct ? kgCalculatorSchema : unitCalculatorSchema),
		defaultValues: isKgProduct
			? getKgDefaultValues(defaultPrice)
			: getUnitDefaultValues(defaultPrice),
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
			form.reset(getKgDefaultValues(newDefaultPrice));
		} else {
			form.reset(getUnitDefaultValues(newDefaultPrice));
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
			const values = formValues as KgCalculatorFormData;
			return calculateKgProduct(values, variant.price || "0");
		}

		const values = formValues as UnitCalculatorFormData;
		const unitQuantity = Math.max(1, parseInt(variant.unitQuantity || "1", 10) || 1);
		return calculateUnitProduct(values, variant.price || "0", unitQuantity);
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
			values: KgCalculatorFormData | UnitCalculatorFormData,
			targetField: CalculatorField,
		): Partial<KgCalculatorFormData | UnitCalculatorFormData> => {
			if (isKgProduct) {
				const v = values as KgCalculatorFormData;
				const kgNeto = parseNumber(v.kilos) - parseNumber(v.tara);
				const price = parseNumber(v.pricePerKg);
				const total = parseNumber(v.totalAmount);

				if (targetField === "total" && price > 0 && kgNeto > 0) {
					return { totalAmount: (price * kgNeto).toFixed(2) } as Partial<KgCalculatorFormData>;
				}
				if (targetField === "price" && total > 0 && kgNeto > 0) {
					return { pricePerKg: (total / kgNeto).toFixed(2) } as Partial<KgCalculatorFormData>;
				}
				if (targetField === "quantity" && total > 0 && price > 0) {
					const taraNum = parseNumber(v.tara);
					const kgBruto = total / price + taraNum;
					return { kilos: kgBruto.toFixed(3) } as Partial<KgCalculatorFormData>;
				}
			} else {
				const v = values as UnitCalculatorFormData;
				const packs = parseNumber(v.packs);
				const pricePerPack = parseNumber(v.pricePerPack);
				const total = parseNumber(v.totalAmount);
				const unitQuantity = Math.max(1, parseInt(variant?.unitQuantity || "1", 10) || 1);

				if (targetField === "total" && pricePerPack > 0 && packs > 0) {
					return { totalAmount: (packs * pricePerPack).toFixed(2) } as Partial<UnitCalculatorFormData>;
				}
				if (targetField === "price" && total > 0 && packs > 0) {
					const unitPrice = total / (packs * unitQuantity);
					return { pricePerPack: (unitPrice * unitQuantity).toFixed(2) } as Partial<UnitCalculatorFormData>;
				}
				if (targetField === "quantity" && total > 0 && pricePerPack > 0) {
					const totalUnits = total / (pricePerPack / unitQuantity);
					const calculatedPacks = Math.ceil(totalUnits / unitQuantity);
					return { packs: calculatedPacks.toString() } as Partial<UnitCalculatorFormData>;
				}
			}
			return {} as Partial<KgCalculatorFormData | UnitCalculatorFormData>;
		},
		[isKgProduct, variant],
	);

	const setFieldValue = useCallback(
		(field: string, value: string) => {
			form.setValue(field as never, value as never, {
				shouldValidate: true,
			});

			if (value === "") return;

			const currentValues = form.getValues() as KgCalculatorFormData | UnitCalculatorFormData;
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
			});
		} else {
			form.reset({
				totalAmount: "",
				pricePerPack: currentDefaultPrice,
				packs: "",
				units: "",
			});
		}
	}, [form, isKgProduct, autoFillPrice, initialPrice]);

	const values = useMemo(() => {
		return mapFormToValues(formValues, unitType);
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
