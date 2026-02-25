import { atom } from "jotai";
import type { Customer, Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import type { CalculatorPersistence } from "~/hooks/use-chicken-calculator";
import type { CartItem, PaymentMode } from "~/lib/sales/types";
import { getPaymentSummary } from "~/lib/sales/payment-utils";

export const selectedCustomerAtom = atom<Customer | null>(null);
export const paymentModeAtom = atom<PaymentMode>("pago_total");
export const cartItemsAtom = atom<CartItem[]>([]);
export const amountPaidAtom = atom("");
export const submitErrorAtom = atom<string | null>(null);

export const showVariantSelectorAtom = atom(false);
export const selectedProductAtom = atom<Product | null>(null);
export const selectedVariantAtom = atom<ProductVariant | null>(null);
export const persistedSelectionAtom = atom<CalculatorPersistence | null>(null);

export const unitsInputAtom = atom("");
export const packsInputAtom = atom("");

export const totalAmountAtom = atom((get) =>
  get(cartItemsAtom).reduce((sum, item) => sum + item.subtotal, 0),
);

export const totalNetoKgAtom = atom((get) =>
  get(cartItemsAtom)
    .filter((item) => item.unit === "kg")
    .reduce((sum, item) => sum + item.quantity, 0),
);

export const paymentSummaryAtom = atom((get) =>
  getPaymentSummary(
    get(paymentModeAtom),
    get(totalAmountAtom),
    get(amountPaidAtom),
    get(selectedCustomerAtom),
    get(cartItemsAtom).length,
  ),
);

export const saleTypeAtom = atom((get) => get(paymentSummaryAtom).saleType);
export const amountPaidValueAtom = atom((get) => get(paymentSummaryAtom).amountPaidValue);
export const balanceDueAtom = atom((get) => get(paymentSummaryAtom).balanceDue);
export const requiresCustomerAtom = atom((get) => get(paymentSummaryAtom).requiresCustomer);
export const hasValidPartialAmountAtom = atom((get) => get(paymentSummaryAtom).hasValidPartialAmount);
export const canSubmitAtom = atom((get) => get(paymentSummaryAtom).canSubmit);
