import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ProductVariant } from "~/hooks/use-product-variants";
import {
	applySmartCalculatorChange,
	calculateSmartCalculatorResult,
	clearSmartCalculator,
	getSmartCalculatorDefaults,
	getSmartCalculatorUnitType,
	mapSmartCalculatorValuesToUi,
	normalizeSmartCalculatorValues,
	type SmartCalculatorChange,
	type SmartCalculatorFormValues,
	type SmartCalculatorUiValues,
} from "~/lib/calculator/smart";

interface CalculatorProduct {
  id: string;
  unit: string;
}
import type { CalculationResult, UnitType } from "~/lib/calculator/types";

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

export type CalculatorFormData = SmartCalculatorFormValues;

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
	values: SmartCalculatorUiValues;
	unitType: UnitType;
	isKgProduct: boolean;
	autoCalculateField: CalculatorField;
	toggleAutoCalculateField: (field: CalculatorField) => void;
	isFieldAutoCalculated: (field: CalculatorField) => boolean;
	setFieldValue: (field: string, value: string) => void;
	applyChange: (change: SmartCalculatorChange) => void;
	calculation: CalculationResult;
	handleClear: () => void;
	isValid: boolean;
}

export function useSmartCalculator(
	options: UseSmartCalculatorOptions,
): UseSmartCalculatorReturn {
	const { product, variant, initialPrice = "", autoFillPrice = false, hideTara = false, initialValues } = options;

	const unitType = getSmartCalculatorUnitType(product);
	const isKgProduct = unitType === "kg";

	const [autoCalculateField, setAutoCalculateField] = useState<CalculatorField>("total");

	const defaultPrice = autoFillPrice ? initialPrice : "";
	const unitQuantity = Math.max(1, parseInt(variant?.unitQuantity || "1", 10) || 1);

	const getDefaultValues = useCallback((): CalculatorFormData => {
		return getSmartCalculatorDefaults({
			unitType,
			defaultPrice,
			initialValues,
		});
	}, [unitType, defaultPrice, initialValues]);

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
		form.reset(getSmartCalculatorDefaults({ unitType, defaultPrice: newDefaultPrice }));

		if (productChanged) {
			setAutoCalculateField("total");
		}
	}, [form, unitType, autoFillPrice, initialPrice, product?.id, variant?.id, hideTara]);

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

		return calculateSmartCalculatorResult({
			unitType,
			values: normalizeSmartCalculatorValues(formValues),
			variantPrice: variant.price || "0",
			unitQuantity,
		});
	}, [formValues, product, variant, unitType, unitQuantity]);

	const toggleAutoCalculateField = useCallback((field: CalculatorField) => {
		setAutoCalculateField(field);
	}, []);

	const isFieldAutoCalculated = useCallback(
		(field: CalculatorField) => {
			return autoCalculateField === field;
		},
		[autoCalculateField],
	);

	const applyPatch = useCallback(
		(patch: Partial<CalculatorFormData>) => {
			Object.entries(patch).forEach(([key, value]) => {
				if (typeof value === "string") {
					form.setValue(key as never, value as never, {
						shouldDirty: true,
						shouldValidate: false,
					});
				}
			});
			void form.trigger();
		},
		[form],
	);

	const applyChange = useCallback(
		(change: SmartCalculatorChange) => {
			const currentValues = normalizeSmartCalculatorValues(form.getValues());
			const patch = applySmartCalculatorChange({
				unitType,
				values: currentValues,
				change,
				autoCalculateField,
				variantPrice: variant?.price,
				unitQuantity,
			});

			applyPatch(patch);
		},
		[form, unitType, autoCalculateField, variant?.price, unitQuantity, applyPatch],
	);

	const setFieldValue = useCallback(
		(field: string, value: string) => {
			applyChange({ field: field as SmartCalculatorChange["field"], value });
		},
		[applyChange],
	);

	const handleClear = useCallback(() => {
		const currentDefaultPrice = autoFillPrice ? initialPrice : "";
		setAutoCalculateField("total");

		form.reset(clearSmartCalculator({ unitType, defaultPrice: currentDefaultPrice }));
	}, [form, unitType, autoFillPrice, initialPrice]);

	const values = useMemo(() => {
		return mapSmartCalculatorValuesToUi({ values: formValues, unitType });
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
		applyChange,
		calculation,
		handleClear,
		isValid: calculation.isValid,
	};
}
