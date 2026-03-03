import { atom } from "jotai";
import type { Supplier } from "~/hooks/use-suppliers";
import { usePurchaseStore } from "~/stores/purchase.store";

// UI State - Jotai
export const selectedSupplierAtom = atom<Supplier | null>(null);
export const receiptFileAtom = atom<File | null>(null);
export const receiptPreviewAtom = atom<string | null>(null);
export const showProductSelectorAtom = atom(false);

// Derived atoms that read from Zustand store
const getCartItemsFromStore = () => usePurchaseStore.getState().cartItems;

export const totalAmountAtom = atom((get) => {
  const cartItems = getCartItemsFromStore();
  return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
});

export const cartItemsCountAtom = atom((get) => {
  return getCartItemsFromStore().length;
});
