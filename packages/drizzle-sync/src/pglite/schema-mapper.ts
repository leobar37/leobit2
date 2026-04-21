/**
 * Schema Mapper
 * Maps entity types to Drizzle tables and provides column validation
 *
 * This module provides:
 * - Table name validation (SQL injection protection)
 * - Column whitelisting for INSERT/UPDATE operations
 * - camelCase to snake_case conversion
 * - Relation field detection
 * - Dynamic schema mapper from entity config
 *
 * NOTE: This module imports from @avileo/shared for schema definitions.
 * The TABLE_MAP uses Drizzle PgTable references which require the full schema.
 */

import type { PgTable } from "drizzle-orm/pg-core";
import type { EntityConfig } from "../config/types";

/**
 * Fields that represent relations/nested objects, not actual columns.
 * These should be excluded from INSERT/UPDATE operations.
 */
const RELATION_FIELDS = new Set([
  "items",
  "customer",
  "seller",
  "business",
  "distribucion",
  "visita",
  "sale",
  "product",
  "variant",
  "supplier",
  "purchase",
  "advanceProofImage",
  "cancelledBy",
  "createdBy",
  "updatedBy",
]);

/**
 * Check if a field name represents a relation/nested object.
 * @param field - Field name to check
 * @returns True if the field is a relation field
 */
export function isRelationField(field: string): boolean {
  return RELATION_FIELDS.has(field);
}

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
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  abonos: new Set([
    "id", "business_id", "customer_id", "seller_id", "related_sale_id", "amount", "payment_method",
    "reference_number", "notes", "proof_image_id", "sync_status", "sync_attempts",
    "created_at", "updated_at"
  ]),
  purchases: new Set([
    "id", "business_id", "supplier_id", "purchase_date", "status", "total_amount",
    "invoice_number", "receipt_image_id", "notes",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  purchase_items: new Set([
    "id", "business_id", "purchase_id", "product_id", "variant_id", "unit_id", "quantity",
    "unit_cost", "total_cost", "sync_status", "sync_attempts", "created_at", "updated_at"
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
    if (key.startsWith("_") || isRelationField(key)) {
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

/**
 * Get invalid columns for a table (blacklist)
 * @param tableName - Name of the table
 * @returns Set of invalid column names or empty set if not found
 */
export function getInvalidColumns(tableName: string): Set<string> {
  return INVALID_COLUMNS[tableName] ?? new Set();
}

/**
 * Table map type for Drizzle schema references.
 */
export type TableMap = Record<string, PgTable>;

/**
 * Configuration for the change applier (server → client sync).
 * This type is used by the generated applier config.
 */
export interface ChangeApplierConfig {
  /** Set of valid table names that can be synced */
  validTables: Set<string>;
  /** Map of table names to their column sets */
  tableColumns: Record<string, Set<string>>;
  /** Default values for required columns without server defaults */
  requiredDefaults?: Record<string, Record<string, unknown>>;
  /** Fields that represent relations, not actual columns */
  relationFields?: Set<string>;
  /** Order in which tables should be applied (for FK constraints) */
  applyOrder?: string[];
}

// ============================================================================
// Dynamic Schema Mapper (config-based)
// ============================================================================

export interface SchemaMapper<TEntity extends string> {
  isValidTableName: (tableName: string) => boolean;
  isValidColumn: (tableName: string, column: string) => boolean;
  getTableColumns: (tableName: string) => Set<string> | null;
  filterValidColumns: (tableName: string, payload: Record<string, unknown>) => Record<string, unknown>;
}

export function createSchemaMapper<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): SchemaMapper<TEntity> {
  const entityValues = Object.values(entities) as EntityConfig<TEntity>[];
  const validTables = new Set(entityValues.map(e => e.tableName));
  const tableColumns: Record<string, Set<string>> = {};

  for (const config of entityValues) {
    tableColumns[config.tableName] = new Set(config.fields as readonly string[]);
  }

  return {
    isValidTableName(tableName: string): boolean {
      return validTables.has(tableName);
    },

    isValidColumn(tableName: string, column: string): boolean {
      const columns = tableColumns[tableName];
      return columns ? columns.has(column) : false;
    },

    getTableColumns(tableName: string): Set<string> | null {
      return tableColumns[tableName] ?? null;
    },

    filterValidColumns(
      tableName: string,
      payload: Record<string, unknown>
    ): Record<string, unknown> {
      const validColumns = tableColumns[tableName];
      if (!validColumns) {
        console.warn(`[SchemaMapper] Unknown table: ${tableName}`);
        return payload;
      }

      const filtered: Record<string, unknown> = {};
      const removed: string[] = [];

      for (const [key, value] of Object.entries(payload)) {
        if (key.startsWith("_") || isRelationField(key)) {
          continue;
        }

        if (validColumns.has(key)) {
          filtered[key] = value;
        } else {
          removed.push(key);
        }
      }

      if (removed.length > 0) {
        console.warn(`[SchemaMapper] Ignored columns for ${tableName}: ${removed.join(', ')}`);
      }

      return filtered;
    },
  };
}
