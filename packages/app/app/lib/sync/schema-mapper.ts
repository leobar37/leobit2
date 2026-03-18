/**
 * Schema Mapper
 * Maps entity types to Drizzle tables and provides column validation
 */

import type { PgTable } from "drizzle-orm/pg-core";

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
  "inventory",
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

// Lazy-loaded table map to avoid circular dependencies during tests
let TABLE_MAP: Record<string, PgTable> | null = null;

function getTableMap(): Record<string, PgTable> {
  if (TABLE_MAP) return TABLE_MAP;

  // Dynamic import to avoid issues during testing
  try {
    const schema = require("@avileo/backend/src/db/schema");
    TABLE_MAP = {
      customers: schema.customers,
      products: schema.products,
      product_variants: schema.productVariants,
      sales: schema.sales,
      sale_items: schema.saleItems,
      abonos: schema.abonos,
      purchases: schema.purchases,
      purchase_items: schema.purchaseItems,
      suppliers: schema.suppliers,
      inventory: schema.inventory,
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
  } catch {
    // Fallback for tests - return empty map
    TABLE_MAP = {};
  }

  return TABLE_MAP;
}

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
  return getTableMap()[entityType] ?? null;
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
 * Filter payload to only include valid columns for a table
 * Uses Drizzle table schema to determine valid columns
 * @param tableName - Name of the table
 * @param payload - Payload to filter
 * @returns Filtered payload with only valid columns
 */
export function filterValidColumns(
  tableName: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const table = getTableForEntity(tableName);
  if (!table) {
    return payload;
  }

  // Get column names from Drizzle table
  const columns = Object.keys(table);
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (columns.includes(key)) {
      filtered[key] = value;
    }
  }

  const removedKeys = Object.keys(payload).filter((key) => !columns.includes(key));
  if (removedKeys.length > 0) {
    console.warn(`[SchemaMapper] Filtering out invalid columns for ${tableName}:`, removedKeys);
  }

  return filtered;
}
