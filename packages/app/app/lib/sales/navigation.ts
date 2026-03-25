import type { Sale } from "~/lib/db/schemas/sale";

export function shouldOpenSaleEditor(
  sale: Pick<Sale, "status" | "type">
): boolean {
  if (sale.status === "draft") return true;
  // Confirmed pre_orders should open in editor for delivery adjustments
  if (sale.type === "pre_order" && sale.status === "confirmed") return true;
  return false;
}

export function getSaleEditorPath(saleId: string): string {
  return `/ventas/${saleId}/editar`;
}

export function getSaleCalculatorPath(saleId: string): string {
  return `/ventas/${saleId}/editar/calculadora`;
}
