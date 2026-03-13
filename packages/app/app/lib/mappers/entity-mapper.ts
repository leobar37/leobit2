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
