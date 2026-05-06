import { createScopedCache } from "./scoped-cache";
import type { PaymentMethod } from "~/components/payments/payment-capture";

export interface SalePaymentForm {
  paymentMode: "pago_total" | "a_cuenta" | "debe_todo";
  amountPaid: string;
  paymentMethod: PaymentMethod | null;
  referenceNumber: string;
  proofImageId: string | null;
}

export const DEFAULT_PAYMENT_FORM: SalePaymentForm = {
  paymentMode: "pago_total",
  amountPaid: "",
  paymentMethod: null,
  referenceNumber: "",
  proofImageId: null,
};

export const salePaymentCache = createScopedCache<SalePaymentForm>({
  scope: "avileo-sale-payment",
  ttlMs: 30 * 60 * 1000, // 30 minutes
  version: 1,
});
