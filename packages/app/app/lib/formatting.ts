import { formatDisplayDate, parseISODate } from "./date-utils";

export function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

export function formatDate(date: Date | null | string): string {
  if (!date) return "N/A";
  if (typeof date === "string") {
    return formatDisplayDate(parseISODate(date));
  }
  return formatDisplayDate(date);
}
