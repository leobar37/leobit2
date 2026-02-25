import type { Customer } from "~/lib/db/schema";
import type { PaymentMode } from "~/lib/sales/types";

export interface PaymentSummary {
  saleType: "contado" | "credito";
  amountPaidValue: number;
  balanceDue: number;
  requiresCustomer: boolean;
  hasValidPartialAmount: boolean;
  canSubmit: boolean;
}

function parseAmount(amountPaid: string): number {
  return parseFloat(amountPaid) || 0;
}

export function getPaymentSummary(
  paymentMode: PaymentMode,
  totalAmount: number,
  amountPaid: string,
  selectedCustomer: Customer | null,
  cartItemsLength: number,
): PaymentSummary {
  const saleType: "contado" | "credito" = paymentMode === "pago_total" ? "contado" : "credito";
  const parsedAmountPaid = parseAmount(amountPaid);

  const amountPaidValue =
    paymentMode === "pago_total"
      ? totalAmount
      : paymentMode === "debe_todo"
        ? 0
        : Math.max(parsedAmountPaid, 0);

  const balanceDue = saleType === "credito" ? Math.max(totalAmount - amountPaidValue, 0) : 0;
  const requiresCustomer = saleType === "credito";
  const hasValidPartialAmount =
    paymentMode !== "a_cuenta" || (amountPaidValue > 0 && amountPaidValue <= totalAmount);

  return {
    saleType,
    amountPaidValue,
    balanceDue,
    requiresCustomer,
    hasValidPartialAmount,
    canSubmit: cartItemsLength > 0 && (!requiresCustomer || !!selectedCustomer) && hasValidPartialAmount,
  };
}
