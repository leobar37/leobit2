export function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

export function formatDate(date: Date | null | string): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
