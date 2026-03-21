export function getPurchaseEditorPath(purchaseId: string): string {
  return `/compras/${purchaseId}/editar`;
}

export function getPurchaseCalculatorPath(purchaseId: string): string {
  return `/compras/${purchaseId}/editar/calculadora`;
}
