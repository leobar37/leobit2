export interface DebtLevel {
  color: string;
  label: string;
}

export function getDebtLevel(amount: number): DebtLevel {
  if (amount > 500) return { color: "bg-red-100 text-red-700", label: "Alto" };
  if (amount > 200) return { color: "bg-amber-100 text-amber-700", label: "Medio" };
  return { color: "bg-green-100 text-green-700", label: "Bajo" };
}
