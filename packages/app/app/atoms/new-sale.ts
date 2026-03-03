import { atom } from "jotai";
import type { Customer } from "~/lib/db/schema";
import type { PaymentMode } from "~/lib/sales/types";
import { getPaymentSummary } from "~/lib/sales/payment-utils";
import { useSaleStore } from "~/stores/sale.store";

// UI State - Jotai
export const selectedCustomerAtom = atom<Customer | null>(null);
export const paymentModeAtom = atom<PaymentMode>("pago_total");
export const amountPaidAtom = atom("");
export const submitErrorAtom = atom<string | null>(null);
export const showVariantSelectorAtom = atom(false);

// Derived atoms that read from Zustand store
// Note: These use a workaround to read from Zustand in Jotai atoms
const getCartItemsFromStore = () => useSaleStore.getState().cartItems;

export const totalAmountAtom = atom((get) => {
  const cartItems = getCartItemsFromStore();
  return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
});

export const totalNetoKgAtom = atom((get) => {
  const cartItems = getCartItemsFromStore();
  return cartItems
    .filter((item) => item.unit === "kg")
    .reduce((sum, item) => sum + item.quantity, 0);
});

export const cartItemsCountAtom = atom((get) => {
  return getCartItemsFromStore().length;
});

export const paymentSummaryAtom = atom((get) => {
  const cartItems = getCartItemsFromStore();
  return getPaymentSummary(
    get(paymentModeAtom),
    get(totalAmountAtom),
    get(amountPaidAtom),
    get(selectedCustomerAtom),
    cartItems.length,
  );
});

export const saleTypeAtom = atom((get) => get(paymentSummaryAtom).saleType);
export const amountPaidValueAtom = atom((get) => get(paymentSummaryAtom).amountPaidValue);
export const balanceDueAtom = atom((get) => get(paymentSummaryAtom).balanceDue);
export const requiresCustomerAtom = atom((get) => get(paymentSummaryAtom).requiresCustomer);
export const hasValidPartialAmountAtom = atom((get) => get(paymentSummaryAtom).hasValidPartialAmount);
export const canSubmitAtom = atom((get) => get(paymentSummaryAtom).canSubmit);
