export interface DebtLevel {
  color: string;
  label: string;
}

export function getDebtLevel(amount: number): DebtLevel {
  if (amount > 500) {
    return {
      color: "border border-red-200/80 bg-red-100/95 text-red-700 dark:border-red-500/30 dark:bg-red-500/25 dark:text-red-300",
      label: "Alto",
    };
  }

  if (amount > 200) {
    return {
      color: "border border-amber-200/80 bg-amber-100/95 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/25 dark:text-amber-300",
      label: "Medio",
    };
  }

  return {
    color: "border border-emerald-200/80 bg-emerald-100/95 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/25 dark:text-emerald-300",
    label: "Bajo",
  };
}
