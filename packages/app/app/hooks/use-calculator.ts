import { useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import {
	type KgCalculatorFields,
	type UnitCalculatorFields,
	type CalculationResult,
	type KgCalculatorFieldName,
	type UnitType,
	calculateKgProduct,
	calculateUnitProduct,
	autoCalculateKgField,
	getKgDefaultValues,
	getUnitDefaultValues,
} from "~/lib/calculator";

// Zod schemas for validation
const kgCalculatorSchema = z.object({
	totalAmount: z.string(),
	pricePerKg: z.string(),
	kilos: z.string(),
	tara: z.string(),
});

const unitCalculatorSchema = z.object({
	totalAmount: z.string(),
	packs: z.string(),
	units: z.string(),
});

export type KgCalculatorFormData = z.infer<typeof kgCalculatorSchema>;
export type UnitCalculatorFormData = z.infer<typeof unitCalculatorSchema>;

interface UseCalculatorOptions {
	/** Product being calculated */
	product: Product | undefined;
	/** Selected variant */
	variant: ProductVariant | undefined;
	/** Default price to use (e.g., from variant or persisted) */
	initialPrice?: string;
	/** Whether to auto-fill price field with initialPrice */
	autoFillPrice?: boolean;
}

interface UseCalculatorReturn {
	/** React Hook Form instance */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	/** Current form values */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	formValues: any;
	/** Whether form is valid for submission */
	isValid: boolean;
	/** Whether this is a kg-based product */
	isKgProduct: boolean;
	/** Calculation results */
	calculation: CalculationResult;
	/** Clear the form */
	handleClear: () => void;
	/** Set a field value with auto-calculation */
	setFieldValue: (field: string, value: string) => void;
}

/**
 * Unified calculator hook for sales, purchases, and orders.
 * Handles both kg-based and unit-based products with auto-calculation.
 */
export function useCalculator(
	options: UseCalculatorOptions,
): UseCalculatorReturn {
	const { product, variant, initialPrice = "", autoFillPrice = false } = options;

	const isKgProduct = product?.unit === "kg";
	const unitType: UnitType = isKgProduct ? "kg" : "unidad";

	// Determine the default price to use
	const defaultPrice = autoFillPrice ? initialPrice : "";

	// Initialize form with correct schema based on product type
	const form = useForm<KgCalculatorFormData | UnitCalculatorFormData>({
		resolver: zodResolver(
			isKgProduct ? kgCalculatorSchema : unitCalculatorSchema,
		),
		defaultValues: isKgProduct
			? getKgDefaultValues(defaultPrice)
			: getUnitDefaultValues(),
	});

	// Watch all form values for calculations
	const formValues = useWatch({ control: form.control });

	// Calculate derived values
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
		const unitQuantity = Math.max(
			1,
			parseInt(variant.unitQuantity || "1", 10) || 1,
		);
		return calculateUnitProduct(values, variant.price || "0", unitQuantity);
	}, [formValues, product, variant, isKgProduct]);

	// Form is valid if calculation is valid
	const isValid = calculation.isValid;

	/**
	 * Clear the form and reset to default values
	 */
	const handleClear = useCallback(() => {
		// Re-compute current default price at reset time
		const currentDefaultPrice = autoFillPrice ? initialPrice : "";

		if (isKgProduct) {
			form.reset(getKgDefaultValues(currentDefaultPrice));
		} else {
			form.reset(getUnitDefaultValues());
		}
	}, [form, isKgProduct, autoFillPrice, initialPrice]);

	/**
	 * Set a field value with auto-calculation for kg products
	 * When 2 of 3 fields are filled, the third is automatically calculated
	 */
	const setFieldValue = useCallback(
		(field: string, value: string) => {
			// Set the field value and trigger validation
			form.setValue(field as never, value as never, {
				shouldValidate: true,
			});

			// Auto-calculate for kg products
			if (isKgProduct) {
				const values = form.getValues() as KgCalculatorFields;
				const calculated = autoCalculateKgField(
					values,
					field as KgCalculatorFieldName,
				);

				// Only set values that are strings (not objects)
				Object.entries(calculated).forEach(([key, val]) => {
					if (typeof val === "string") {
						form.setValue(key as never, val as never, {
							shouldValidate: true,
						});
					}
				});
			}
		},
		[form, isKgProduct],
	);

	return {
		form,
		formValues,
		isValid,
		isKgProduct,
		calculation,
		handleClear,
		setFieldValue,
	};
}
