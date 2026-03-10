import { useCallback, useMemo, useEffect, useRef } from "react";
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
	type UnitCalculatorFieldName,
	type UnitType,
	calculateKgProduct,
	calculateUnitProduct,
	autoCalculateKgField,
	autoCalculateUnitField,
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
	pricePerPack: z.string(),
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

// Type for field timestamps
type KgFieldTimestamps = {
	totalAmount: number;
	pricePerKg: number;
	kilos: number;
	tara: number;
};

type UnitFieldTimestamps = {
	totalAmount: number;
	pricePerPack: number;
	packs: number;
	units: number;
};

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
			: getUnitDefaultValues(defaultPrice),
	});

	// Watch all form values for calculations
	const formValues = useWatch({ control: form.control });

	// Track if this is the first render
	const isFirstRender = useRef(true);

	// Track timestamps of when each field was last edited
	const kgFieldTimestamps = useRef<KgFieldTimestamps>({
		totalAmount: 0,
		pricePerKg: 0,
		kilos: 0,
		tara: 0,
	});

	const unitFieldTimestamps = useRef<UnitFieldTimestamps>({
		totalAmount: 0,
		pricePerPack: 0,
		packs: 0,
		units: 0,
	});

	// Track previous product/variant to detect actual changes
	const prevProductId = useRef<string | undefined>(undefined);
	const prevVariantId = useRef<string | undefined>(undefined);
	const prevInitialPrice = useRef<string>(initialPrice);

	// Update form default values when product type changes
	useEffect(() => {
		// Skip on first render to avoid double reset
		if (isFirstRender.current) {
			isFirstRender.current = false;
			prevProductId.current = product?.id;
			prevVariantId.current = variant?.id;
			prevInitialPrice.current = initialPrice;
			return;
		}

		// Only reset if product or variant actually changed (not just reference)
		const productChanged = product?.id !== prevProductId.current;
		const variantChanged = variant?.id !== prevVariantId.current;
		const initialPriceChanged = initialPrice !== prevInitialPrice.current;

		if (!productChanged && !variantChanged && !initialPriceChanged) {
			return;
		}

		// Update refs
		prevProductId.current = product?.id;
		prevVariantId.current = variant?.id;
		prevInitialPrice.current = initialPrice;

		const defaultPrice = autoFillPrice ? initialPrice : "";
		if (isKgProduct) {
			form.reset(getKgDefaultValues(defaultPrice));
		} else {
			form.reset(getUnitDefaultValues(defaultPrice));
		}
		
		// Reset timestamps on product change
		kgFieldTimestamps.current = {
			totalAmount: 0,
			pricePerKg: 0,
			kilos: 0,
			tara: 0,
		};
		unitFieldTimestamps.current = {
			totalAmount: 0,
			pricePerPack: 0,
			packs: 0,
			units: 0,
		};
	}, [form, isKgProduct, autoFillPrice, initialPrice, product?.id, variant?.id]);

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
		// Get fresh default values for the current product type
		const currentDefaultPrice = autoFillPrice ? initialPrice : "";

		// Reset timestamps
		kgFieldTimestamps.current = {
			totalAmount: 0,
			pricePerKg: 0,
			kilos: 0,
			tara: 0,
		};
		unitFieldTimestamps.current = {
			totalAmount: 0,
			pricePerPack: 0,
			packs: 0,
			units: 0,
		};

		// Reset with explicit empty values to clear the form
		// Use type assertion since we know the current product type
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

	/**
	 * Set a field value with smart auto-calculation for both kg and unit products.
	 * When 2 of 3 fields are filled, calculate the third.
	 * When 3 fields are filled and user edits one, recalculate the oldest field.
	 * Does NOT recalculate when user is clearing a field (setting to empty).
	 */
	const setFieldValue = useCallback(
		(field: string, value: string) => {
			// Get current value to detect if user is clearing the field
			const currentValue = form.getValues(field as never);
			const isClearingField = currentValue && !value;

			// Update timestamp for this field (only when writing, not clearing)
			if (isKgProduct) {
				if (field in kgFieldTimestamps.current && !isClearingField) {
					kgFieldTimestamps.current[field as keyof KgFieldTimestamps] = Date.now();
				}
			} else {
				if (field in unitFieldTimestamps.current && !isClearingField) {
					unitFieldTimestamps.current[field as keyof UnitFieldTimestamps] = Date.now();
				}
			}

			// Set the field value and trigger validation
			form.setValue(field as never, value as never, {
				shouldValidate: true,
			});

			// Auto-calculate, but NOT when clearing a field or when value is empty
			if (!isClearingField && value !== "") {
				if (isKgProduct) {
					const values = form.getValues() as KgCalculatorFields;
					const calculated = autoCalculateKgField(
						values,
						field as KgCalculatorFieldName,
						kgFieldTimestamps.current,
					);

					Object.entries(calculated).forEach(([key, val]) => {
						if (typeof val === "string") {
							form.setValue(key as never, val as never, {
								shouldValidate: true,
							});
						}
					});
				} else {
					const values = form.getValues() as UnitCalculatorFields;
					const unitQuantity = Math.max(1, parseInt(variant?.unitQuantity || "1", 10) || 1);
					const calculated = autoCalculateUnitField(
						values,
						field as UnitCalculatorFieldName,
						unitQuantity,
						unitFieldTimestamps.current,
					);

					Object.entries(calculated).forEach(([key, val]) => {
						if (typeof val === "string") {
							form.setValue(key as never, val as never, {
								shouldValidate: true,
							});
						}
					});
				}
			}
		},
		[form, isKgProduct, variant],
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
