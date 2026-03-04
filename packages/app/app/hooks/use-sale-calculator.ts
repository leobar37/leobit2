import { useCallback } from "react";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { useSaleStore } from "~/stores/sale.store";
import { createCartItem } from "~/lib/sales/calculator-logic";
import { useCalculator } from "./use-calculator";

interface UseSaleCalculatorOptions {
	product: Product | undefined;
	variant: ProductVariant | undefined;
	initialPrice: string;
	autoFillPrice?: boolean;
}

interface UseSaleCalculatorReturn {
	// Form
	form: ReturnType<typeof useCalculator>["form"];
	formValues: ReturnType<typeof useCalculator>["formValues"];

	// Computed
	isValid: boolean;
	calculation: ReturnType<typeof useCalculator>["calculation"];

	// Actions
	handleClear: () => void;
	handleAddToCart: () => void;
	setFieldValue: (field: string, value: string) => void;
}

export function useSaleCalculator(
	options: UseSaleCalculatorOptions,
): UseSaleCalculatorReturn {
	const { product, variant, initialPrice, autoFillPrice = false } = options;
	const { addToCart, setLastPricePerKg } = useSaleStore();

	// Use the unified calculator hook
	const calculator = useCalculator({
		product,
		variant,
		initialPrice,
		autoFillPrice,
	});

	// Add to cart handler with sale-specific logic
	const handleAddToCart = useCallback(() => {
		if (!product || !variant || !calculator.calculation.isValid) {
			return;
		}

		const cartItem = createCartItem(product, variant, calculator.calculation);
		if (cartItem) {
			addToCart(cartItem);

			// Persist price for next time (only for kg products)
			if (calculator.isKgProduct) {
				const values = calculator.form.getValues() as { pricePerKg?: string };
				if (values.pricePerKg) {
					setLastPricePerKg(values.pricePerKg);
				}
			}

			// Clear form after adding
			calculator.handleClear();
		}
	}, [
		product,
		variant,
		calculator.calculation,
		calculator.isKgProduct,
		calculator.form,
		calculator.handleClear,
		addToCart,
		setLastPricePerKg,
	]);

	return {
		form: calculator.form,
		formValues: calculator.formValues,
		isValid: calculator.isValid,
		calculation: calculator.calculation,
		handleClear: calculator.handleClear,
		handleAddToCart,
		setFieldValue: calculator.setFieldValue,
	};
}
