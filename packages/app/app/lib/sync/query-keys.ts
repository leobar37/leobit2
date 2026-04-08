/**
 * Query Keys Registry
 *
 * Maps sync entity types to their TanStack Query key arrays.
 * Used by the sync engine to invalidate affected caches after pull.
 *
 * NOTE: This avoids importing hooks into the sync layer.
 */

import type { SyncEntity } from "@avileo/shared";

/**
 * Maps each sync entity type to the list of TanStack Query key arrays
 * that should be invalidated when that entity changes.
 *
 * Coverage: All entities in SYNC_ENTITIES that are used in hooks.
 * If an entity is not listed here, changes to it will NOT trigger
 * cache invalidation after pull (FR-002 gap).
 */
export const SYNC_TO_QUERY_KEYS: Record<string, string[][]> = {
  customers: [
    ["customers-new"],
    ["customers-new", "list"],
  ],
  sales: [
    ["sales-new"],
    ["sales-new", "filtered"],
    ["sales-new", "detail"],
  ],
  sale_items: [
    // sale_items are fetched as part of sale queries, no dedicated hook keys
  ],
  abonos: [
    ["abonos"],
    ["abonos", "list"],
  ],
  products: [
    ["products-new"],
    ["products-new", "list"],
  ],
  product_variants: [
    ["product-variants"],
    ["product-variants", "list"],
  ],
  suppliers: [
    ["suppliers"],
    ["suppliers", "list"],
  ],
  purchases: [
    ["purchases"],
    ["purchases", "list"],
  ],
  purchase_items: [
    // purchase_items fetched as part of purchase queries
  ],
  distribuciones: [
    ["distribuciones"],
    ["distribuciones", "list"],
  ],
  distribucion_items: [
    // fetched as part of distribucion queries
  ],
  tags: [
    ["tags"],
    ["tags", "list"],
  ],
  customer_tags: [
    ["customer-tags"],
    ["customer-tags", "list"],
  ],
  customer_groups: [
    ["customer-groups"],
    ["customer-groups", "list"],
  ],
  customer_group_members: [
    // fetched as part of customer group queries
  ],
  visitas: [
    ["visitas"],
    ["visitas", "list"],
  ],
};

/**
 * Get all query keys for a given entity type.
 * Returns empty array if entity is not registered.
 */
export function getQueryKeysForEntity(entityType: string): string[][] {
  return SYNC_TO_QUERY_KEYS[entityType] ?? [];
}
