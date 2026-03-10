import { useMemo } from "react";
import type { Sale, SaleItem } from "~/lib/db/schemas/sale";

export interface SaleCalculations {
  totalAmount: number;
  saleType: "contado" | "credito";
  amountPaidValue: number;
  balanceDue: number;
  requiresCustomer: boolean;
  hasValidPartial: boolean;
  canSubmit: boolean;
}

/**
 * Calcula el monto total de los items
 */
export function calculateTotalAmount(items: SaleItem[]): number {
  return items.reduce((total, item) => total + parseFloat(item.subtotal), 0);
}

/**
 * Determina el tipo de venta basado en el paymentMode
 */
export function getSaleType(paymentMode: string): "contado" | "credito" {
  return paymentMode === "pago_total" ? "contado" : "credito";
}

/**
 * Calcula el monto pagado efectivo
 */
export function getAmountPaidValue(
  paymentMode: string,
  totalAmount: number,
  amountPaid: string
): number {
  if (paymentMode === "pago_total") return totalAmount;
  if (paymentMode === "debe_todo") return 0;
  return parseFloat(amountPaid) || 0;
}

/**
 * Calcula el saldo pendiente
 */
export function getBalanceDue(
  saleType: "contado" | "credito",
  totalAmount: number,
  amountPaidValue: number
): number {
  if (saleType === "contado") return 0;
  return Math.max(totalAmount - amountPaidValue, 0);
}

/**
 * Determina si requiere cliente
 */
export function getRequiresCustomer(saleType: "contado" | "credito"): boolean {
  return saleType === "credito";
}

/**
 * Valida el monto parcial
 */
export function getHasValidPartialAmount(
  paymentMode: string,
  amountPaidValue: number,
  totalAmount: number
): boolean {
  if (paymentMode !== "a_cuenta") return true;
  return amountPaidValue > 0 && amountPaidValue <= totalAmount;
}

/**
 * Determina si puede enviar la venta
 */
export function getCanSubmit(
  itemsLength: number,
  requiresCustomer: boolean,
  selectedCustomer: { id: string } | null,
  hasValidPartialAmount: boolean
): boolean {
  if (itemsLength === 0) return false;
  if (requiresCustomer && !selectedCustomer) return false;
  if (!hasValidPartialAmount) return false;
  return true;
}

/**
 * Hook principal para cálculos de venta
 */
export function useSaleCalculations(
  sale: Sale | null,
  items: SaleItem[]
): SaleCalculations {
  return useMemo(() => {
    const totalAmount = calculateTotalAmount(items);
    const saleType = sale?.saleType || "contado";
    const amountPaidValue = parseFloat(sale?.amountPaid || "0");
    const balanceDue = getBalanceDue(saleType, totalAmount, amountPaidValue);
    const requiresCustomer = getRequiresCustomer(saleType);
    const hasValidPartial = true;
    const canSubmit = getCanSubmit(
      items.length,
      requiresCustomer,
      sale?.clientId ? { id: sale.clientId } : null,
      hasValidPartial
    );

    return {
      totalAmount,
      saleType,
      amountPaidValue,
      balanceDue,
      requiresCustomer,
      hasValidPartial,
      canSubmit,
    };
  }, [sale, items]);
}
