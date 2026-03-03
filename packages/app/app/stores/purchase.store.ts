import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PurchaseCartItem {
  productId: string;
  variantId?: string;
  unitId?: string;
  productName: string;
  variantName?: string;
  unitName?: string;
  packs?: number;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

interface PurchaseState {
  // Cart items
  cartItems: PurchaseCartItem[];
  addToCart: (item: PurchaseCartItem) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  updateCartItem: (index: number, item: PurchaseCartItem) => void;

  // Product selection (for calculator)
  selectedProductId: string | null;
  selectedVariantId: string | null;
  setSelection: (productId: string | null, variantId: string | null) => void;
  clearSelection: () => void;
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      // Cart
      cartItems: [],
      addToCart: (item) => {
        const { cartItems } = get();
        const existingIndex = cartItems.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.variantId === item.variantId &&
            i.unitId === item.unitId
        );

        if (existingIndex < 0) {
          set({ cartItems: [...cartItems, item] });
        } else {
          // Merge quantities and recalculate
          const existing = cartItems[existingIndex];
          const newQuantity = existing.quantity + item.quantity;
          const newSubtotal = parseFloat(
            (newQuantity * item.unitCost).toFixed(2)
          );
          const updatedItem = {
            ...existing,
            quantity: newQuantity,
            unitCost: item.unitCost,
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
    }),
    {
      name: "avileo-purchase-store",
      partialize: () => ({}),
    }
  )
);
