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
 * TENANT_COLUMN_TOKEN: The string "tenant_id" in TABLE_COLUMNS acts as a
 * placeholder token. At runtime, the configured tenantColumn (e.g. "business_id")
 * is resolved via resolveTenantColumn() so the whitelist matches the actual DB column.
 */

import type { PgTable } from "drizzle-orm/pg-core";
import type { EntityConfig } from "../config/types";

const TENANT_COLUMN_TOKEN = "tenant_id";

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

export function isRelationField(field: string, config?: ChangeApplierConfig): boolean {
  const relationFields = config?.relationFields ?? RELATION_FIELDS;
  return relationFields.has(field);
}

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

const TABLE_COLUMNS: Record<string, Set<string>> = {
  customers: new Set([
    "id", TENANT_COLUMN_TOKEN, "name", "dni", "phone", "address", "notes",
    "sync_status", "sync_attempts", "created_by", "created_at", "updated_at"
  ]),
  products: new Set([
    "id", TENANT_COLUMN_TOKEN, "name", "type", "unit", "base_price", "cost_price", "is_active",
    "has_variants", "image_id", "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  product_variants: new Set([
    "id", TENANT_COLUMN_TOKEN, "product_id", "name", "sku", "unit_quantity", "price", "cost_price",
    "sort_order", "is_active", "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  sales: new Set([
    "id", TENANT_COLUMN_TOKEN, "customer_id", "seller_id", "distribucion_id", "visita_id",
    "type", "sale_type", "payment_mode", "total_amount", "amount_paid", "balance_due",
    "tara", "net_weight", "sale_date", "delivery_date", "order_date", "status",
    "version", "confirmed_snapshot", "delivered_snapshot", "allow_customer_edit",
    "sync_status", "sync_attempts", "cancelled_at", "cancelled_by", "cancel_reason",
    "refund_amount", "refund_date", "refund_method", "refund_reference", "refund_notes",
    "advance_payment_method", "advance_reference_number", "advance_proof_image_id",
    "created_at", "updated_at"
  ]),
  sale_items: new Set([
    "id", TENANT_COLUMN_TOKEN, "sale_id", "product_id", "variant_id", "product_name",
    "variant_name", "quantity", "ordered_quantity", "delivered_quantity", "unit_price",
    "unit_price_quoted", "unit_price_final", "cost_price_snapshot", "subtotal", "is_modified", "original_quantity",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  abonos: new Set([
    "id", TENANT_COLUMN_TOKEN, "customer_id", "seller_id", "related_sale_id", "amount", "payment_method",
    "reference_number", "notes", "proof_image_id", "sync_status", "sync_attempts",
    "created_at", "updated_at"
  ]),
  purchases: new Set([
    "id", TENANT_COLUMN_TOKEN, "supplier_id", "purchase_date", "status", "total_amount",
    "invoice_number", "receipt_image_id", "notes",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  purchase_items: new Set([
    "id", TENANT_COLUMN_TOKEN, "purchase_id", "product_id", "variant_id", "unit_id", "quantity",
    "unit_cost", "total_cost", "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  suppliers: new Set([
    "id", TENANT_COLUMN_TOKEN, "name", "type", "ruc", "phone", "email", "address", "notes",
    "is_active", "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  distribuciones: new Set([
    "id", TENANT_COLUMN_TOKEN, "vendedor_id", "punto_venta", "punto_venta_id", "fecha", "estado", "modo",
    "monto_recaudado", "nota_creacion", "nota_cierre",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  distribucion_items: new Set([
    "id", TENANT_COLUMN_TOKEN, "distribucion_id", "variant_id", "cantidad_asignada", "cantidad_vendida", "unidad",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  tags: new Set([
    "id", TENANT_COLUMN_TOKEN, "name", "color", "sync_status", "sync_attempts",
    "created_at", "updated_at"
  ]),
  customer_tags: new Set([
    "customer_id", "tag_id", "assigned_at", "assigned_by", "sync_status", "sync_attempts"
  ]),
  customer_groups: new Set([
    "id", TENANT_COLUMN_TOKEN, "name", "color", "sync_status", "sync_attempts",
    "created_at", "updated_at"
  ]),
  customer_group_members: new Set([
    "id", TENANT_COLUMN_TOKEN, "group_id", "customer_id", "sync_status", "sync_attempts",
    "added_at", "added_by"
  ]),
  visitas: new Set([
    "id", TENANT_COLUMN_TOKEN, "distribucion_id", "customer_id", "vendedor_id", "status", "motivo_no_compra", "sale_id",
    "sync_status", "sync_attempts", "created_at", "updated_at"
  ]),
  variant_inventory: new Set([
    "id", TENANT_COLUMN_TOKEN, "variant_id", "quantity",
    "created_at", "updated_at"
  ]),
};

const INVALID_COLUMNS: Record<string, Set<string>> = {
  products: new Set(["sku", "price", "product_id", "sort_order", "unit_quantity"]),
};

export const DEFAULT_CHANGE_APPLIER_CONFIG: ChangeApplierConfig = {
  validTables: VALID_TABLES,
  tableColumns: TABLE_COLUMNS,
  relationFields: RELATION_FIELDS,
};

function resolveTenantColumn(column: string, tenantColumn?: string): boolean {
  if (column === TENANT_COLUMN_TOKEN) return true;
  if (tenantColumn && column === tenantColumn) return true;
  return false;
}

function hasColumn(set: Set<string>, column: string, tenantColumn?: string): boolean {
  if (set.has(column)) return true;
  if (tenantColumn && tenantColumn !== TENANT_COLUMN_TOKEN && resolveTenantColumn(column, tenantColumn)) {
    return set.has(TENANT_COLUMN_TOKEN);
  }
  return false;
}

export function isValidTableName(tableName: string, config?: ChangeApplierConfig): boolean {
  const validTables = config?.validTables ?? VALID_TABLES;
  return validTables.has(tableName);
}

export function getTableColumns(
  tableName: string,
  tenantColumn?: string,
  config?: ChangeApplierConfig
): Set<string> | null {
  const tableColumns = config?.tableColumns ?? TABLE_COLUMNS;
  const base = tableColumns[tableName];
  if (!base) return null;
  if (!tenantColumn || tenantColumn === TENANT_COLUMN_TOKEN) return base;
  const resolved = new Set<string>();
  for (const col of base) {
    if (col === TENANT_COLUMN_TOKEN) {
      resolved.add(tenantColumn);
    } else {
      resolved.add(col);
    }
  }
  return resolved;
}

export function isValidColumn(
  tableName: string,
  column: string,
  tenantColumn?: string,
  config?: ChangeApplierConfig
): boolean {
  const tableColumns = config?.tableColumns ?? TABLE_COLUMNS;
  const columns = tableColumns[tableName];
  return columns ? hasColumn(columns, column, tenantColumn) : false;
}

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

export function filterValidColumns(
  tableName: string,
  payload: Record<string, unknown>,
  tenantColumn?: string,
  config?: ChangeApplierConfig
): Record<string, unknown> {
  const tableColumns = config?.tableColumns ?? TABLE_COLUMNS;
  const baseSet = tableColumns[tableName];
  if (!baseSet) {
    console.warn(`[SchemaMapper] Unknown table: ${tableName}, allowing all columns`);
    return payload;
  }

  const filtered: Record<string, unknown> = {};
  const removed: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (key.startsWith("_") || isRelationField(key, config)) {
      continue;
    }

    if (hasColumn(baseSet, key, tenantColumn)) {
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

export function getInvalidColumns(tableName: string): Set<string> {
  return INVALID_COLUMNS[tableName] ?? new Set();
}

export type TableMap = Record<string, PgTable>;

export interface ChangeApplierConfig {
  validTables: Set<string>;
  tableColumns: Record<string, Set<string>>;
  requiredDefaults?: Record<string, Record<string, unknown>>;
  relationFields?: Set<string>;
  applyOrder?: string[];
}

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
