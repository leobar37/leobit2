export const DEFAULT_CATEGORY_COLOR = "#f97316";

export const CATEGORY_PRESET_COLORS = [
  "#f97316",
  "#ef4444",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#f43f5e",
];

export function isValidCategoryColor(color: string | undefined | null): boolean {
  return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function getCategoryColor(color: string | undefined | null): string {
  return isValidCategoryColor(color) ? color! : DEFAULT_CATEGORY_COLOR;
}
