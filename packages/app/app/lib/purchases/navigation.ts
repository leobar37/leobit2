export function getPurchaseEditorPath(purchaseId: string, isDraft: boolean = false): string {
  if (isDraft) {
    return `/compras/nueva/${purchaseId}`;
  }
  return `/compras/${purchaseId}/editar`;
}

export function getPurchaseCalculatorPath(purchaseId: string, isDraft: boolean = false): string {
  if (isDraft) {
    return `/compras/nueva/${purchaseId}/calculadora`;
  }
  return `/compras/${purchaseId}/editar/calculadora`;
}
