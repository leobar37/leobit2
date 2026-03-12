import type { Sale } from "../schemas/sale";

export function buildSalePatchPayload(changes: Partial<Sale>) {
  return {
    ...(changes.customerId !== undefined
      ? { customerId: changes.customerId }
      : {}),
    ...(changes.deliveryDate !== undefined
      ? { deliveryDate: changes.deliveryDate?.toISOString() ?? null }
      : {}),
    ...(changes.saleType !== undefined ? { saleType: changes.saleType } : {}),
    ...(changes.paymentMode !== undefined
      ? { paymentMode: changes.paymentMode }
      : {}),
    ...(changes.totalAmount !== undefined
      ? { totalAmount: parseFloat(changes.totalAmount) }
      : {}),
    ...(changes.amountPaid !== undefined
      ? { amountPaid: parseFloat(changes.amountPaid) }
      : {}),
  };
}
