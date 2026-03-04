import { useCalculator as useBaseCalculator } from "./use-calculator";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface UseOrderCalculatorOptions {
	product: Product | undefined;
	variant: ProductVariant | undefined;
	initialPrice?: string;
}

export type { UseOrderCalculatorOptions };

/**
 * Re-export the unified calculator hook for orders.
 * This hook is a thin wrapper around useCalculator for backward compatibility.
 */
export function useCalculator(options: UseOrderCalculatorOptions) {
	return useBaseCalculator({
		product: options.product,
		variant: options.variant,
		initialPrice: options.initialPrice,
		autoFillPrice: true, // Orders always auto-fill price
	});
}
