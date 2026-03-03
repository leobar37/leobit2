import { useCallback, useMemo, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import {
	type KgCalculatorFormData,
	type UnitCalculatorFormData,
	kgCalculatorSchema,
	unitCalculatorSchema,
} from "~/lib/sales/calculator-schema";
import {
	calculateKgProduct,
	calculateUnitProduct,
	autoCalculateKgField,
} from "~/lib/sales/calculator-logic";

interface UseCalculatorOptions {
	product: Product | undefined;
	variant: ProductVariant | undefined;
	initialPrice?: string;
}

interface UseCalculatorReturn {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	formValues: KgCalculatorFormData | UnitCalculatorFormData;

	// Computed
	isValid: boolean;
	calculation: {
		kgNeto: number;
		unitPrice: number;
		quantity: number;
		subtotal: number;
		isValid: boolean;
	};
	isKgProduct: boolean;

	// Actions
	handleClear: () => void;
	setFieldValue: (field: string, value: string) => void;
}

/**
 * Shared calculator hook for both Sales and Orders.
 * Does NOT include store integration - that's handled by the caller.
 */
export function useCalculator(
	options: UseCalculatorOptions,
): UseCalculatorReturn {
	const { product, variant, initialPrice } = options;

	const isKgProduct = product?.unit === "kg";

	// Use ref to track previous values to detect changes
	const prevVariantId = useRef<string | undefined>(variant?.id);
	const prevIsKgProduct = useRef<boolean | undefined>(isKgProduct);

	// Initialize form with correct schema
	const form = useForm<KgCalculatorFormData | UnitCalculatorFormData>({
		resolver: zodResolver(
			isKgProduct ? kgCalculatorSchema : unitCalculatorSchema,
		),
		defaultValues: isKgProduct
			? {
					totalAmount: "",
					pricePerKg: initialPrice || variant?.price || "",
					kilos: "",
					tara: "0",
				}
			: {
					totalAmount: "",
					packs: "",
					units: "",
				},
	});

	// Store form reset function in ref to avoid adding form to dependencies
	const formResetRef = useRef(form.reset);
	formResetRef.current = form.reset;

	// Reset form when variant or product type changes
	useEffect(() => {
		const variantChanged = variant?.id !== prevVariantId.current;
		const typeChanged = isKgProduct !== prevIsKgProduct.current;

		if (variantChanged || typeChanged) {
			prevVariantId.current = variant?.id;
			prevIsKgProduct.current = isKgProduct;

			formResetRef.current(
				isKgProduct
					? {
							totalAmount: "",
							pricePerKg: initialPrice || variant?.price || "",
							kilos: "",
							tara: "0",
						}
					: {
							totalAmount: "",
							packs: "",
							units: "",
						},
			);
		}
	}, [variant?.id, isKgProduct, initialPrice, variant?.price]);

	// Watch all form values
	const formValues = useWatch({ control: form.control });

	// Calculate derived values
	const calculation = useMemo(() => {
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
		return calculateUnitProduct(values, variant, product);
	}, [formValues, product, variant, isKgProduct]);

	// Check if form is valid for submission
	const isValid = calculation.isValid;

	// Clear form handler
	const handleClear = useCallback(() => {
		if (isKgProduct) {
			form.reset({
				totalAmount: "",
				pricePerKg: initialPrice || variant?.price || "",
				kilos: "",
				tara: "0",
			});
		} else {
			form.reset({
				totalAmount: "",
				packs: "",
				units: "",
			});
		}
	}, [form, isKgProduct, initialPrice, variant?.price]);

	// Set field value with auto-calculation for kg products
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const setFieldValue = useCallback(
		(field: string, value: string) => {
			form.setValue(field, value);

			// Auto-calculate for kg products
			if (isKgProduct) {
				const values = form.getValues() as KgCalculatorFormData;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const calculated: any = autoCalculateKgField(values, field as keyof KgCalculatorFormData);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				Object.entries(calculated).forEach(([key, val]: [string, any]) => {
					if (val !== undefined) {
						form.setValue(key, val);
					}
				});
			}
		},
		[form, isKgProduct],
	);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return {
		form,
		formValues: formValues as any,
		isValid,
		calculation,
		isKgProduct,
		handleClear,
		setFieldValue,
	};
}
