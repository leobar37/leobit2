import { useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { useSaleStore } from "~/stores/sale.store";
import {
	type KgCalculatorFormData,
	type UnitCalculatorFormData,
	kgCalculatorSchema,
	unitCalculatorSchema,
} from "~/lib/sales/calculator-schema";
import {
	calculateKgProduct,
	calculateUnitProduct,
	createCartItem,
	autoCalculateKgField,
} from "~/lib/sales/calculator-logic";

interface UseSaleCalculatorOptions {
	product: Product | undefined;
	variant: ProductVariant | undefined;
	initialPrice: string;
}

interface UseSaleCalculatorReturn {
	// Form
	form: ReturnType<typeof useForm<KgCalculatorFormData | UnitCalculatorFormData>>;
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

	// Actions
	handleClear: () => void;
	handleAddToCart: () => void;
	setFieldValue: (field: string, value: string) => void;
}

export function useSaleCalculator(
	options: UseSaleCalculatorOptions,
): UseSaleCalculatorReturn {
	const { product, variant, initialPrice } = options;
	const { addToCart, setLastPricePerKg } = useSaleStore();

	const isKgProduct = product?.unit === "kg";

	// Initialize form with correct schema
	const form = useForm<KgCalculatorFormData | UnitCalculatorFormData>({
		resolver: zodResolver(
			isKgProduct ? kgCalculatorSchema : unitCalculatorSchema,
		),
		defaultValues: isKgProduct
			? {
					totalAmount: "",
					pricePerKg: initialPrice,
					kilos: "",
					tara: "0",
				}
			: {
					totalAmount: "",
					packs: "",
					units: "",
				},
	});

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

	// Clear form handler - SOLVES THE BUG!
	const handleClear = useCallback(() => {
		if (isKgProduct) {
			form.reset({
				totalAmount: "",
				pricePerKg: initialPrice,
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
	}, [form, isKgProduct, initialPrice]);

	// Add to cart handler
	const handleAddToCart = useCallback(() => {
		if (!product || !variant || !calculation.isValid) {
			return;
		}

		const cartItem = createCartItem(product, variant, calculation);
		if (cartItem) {
			addToCart(cartItem);

			// Persist price for next time
			if (isKgProduct) {
				const values = formValues as KgCalculatorFormData;
				if (values.pricePerKg) {
					setLastPricePerKg(values.pricePerKg);
				}
			}

			// Clear form after adding
			handleClear();
		}
	}, [
		product,
		variant,
		calculation,
		addToCart,
		setLastPricePerKg,
		isKgProduct,
		formValues,
		handleClear,
	]);

	// Set field value with auto-calculation for kg products
	const setFieldValue = useCallback(
		(field: string, value: string) => {
			form.setValue(field as never, value as never);

			// Auto-calculate for kg products
			if (isKgProduct) {
				const values = form.getValues() as KgCalculatorFormData;
				const calculated = autoCalculateKgField(values, field);

				Object.entries(calculated).forEach(([key, val]) => {
					form.setValue(key as never, val as never);
				});
			}
		},
		[form, isKgProduct],
	);

	return {
		form,
		formValues,
		isValid,
		calculation,
		handleClear,
		handleAddToCart,
		setFieldValue,
	};
}
