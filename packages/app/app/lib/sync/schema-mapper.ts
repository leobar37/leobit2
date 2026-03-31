/**
 * Schema Mapper
 * Maps entity types to Drizzle tables and provides column validation
 */

import type { PgTable } from "drizzle-orm/pg-core";
import * as schema from "@avileo/shared";

/**
 * Pull/apply safety whitelist for entity-to-table mapping.
 *
 * Classification:
 * - Most entries are canonical and match `@avileo/shared` `SYNC_ENTITIES`.
 * - `variant_inventory` is intentionally pull-protected: it is still whitelisted here for safety,
 *   but it is not part of the canonical shared sync API contract.
 */
export const VALID_TABLES = new Set([
  "customers", // CANONICAL: shared SYNC_ENTITIES
  "products", // CANONICAL: shared SYNC_ENTITIES
  "product_variants", // CANONICAL: shared SYNC_ENTITIES
  "sales", // CANONICAL: shared SYNC_ENTITIES
  "sale_items", // CANONICAL: shared SYNC_ENTITIES
  "abonos", // CANONICAL: shared SYNC_ENTITIES
  "purchases", // CANONICAL: shared SYNC_ENTITIES
  "purchase_items", // CANONICAL: shared SYNC_ENTITIES
  "suppliers", // CANONICAL: shared SYNC_ENTITIES
  "variant_inventory", // PULL-PROTECTED + LEGACY: safety whitelist only, not in shared SYNC_ENTITIES
  "distribuciones", // CANONICAL: shared SYNC_ENTITIES
  "distribucion_items", // CANONICAL: shared SYNC_ENTITIES
  "tags", // CANONICAL: shared SYNC_ENTITIES
  "customer_tags", // CANONICAL: shared SYNC_ENTITIES
  "customer_groups", // CANONICAL: shared SYNC_ENTITIES
  "customer_group_members", // CANONICAL: shared SYNC_ENTITIES
  "visitas", // CANONICAL: shared SYNC_ENTITIES
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
