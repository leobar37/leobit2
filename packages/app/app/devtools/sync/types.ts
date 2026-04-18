export interface SyncStatus {
  pending: number;
  processing: number;
  syncing: number;
  completed: number;
  failed: number;
  conflict: number;
  deadLetter: number;
  total: number;
}

export type HealthStatusLevel = "healthy" | "warning" | "critical" | "stuck";

export interface HealthScoreFactor {
  name: string;
  deduction: number;
  value: number;
}

export interface HealthScore {
  score: number;
  status: HealthStatusLevel;
  factors: HealthScoreFactor[];
  previousScore: number | null;
  trend: "improving" | "stable" | "degrading" | null;
}

export interface SyncOperation {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  status: string;
  sync_attempts: number;
  last_error: string | null;
  created_at: string;
}

export interface DeadLetterOperation {
  id: string;
  operation_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  error: string;
  original_error: string | null;
  sync_attempts: number;
  created_at: string;
}

export interface EntitySyncSummary {
  table: string;
  label: string;
  total: number;
  pending: number;
  synced: number;
  error: number;
}

export const ENTITY_LABELS: Record<string, string> = {
  customers: "Clientes",
  products: "Productos",
  suppliers: "Proveedores",
  product_variants: "Variantes",
  inventory: "Inventario",
  variant_inventory: "Inventario por variante",
  sales: "Ventas",
  purchases: "Compras",
  abonos: "Abonos",
  sale_items: "Items de venta",
  purchase_items: "Items de compra",
  distribuciones: "Distribuciones",
  distribucion_items: "Items de distribución",
  tags: "Etiquetas",
  customer_tags: "Etiquetas por cliente",
};

/**
 * Devtools-only UI list for tables that expose a local `sync_status` column in summaries.
 *
 * Classification:
 * - This is a LOCAL-ONLY devtools list, not a canonical backend API contract.
 * - Entries may reference canonical entities, but the list itself exists only for frontend diagnostics.
 */
export const TABLES_WITH_SYNC_STATUS = new Set([
  "customers", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "products", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "suppliers", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "product_variants", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "sales", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "purchases", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "abonos", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "purchase_items", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "distribuciones", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "distribucion_items", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "tags", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
  "customer_tags", // CANONICAL entity, used here in a LOCAL-ONLY devtools list
]);

/**
 * Devtools-only entity summary order for sync inspection screens.
 *
 * Classification:
 * - This is a LOCAL-ONLY frontend/devtools list.
 * - Most entries reference canonical sync entities for display.
 * - `inventory` is frontend-local UI data.
 * - `variant_inventory` is a legacy entity still surfaced for diagnostics.
 */
export const SYNCED_TABLES = [
  "customers", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "products", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "suppliers", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "product_variants", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "inventory", // LOCAL-ONLY: frontend inventory view/devtools label, not in shared SYNC_ENTITIES
  "variant_inventory", // LEGACY: deprecated entity still shown in devtools, not in shared SYNC_ENTITIES
  "sales", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "purchases", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "abonos", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "sale_items", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "purchase_items", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "distribuciones", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "distribucion_items", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "tags", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "customer_tags", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "customer_groups", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "customer_group_members", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
  "visitas", // CANONICAL entity, listed here for LOCAL-ONLY devtools summaries
] as const;

export const ENTITY_SUMMARY_CONFIG = SYNCED_TABLES.map((table) => ({
  table,
  label: ENTITY_LABELS[table] ?? table,
  hasSyncStatus: TABLES_WITH_SYNC_STATUS.has(table),
}));

export const OPERATION_TABS = [
  { value: "status", label: "Estado" },
  { value: "operations", label: "Operaciones" },
  { value: "dead-letter", label: "DLQ" },
  { value: "tables", label: "Tablas" },
  { value: "database", label: "BD" },
  { value: "timeline", label: "Timeline" },
  { value: "metrics", label: "Métricas" },
  { value: "performance", label: "Perf" },
] as const;

export type ActiveTab = (typeof OPERATION_TABS)[number]["value"];

export const getEntityTone = (summary: EntitySyncSummary) => {
  if (summary.error > 0) return "border-red-200 bg-red-50/80";
  if (summary.pending > 0) return "border-orange-200 bg-orange-50/80";
  return "border-green-200 bg-green-50/70";
};

export const initialSyncStatus: SyncStatus = {
  pending: 0,
  processing: 0,
  syncing: 0,
  completed: 0,
  failed: 0,
  conflict: 0,
  deadLetter: 0,
  total: 0,
};
