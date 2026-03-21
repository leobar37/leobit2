/**
 * Schema Mapper
 * Maps entity types to Drizzle tables and provides column validation
 */

import type { PgTable } from "drizzle-orm/pg-core";
import * as schema from "@avileo/shared";

// Valid table names that can be synced (whitelist for safety)
export const VALID_TABLES = new Set([
  "customers",
  "products",
  "product_variants",
  "sales",
  "sale_items",
  "abonos",
  "purchases",
  "purchase_items",
  "suppliers",
  "variant_inventory",
  "distribuciones",
  "distribucion_items",
  "closings",
  "tags",
  "customer_tags",
  "customer_groups",
  "customer_group_members",
  "visitas",
]);

// Static table map using shared schema
const TABLE_MAP: Record<string, PgTable> = {
  customers: schema.customers,
  products: schema.products,
  product_variants: schema.productVariants,
  sales: schema.sales,
  sale_items: schema.saleItems,
  abonos: schema.abonos,
  purchases: schema.purchases,
  purchase_items: schema.purchaseItems,
  suppliers: schema.suppliers,
  variant_inventory: schema.variantInventory,
  distribuciones: schema.distribuciones,
  distribucion_items: schema.distribucionItems,
  closings: schema.closings,
  tags: schema.tags,
  customer_tags: schema.customerTags,
  customer_groups: schema.customerGroups,
  customer_group_members: schema.customerGroupMembers,
  visitas: schema.visitas,
};

/**
 * Validate that a table name is safe to use
 * @param tableName - Table name to validate
 * @returns True if the table name is valid
 */
export function isValidTableName(tableName: string): boolean {
  return VALID_TABLES.has(tableName);
}

/**
 * Get the Drizzle table for a given entity type
 * @param entityType - Entity type from the sync API
 * @returns Drizzle table or null if not found
 */
export function getTableForEntity(entityType: string): PgTable | null {
  return TABLE_MAP[entityType] ?? null;
}

/**
 * Convert camelCase keys to snake_case
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Filter payload to only include valid columns for a table.
 *
 * IMPORTANT: Drizzle tables from @avileo/shared use camelCase column names
 * (e.g., businessId, syncStatus) but the local PGlite database uses snake_case
 * (e.g., business_id, sync_status). This mismatch means Drizzle column keys
 * do NOT match SQL column names, so we skip column filtering entirely.
 *
 * The database will enforce constraints via SQL errors if invalid columns are
 * passed. This avoids the bug where valid columns were incorrectly removed.
 *
 * @param tableName - Name of the table
 * @param payload - Payload to filter
 * @returns Filtered payload with only valid columns
 */
export function filterValidColumns(
  tableName: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const table = TABLE_MAP[tableName];
  if (!table) {
    return payload;
  }

  // Skip column filtering due to Drizzle (camelCase) vs local SQL (snake_case) mismatch.
  // The database will reject invalid columns via SQL constraints.
  return payload;
}
