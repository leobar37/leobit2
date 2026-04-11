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
 * 
 * NOTE: This is the single source of truth for table validation. 
 * Import this from other modules instead of defining your own whitelist.
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

// Column whitelist for each table - only these columns can be inserted/updated
// This prevents SQL injection via column names from payload
const TABLE_COLUMNS: Record<string, Set<string>> = {
  customers: new Set([
    "id", "business_id", "name", "dni", "phone", "address", "notes",
    "sync_status", "sync_attempts", "created_by", "created_at", "updated_at"
  ]),
  products: new Set([
    "id", "business_id", "name", "type", "unit", "base_price", "cost_price", "is_active",
    "has_variants", "image_id", "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  product_variants: new Set([
    "id", "business_id", "product_id", "name", "sku", "unit_quantity", "price", "cost_price",
    "sort_order", "is_active", "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  sales: new Set([
    "id", "business_id", "customer_id", "seller_id", "distribucion_id", "visita_id",
    "type", "sale_type", "payment_mode", "total_amount", "amount_paid", "balance_due",
    "tara", "net_weight", "sale_date", "delivery_date", "order_date", "status",
    "version", "confirmed_snapshot", "delivered_snapshot", "allow_customer_edit",
    "sync_status", "sync_attempts", "cancelled_at", "cancelled_by", "cancel_reason",
    "refund_amount", "refund_date", "refund_method", "refund_reference", "refund_notes",
    "advance_payment_method", "advance_reference_number", "advance_proof_image_id",
    "created_at", "updated_at"
  ]),
  sale_items: new Set([
    "id", "business_id", "sale_id", "product_id", "variant_id", "product_name",
    "variant_name", "quantity", "ordered_quantity", "delivered_quantity", "unit_price",
    "unit_price_quoted", "unit_price_final", "cost_price_snapshot", "subtotal", "is_modified", "original_quantity",
    "sync_status", "sync_attempts", "sync_group_id", "created_at", "updated_at"
  ]),
  abonos: new Set([
    "id", "business_id", "customer_id", "seller_id", "related_sale_id", "amount", "payment_method",
    "reference_number", "notes", "proof_image_id", "sync_status", "sync_attempts",
    "created_at", "updated_at"
  ]),
  purchases: new Set([
    "id", "business_id", "supplier_id", "purchase_date", "status", "total_amount",
    "invoice_number", "receipt_image_id", "notes",
    "sync_status", "sync_attempts", "sync_group_id", "created_at", "updated_at"
  ]),
  purchase_items: new Set([
    "id", "business_id", "purchase_id", "product_id", "variant_id", "unit_id", "quantity",
    "unit_cost", "total_cost", "sync_status", "sync_attempts", "sync_group_id", "created_at", "updated_at"
  ]),
  suppliers: new Set([
    "id", "business_id", "name", "type", "ruc", "phone", "email", "address", "notes",
    "is_active", "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  distribuciones: new Set([
    "id", "business_id", "vendedor_id", "punto_venta", "punto_venta_id", "fecha", "estado", "modo",
    "monto_recaudado", "nota_creacion", "nota_cierre",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  distribucion_items: new Set([
    "id", "business_id", "distribucion_id", "variant_id", "cantidad_asignada", "cantidad_vendida", "unidad",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  tags: new Set([
    "id", "business_id", "name", "color", "sync_status", "sync_attempts",
    "created_at", "updated_at"
  ]),
  customer_tags: new Set([
    "customer_id", "tag_id", "assigned_at", "assigned_by", "sync_status", "sync_attempts"
  ]),
  customer_groups: new Set([
    "id", "business_id", "name", "color", "sync_status", "sync_attempts",
    "created_at", "updated_at"
  ]),
  customer_group_members: new Set([
    "id", "business_id", "group_id", "customer_id", "sync_status", "sync_attempts",
    "added_at", "added_by"
  ]),
  visitas: new Set([
    "id", "business_id", "distribucion_id", "customer_id", "vendedor_id", "status", "motivo_no_compra", "sale_id",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  variant_inventory: new Set([
    "id", "business_id", "variant_id", "quantity",
    "created_at", "updated_at"
  ]),
};

// Columnas que NO existen en ciertas tablas (lista negra adicional)
const INVALID_COLUMNS: Record<string, Set<string>> = {
  products: new Set(["sku", "price", "product_id", "sort_order", "unit_quantity"]),
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
 * Get valid columns for a table (whitelist approach)
 * @param tableName - Name of the table
 * @returns Set of valid column names or null if table not found
 */
export function getTableColumns(tableName: string): Set<string> | null {
  return TABLE_COLUMNS[tableName] ?? null;
}

/**
 * Check if a column is valid for a given table
 * @param tableName - Name of the table
 * @param column - Column name to check
 * @returns True if the column is valid for the table
 */
export function isValidColumn(tableName: string, column: string): boolean {
  const columns = TABLE_COLUMNS[tableName];
  return columns ? columns.has(column) : false;
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
 * Filter payload to only include valid columns for the table (whitelist approach)
 * Unknown columns are logged and removed to prevent SQL errors
 *
 * @param tableName - Name of the table
 * @param payload - Payload to filter (snake_case keys)
 * @returns Filtered payload with only valid columns
 */
export function filterValidColumns(
  tableName: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const validColumns = TABLE_COLUMNS[tableName];
  if (!validColumns) {
    console.warn(`[SchemaMapper] Unknown table: ${tableName}, allowing all columns`);
    return payload;
  }

  const filtered: Record<string, unknown> = {};
  const removed: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    // Skip relation fields
    if (key.startsWith('_') || ['items', 'customer', 'seller', 'business'].includes(key)) {
      continue;
    }
    
    if (validColumns.has(key)) {
      filtered[key] = value;
    } else {
      removed.push(key);
    }
  }

  if (removed.length > 0) {
    console.warn(`[SchemaMapper] Columnas ignoradas para ${tableName}: ${removed.join(', ')}`);
  }

  return filtered;
}
