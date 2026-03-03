import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "~/lib/sales/types";

interface SaleState {
	// Cart items
	cartItems: CartItem[];
	addToCart: (item: CartItem) => void;
	removeFromCart: (index: number) => void;
	clearCart: () => void;
	updateCartItem: (index: number, item: CartItem) => void;

	// Product selection (synced with URL)
	selectedProductId: string | null;
	selectedVariantId: string | null;
	setSelection: (productId: string | null, variantId: string | null) => void;
	clearSelection: () => void;

	// Persisted values
	lastPricePerKg: string;
	setLastPricePerKg: (price: string) => void;
}

export const useSaleStore = create<SaleState>()(
	persist(
		(set, get) => ({
			// Cart
			cartItems: [],
			addToCart: (item) => {
				const { cartItems } = get();
				const existingIndex = cartItems.findIndex(
					(i) =>
						i.productId === item.productId && i.variantId === item.variantId,
				);

				if (existingIndex < 0) {
					set({ cartItems: [...cartItems, item] });
				} else {
					// Merge quantities
					const existing = cartItems[existingIndex];
					const newQuantity = existing.quantity + item.quantity;
					const newSubtotal = parseFloat(
						(newQuantity * item.unitPrice).toFixed(2),
					);
					const updatedItem = {
						...existing,
						quantity: newQuantity,
						unitPrice: item.unitPrice,
						subtotal: newSubtotal,
					};
					const newCartItems = [...cartItems];
					newCartItems[existingIndex] = updatedItem;
					set({ cartItems: newCartItems });
				}
			},
			removeFromCart: (index) => {
				const { cartItems } = get();
				set({
					cartItems: cartItems.filter((_, i) => i !== index),
				});
			},
			clearCart: () => set({ cartItems: [] }),
			updateCartItem: (index, item) => {
				const { cartItems } = get();
				const newCartItems = [...cartItems];
				newCartItems[index] = item;
				set({ cartItems: newCartItems });
			},

			// Selection
			selectedProductId: null,
			selectedVariantId: null,
			setSelection: (productId, variantId) =>
				set({
					selectedProductId: productId,
					selectedVariantId: variantId,
				}),
			clearSelection: () =>
				set({
					selectedProductId: null,
					selectedVariantId: null,
				}),

			// Persisted
			lastPricePerKg: "",
			setLastPricePerKg: (price) => set({ lastPricePerKg: price }),
		}),
		{
			name: "avileo-sale-store",
			partialize: (state) => ({
				lastPricePerKg: state.lastPricePerKg,
			}),
		},
	),
);
