import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, PaymentMode } from "~/lib/sales/types";
import type { Customer } from "~/lib/db/schema";

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

	// Payment and sale configuration
	paymentMode: PaymentMode;
	setPaymentMode: (mode: PaymentMode) => void;
	amountPaid: string;
	setAmountPaid: (amount: string) => void;
	selectedCustomer: Customer | null;
	setSelectedCustomer: (customer: Customer | null) => void;
	submitError: string | null;
	setSubmitError: (error: string | null) => void;

	// Persisted values
	lastPricePerKg: string;
	setLastPricePerKg: (price: string) => void;

	// Test utility
	resetStore: () => void;
}

// Derived values computed from state
export function getTotalAmount(cartItems: CartItem[]): number {
	return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
}

export function getTotalNetoKg(cartItems: CartItem[]): number {
	return cartItems
		.filter((item) => item.unit === "kg")
		.reduce((sum, item) => sum + item.quantity, 0);
}

export function getSaleType(paymentMode: PaymentMode): "contado" | "credito" {
	return paymentMode === "pago_total" ? "contado" : "credito";
}

export function getAmountPaidValue(
	paymentMode: PaymentMode,
	totalAmount: number,
	amountPaid: string,
): number {
	if (paymentMode === "pago_total") {
		return totalAmount;
	}
	if (paymentMode === "debe_todo") {
		return 0;
	}
	return Math.max(parseFloat(amountPaid) || 0, 0);
}

export function getBalanceDue(
	saleType: "contado" | "credito",
	totalAmount: number,
	amountPaidValue: number,
): number {
	return saleType === "credito" ? Math.max(totalAmount - amountPaidValue, 0) : 0;
}

export function getRequiresCustomer(saleType: "contado" | "credito"): boolean {
	return saleType === "credito";
}

export function getHasValidPartialAmount(
	paymentMode: PaymentMode,
	amountPaidValue: number,
	totalAmount: number,
): boolean {
	return paymentMode !== "a_cuenta" || (amountPaidValue > 0 && amountPaidValue <= totalAmount);
}

export function getCanSubmit(
	cartItemsLength: number,
	requiresCustomer: boolean,
	selectedCustomer: Customer | null,
	hasValidPartialAmount: boolean,
): boolean {
	return (
		cartItemsLength > 0 &&
		(!requiresCustomer || !!selectedCustomer) &&
		hasValidPartialAmount
	);
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

			// Payment and sale configuration
			paymentMode: "pago_total",
			setPaymentMode: (mode) => set({ paymentMode: mode }),
			amountPaid: "",
			setAmountPaid: (amount) => set({ amountPaid: amount }),
			selectedCustomer: null,
			setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
			submitError: null,
			setSubmitError: (error) => set({ submitError: error }),

			// Persisted
			lastPricePerKg: "",
			setLastPricePerKg: (price) => set({ lastPricePerKg: price }),

			// Test utility - resets store to initial state
			resetStore: () =>
				set({
					cartItems: [],
					selectedProductId: null,
					selectedVariantId: null,
					paymentMode: "pago_total",
					amountPaid: "",
					selectedCustomer: null,
					submitError: null,
					lastPricePerKg: "",
				}),
		}),
		{
			name: "avileo-sale-store",
			partialize: (state) => ({
				lastPricePerKg: state.lastPricePerKg,
			}),
		},
	),
);
