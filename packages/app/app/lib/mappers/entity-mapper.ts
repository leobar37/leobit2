/**
 * snake_case to camelCase mapper for database results
 * Normalizes raw PGlite query results to match TypeScript interfaces
 */

type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

type SnakeCaseKeysToCamelCase<T> = {
  [K in keyof T as SnakeToCamel<K & string>]: T[K] extends object
    ? SnakeCaseKeysToCamelCase<T[K]>
    : T[K];
};

/**
 * Converts a snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively converts all snake_case keys in an object to camelCase
 * Works with nested objects and arrays
 */
export function mapToCamelCase<T>(obj: T): SnakeCaseKeysToCamelCase<T> {
  if (obj === null || obj === undefined) {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => mapToCamelCase(item)) as any;
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = mapToCamelCase(value);
    }
    return result;
  }

  return obj as any;
}

/**
 * Type-safe mapper for database entities
 * Use this to convert raw DB results to typed objects
 */
export function mapEntity<T>(row: Record<string, unknown>): T {
  return mapToCamelCase(row) as T;
}

/**
 * Maps a list of database rows to typed entities
 */
export function mapEntityList<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => mapEntity<T>(row));
}

/**
 * Utility to handle both snake_case (from PGlite) and camelCase (from TypeScript)
 * Use this when you're unsure which format you'll receive
 *
 * @example
 * const customerId = normalizeField(row, 'customerId', 'customer_id');
 */
export function normalizeField<T>(
  row: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): T | undefined {
  if (row[camelKey] !== undefined) {
    return row[camelKey] as T;
  }
  if (row[snakeKey] !== undefined) {
    return row[snakeKey] as T;
  }
  return undefined;
}

/**
 * Normalizes an entire row handling both naming conventions
 */
export function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamelCase(key);
    // Only add if camel version doesn't exist yet
    if (!(camelKey in result)) {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Normalizes a list of rows
 */
export function normalizeRowList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(normalizeRow);
}

/**
 * Date field names (camelCase and snake_case) that should be converted to Date objects
 */
const DATE_FIELDS = new Set([
  // camelCase
  "saleDate",
  "deliveryDate",
  "orderDate",
  "cancelledAt",
  "refundDate",
  "createdAt",
  "updatedAt",
  "purchaseDate",
  "fecha",
  "joinedAt",
  // snake_case
  "sale_date",
  "delivery_date",
  "order_date",
  "cancelled_at",
  "refund_date",
  "created_at",
  "updated_at",
  "purchase_date",
  "joined_at",
]);

/**
 * Checks if a value looks like an ISO date string
 */
function isISODateString(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // ISO 8601 regex: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss.sss±HH:mm
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;
  return isoDateRegex.test(value);
}

/**
 * Converts snake_case keys to camelCase and automatically converts ISO date strings to Date objects
 * Works recursively for nested objects
 *
 * @example
 * const row = { sale_date: "2024-01-15T10:30:00Z", total_amount: "100.00" };
 * const result = mapToCamelCaseWithDates(row);
 * // result: { saleDate: Date object, totalAmount: "100.00" }
 */
export function mapToCamelCaseWithDates<T>(obj: T): SnakeCaseKeysToCamelCase<T> {
  if (obj === null || obj === undefined) {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => mapToCamelCaseWithDates(item)) as any;
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      // Convert ISO date strings to Date objects for known date fields
      if (DATE_FIELDS.has(key) || DATE_FIELDS.has(camelKey)) {
        if (isISODateString(value)) {
          result[camelKey] = new Date(value as string);
        } else {
          result[camelKey] = value;
        }
      } else if (typeof value === "object" && value !== null) {
        result[camelKey] = mapToCamelCaseWithDates(value);
      } else {
        result[camelKey] = value;
      }
    }
    return result;
  }

  return obj as any;
}
