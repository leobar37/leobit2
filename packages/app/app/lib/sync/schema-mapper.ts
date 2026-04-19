/**
 * Schema Mapper
 *
 * Re-exports schema mapping utilities from @avileo/drizzle-sync/pglite
 * and provides app-specific table mapping for Drizzle tables.
 *
 * This module provides:
 * - Table name validation (SQL injection protection)
 * - Column whitelisting for INSERT/UPDATE operations
 * - camelCase to snake_case conversion
 * - Relation field detection
 * - Drizzle table lookup (app-specific)
 *
 * @module sync/schema-mapper
 */

import type { PgTable } from "drizzle-orm/pg-core";
import * as schema from "@avileo/shared";

// Re-export all utilities from the library
export {
  // Table validation
  VALID_TABLES,
  isValidTableName,
  getTableColumns,
  isValidColumn,
  getInvalidColumns,

  // Column utilities
  filterValidColumns,
  toSnakeCase,

  // Relation detection
  isRelationField,

  // Types
  type TableMap,
} from "@avileo/drizzle-sync/pglite";

// ============================================================================
// App-Specific: Drizzle Table Mapping
// ============================================================================

/**
 * Static table map using shared schema.
 *
 * This maps entity types (snake_case) to Drizzle PgTable references.
 * Only the app knows the actual schema tables, so this is kept here
 * rather than in the library.
 */
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
 * Get the Drizzle table for a given entity type.
 *
 * This function is app-specific because it requires knowledge of the
 * actual Drizzle table definitions from @avileo/shared.
 *
 * @param entityType - Entity type from the sync API (snake_case)
 * @returns Drizzle table or null if not found
 */
export function getTableForEntity(entityType: string): PgTable | null {
  return TABLE_MAP[entityType] ?? null;
}
