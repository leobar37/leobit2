import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Re-export ID generator
export { generateId, createSyncId } from "./utils/id-generator"

/**
 * Utility for merging Tailwind CSS class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the first element of an array (for useLiveQuery results)
 * Returns undefined if array is null/undefined/empty
 *
 * @param arr - Array to get first element from
 * @returns First element or undefined
 *
 * @example
 * const order = first(orders) // orders?.[0]
 * const purchase = first(purchases) // purchases?.[0]
 */
export function first<T>(arr: T[] | undefined | null): T | undefined {
  return arr?.[0]
}

// ============================================
// Number Formatting Utilities
// Centralized number formatting to prevent crashes from undefined values
// and allow easy configuration of decimal places globally
// ============================================

/**
 * Default decimal places for different number types
 * Modify these to change app-wide formatting behavior
 */
export const NUMBER_FORMAT_DEFAULTS = {
  /** Kilos - typically 1 decimal place */
  kilos: 1,
  /** Currency - typically 2 decimal places */
  currency: 2,
  /** Weight (calculator) - typically 3 decimal places */
  weight: 3,
  /** Percentages - typically 0 decimal places */
  percentage: 0,
  /** General numbers - default 2 decimal places */
  default: 2,
} as const

/**
 * Safely format a number with specified decimal places
 * Returns "0" followed by decimals if value is null, undefined, or invalid
 *
 * @param value - The number to format (can be number, string, null, or undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string with fixed decimal places
 *
 * @example
 * formatNumber(123.456, 2) // "123.46"
 * formatNumber(null, 2)    // "0.00"
 * formatNumber(undefined)  // "0.00"
 * formatNumber("invalid")  // "0.00"
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = NUMBER_FORMAT_DEFAULTS.default
): string {
  if (value === null || value === undefined) {
    return (0).toFixed(decimals)
  }

  const num = typeof value === "string" ? parseFloat(value) : value

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return (0).toFixed(decimals)
  }

  return num.toFixed(decimals)
}

/**
 * Format kilos with default 1 decimal place
 * Safe for undefined/null values
 *
 * @param value - Kilos value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted kilos string
 *
 * @example
 * formatKilos(12.34)      // "12.3"
 * formatKilos(undefined)  // "0.0"
 * formatKilos(12.34, 2)   // "12.34"
 */
export function formatKilos(
  value: number | string | null | undefined,
  decimals: number = NUMBER_FORMAT_DEFAULTS.kilos
): string {
  return formatNumber(value, decimals)
}

/**
 * Format currency (Peruvian Soles) with default 2 decimal places
 * Safe for undefined/null values
 *
 * @param value - Amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (without symbol)
 *
 * @example
 * formatCurrency(123.456)      // "123.46"
 * formatCurrency(undefined)    // "0.00"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  decimals: number = NUMBER_FORMAT_DEFAULTS.currency
): string {
  return formatNumber(value, decimals)
}

/**
 * Format weight (calculator precision) with default 3 decimal places
 * Safe for undefined/null values
 *
 * @param value - Weight value to format
 * @param decimals - Number of decimal places (default: 3)
 * @returns Formatted weight string
 *
 * @example
 * formatWeight(12.3456)      // "12.346"
 * formatWeight(undefined)    // "0.000"
 */
export function formatWeight(
  value: number | string | null | undefined,
  decimals: number = NUMBER_FORMAT_DEFAULTS.weight
): string {
  return formatNumber(value, decimals)
}

/**
 * Format percentage with default 0 decimal places
 * Safe for undefined/null values
 *
 * @param value - Percentage value to format (e.g., 85.5 for 85.5%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (without % symbol)
 *
 * @example
 * formatPercentage(85.5)      // "86"
 * formatPercentage(85.5, 1)   // "85.5"
 * formatPercentage(undefined) // "0"
 */
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = NUMBER_FORMAT_DEFAULTS.percentage
): string {
  return formatNumber(value, decimals)
}

/**
 * Parse a string/number to a normalized amount with 2 decimal places
 * Safe for string inputs from form fields
 *
 * @param value - The value to parse (string or number)
 * @returns Normalized number with 2 decimal places
 *
 * @example
 * parseAmount("123.456") // 123.46
 * parseAmount("100")    // 100
 * parseAmount("")       // 0
 * parseAmount(null)     // 0
 */
export function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100) / 100;
}

/**
 * Calculate balance due: total - paid
 * Returns 0 if result is negative
 *
 * @param total - Total amount
 * @param paid - Amount already paid
 * @returns Balance due (never negative)
 */
export function calculateBalanceDue(total: number, paid: number): number {
  const result = total - paid;
  return result < 0 ? 0 : Math.round(result * 100) / 100;
}

/**
 * Formats a Date to YYYY-MM-DD string for <input type="date">
 * Accepts both Date objects and ISO string dates
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
