import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useSaleStore } from "~/stores/sale.store";
import { useProducts } from "./use-products-live";
import { useVariantsByProduct } from "./use-product-variants";

/**
 * Hook to manage product selection via URL params
 * Syncs URL (?productId=xxx&variantId=yyy) with Zustand store
 */
export function useProductSelection() {
	const [searchParams, setSearchParams] = useSearchParams();

	const {
		selectedProductId,
		selectedVariantId,
		setSelection,
		lastPricePerKg,
	} = useSaleStore();

	// Get URL params
	const urlProductId = searchParams.get("productId");
	const urlVariantId = searchParams.get("variantId");

	// Fetch products and variants
	const { data: products } = useProducts();
	const { data: variants } = useVariantsByProduct(selectedProductId || "", {
		isActive: true,
	});

	// Sync URL params with store on mount
	useEffect(() => {
		if (urlProductId && urlVariantId) {
			setSelection(urlProductId, urlVariantId);
		}
	}, []); // Only on mount

	// Sync store changes back to URL
	useEffect(() => {
		if (selectedProductId && selectedVariantId) {
			const newParams = new URLSearchParams(searchParams);
			newParams.set("productId", selectedProductId);
			newParams.set("variantId", selectedVariantId);
			setSearchParams(newParams, { replace: true });
		}
	}, [selectedProductId, selectedVariantId]);

	// Get selected product and variant objects
	const selectedProduct = products?.find(
		(p) => p.id === selectedProductId && p.isActive,
	);

	const selectedVariant = variants?.find(
		(v) => v.id === selectedVariantId && v.isActive,
	);

	// Get initial price (from variant or persisted)
	const initialPrice = selectedVariant?.price || lastPricePerKg || "";

	// Set selection handler
	const selectProduct = useCallback(
		(productId: string, variantId: string) => {
			setSelection(productId, variantId);
		},
		[setSelection],
	);

	// Clear selection handler
	const clearSelection = useCallback(() => {
		setSelection(null, null);
		const newParams = new URLSearchParams(searchParams);
		newParams.delete("productId");
		newParams.delete("variantId");
		setSearchParams(newParams, { replace: true });
	}, [setSelection, searchParams, setSearchParams]);

	return {
		selectedProductId,
		selectedVariantId,
		selectedProduct,
		selectedVariant,
		initialPrice,
		selectProduct,
		clearSelection,
		hasSelection: !!selectedProductId && !!selectedVariantId,
	};
}
