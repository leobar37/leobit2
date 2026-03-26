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
  "tags",
  "customer_tags",
  "customer_groups",
  "customer_group_members",
  "visitas",
]);

// Columnas que NO existen en ciertas tablas (lista negra segura)
// Estas columnas se ignoran silenciosamente para evitar errores SQL
const INVALID_COLUMNS: Record<string, Set<string>> = {
  // products no tiene sku, price, sort_order, unit_quantity (solo product_variants los tiene)
  // products tampoco tiene product_id (esta en product_variants)
  products: new Set(["sku", "price", "product_id", "sort_order", "unit_quantity"]),
  // product_variants tiene product_id que referencia a products
};

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
 * Filtra columnas inválidas conocidas del payload.
 * Usa lista negra para no romper campos existentes que no estén listados.
 *
 * @param tableName - Nombre de la tabla
 * @param payload - Payload a filtrar (snake_case keys)
 * @returns Payload sin columnas inválidas conocidas
 */
export function filterValidColumns(
  tableName: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const invalidColumns = INVALID_COLUMNS[tableName];
  if (!invalidColumns || invalidColumns.size === 0) {
    return payload;
  }

  const filtered: Record<string, unknown> = {};
  const removed: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (invalidColumns.has(key)) {
      removed.push(key);
    } else {
      filtered[key] = value;
    }
  }

  if (removed.length > 0) {
    console.warn(`[SchemaMapper] Columnas ignoradas para ${tableName}: ${removed.join(', ')}`);
  }

  return filtered;
}
