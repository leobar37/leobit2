import { ValidationError } from "../errors";

/**
 * Normalizes an amount value with specified decimal places
 * @param value - The number to normalize
 * @param decimals - Number of decimal places (default: 2)
 * @param fieldName - Field name for error messages
 * @returns Normalized amount as string with fixed decimals
 * @throws ValidationError if value is not a finite number
 */
export function normalizeAmount(
  value: number,
  decimals: number = 2,
  fieldName: string = "Monto"
): string {
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${fieldName} inválido`);
  }
  return Math.max(0, Number(value.toFixed(decimals))).toFixed(decimals);
}

/**
 * Normalizes a quantity value (3 decimal places for weights)
 * @param value - The quantity to normalize
 * @param fieldName - Field name for error messages
 * @returns Normalized quantity as string with 3 decimals
 * @throws ValidationError if value is not a finite number
 */
export function normalizeQuantity(
  value: number,
  fieldName: string = "Cantidad"
): string {
  return normalizeAmount(value, 3, fieldName);
}

/**
 * Calculates total amount from quantity and unit price
 * @param quantity - The quantity
 * @param unitPrice - Price per unit
 * @returns Total amount as string with 2 decimals
 */
export function calculateTotal(
  quantity: number,
  unitPrice: number
): string {
  const total = quantity * unitPrice;
  return normalizeAmount(total, 2);
}

/**
 * Calculates unit price from total and quantity
 * @param total - Total amount
 * @param quantity - The quantity
 * @returns Unit price as string with 2 decimals
 */
export function calculateUnitPrice(
  total: number,
  quantity: number
): string {
  if (quantity === 0) {
    return "0.00";
  }
  const unitPrice = total / quantity;
  return normalizeAmount(unitPrice, 2);
}

/**
 * Parses a numeric string to number, returning 0 if invalid
 * @param value - String value to parse
 * @returns Parsed number or 0
 */
export function safeParseNumber(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Validates that a number is positive
 * @param value - The number to validate
 * @param fieldName - Field name for error messages
 * @throws ValidationError if value is not positive
 */
export function validatePositive(
  value: number,
  fieldName: string = "Valor"
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${fieldName} debe ser mayor a 0`);
  }
}

/**
 * Validates that a number is non-negative
 * @param value - The number to validate
 * @param fieldName - Field name for error messages
 * @throws ValidationError if value is negative
 */
export function validateNonNegative(
  value: number,
  fieldName: string = "Valor"
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${fieldName} no puede ser negativo`);
  }
}
