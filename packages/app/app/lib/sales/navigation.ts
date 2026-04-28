import type { Sale } from "~/hooks/use-sales";
import { buildUrlWithReturn } from "~/lib/navigation/return-url";

export function shouldOpenSaleEditor(
  sale: Pick<Sale, "status" | "type">
): boolean {
  if (sale.status === "draft") return true;
  if (sale.type === "pre_order" && sale.status === "confirmed") return true;
  return false;
}

export function getSaleEditorPath(saleId: string): string {
  return `/ventas/${saleId}/editar`;
}

export function getSaleCalculatorPath(saleId: string): string {
  return `/ventas/${saleId}/editar/calculadora`;
}

export function getSaleDetailPathWithReturn(
  saleId: string,
  currentLocation: { pathname: string; search: string }
): string {
  return buildUrlWithReturn(`/ventas/${saleId}`, currentLocation);
}

export function getSaleEditorPathWithReturn(
  saleId: string,
  currentLocation: { pathname: string; search: string }
): string {
  return buildUrlWithReturn(`/ventas/${saleId}/editar`, currentLocation);
}
