import type { Sale } from "~/lib/db/schemas/sale";

export function shouldOpenSaleEditor(
  sale: Pick<Sale, "status">
): boolean {
  return sale.status === "draft";
}

export function getSaleEditorPath(saleId: string): string {
  return `/ventas/${saleId}/editar`;
}

export function getSaleCalculatorPath(saleId: string): string {
  return `/ventas/${saleId}/editar/calculadora`;
}
