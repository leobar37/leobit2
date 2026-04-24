/**
 * Canonical sync configuration
 * Single source of truth for sync entities, priorities, and subsets
 * Shared between frontend (PGlite) and backend (PostgreSQL)
 */

/** All canonical sync API entities supported by backend handlers */
export const SYNC_ENTITIES = [
  "customers",
  "sales",
  "sale_items",
  "abonos",
  "distribuciones",
  "distribucion_items",
  "products",
  "product_variants",
  "tags",
  "customer_tags",
  "purchases",
  "purchase_items",
  "customer_groups",
  "customer_group_members",
  "visitas",
  "suppliers",
  "files",
] as const;

/** Type derived from canonical entities */
export type SyncEntity = (typeof SYNC_ENTITIES)[number];

/**
 * Entity processing priorities for parent-before-child ordering
 * Lower numbers = processed first within sync groups
 */
export const ENTITY_PRIORITIES: Partial<Record<SyncEntity, number>> = {
  // Tier 1: Root/parent entities
  sales: 1,
  purchases: 1,
  products: 1,
  customers: 1,
  suppliers: 1,
  customer_groups: 1,
  distribuciones: 1,
  tags: 1,
  files: 1,

  // Tier 2: Child entities
  sale_items: 2,
  purchase_items: 2,
  product_variants: 2,
  customer_group_members: 2,
  customer_tags: 2,
  distribucion_items: 2,
  visitas: 2,
  abonos: 2,
};

/** Entities that track sync_status column */
export const SYNC_STATUS_TRACKED = [
  "sales",
  "sale_items",
  "customers",
  "customer_groups",
  "customer_group_members",
  "visitas",
  "abonos",
  "purchases",
  "distribucion_items",
] as const;

/** Entities that support self-heal (convert update to insert if not found) */
export const SELF_HEAL_INSERTABLE = [
  "sales",
  "customers",
  "customer_groups",
  "customer_group_members",
  "visitas",
  "abonos",
  "purchases",
  "purchase_items",
] as const;

/** Type guard to check if a string is a valid SyncEntity */
export function isSyncEntity(entity: string): entity is SyncEntity {
  return (SYNC_ENTITIES as readonly string[]).includes(entity);
}

/** Get entity priority with default fallback */
export function getEntityPriority(entity: SyncEntity): number {
  return ENTITY_PRIORITIES[entity] ?? 99;
}