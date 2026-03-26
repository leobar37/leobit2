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

export const TABLES_WITH_SYNC_STATUS = new Set([
  "customers",
  "products",
  "suppliers",
  "product_variants",
  "sales",
  "purchases",
  "abonos",
  "purchase_items",
  "distribuciones",
  "distribucion_items",
  "tags",
  "customer_tags",
]);

export const SYNCED_TABLES = [
  "customers",
  "products",
  "suppliers",
  "product_variants",
  "inventory",
  "variant_inventory",
  "sales",
  "purchases",
  "abonos",
  "sale_items",
  "purchase_items",
  "distribuciones",
  "distribucion_items",
  "tags",
  "customer_tags",
  "customer_groups",
  "customer_group_members",
  "visitas",
] as const;

export const ENTITY_SUMMARY_CONFIG = SYNCED_TABLES.map((table) => ({
  table,
  label: ENTITY_LABELS[table] ?? table,
  hasSyncStatus: TABLES_WITH_SYNC_STATUS.has(table),
}));

export const OPERATION_TABS = [
  { value: "tables", label: "Tablas" },
  { value: "operations", label: "Operaciones" },
  { value: "dead-letter", label: "DLQ" },
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