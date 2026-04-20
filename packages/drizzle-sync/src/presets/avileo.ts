/**
 * Avileo Sync Preset Configuration
 * 
 * Uses defineSyncConfig with Drizzle table references for proper introspection
 * and code generation support.
 */

import { defineSyncConfig } from '../config';
import type { EntitySyncConfig } from '../config/types';

// Import Drizzle tables from @avileo/shared
import {
  customers,
  sales,
  saleItems,
  abonos,
  products,
  productVariants,
  purchases,
  purchaseItems,
  suppliers,
  distribuciones,
  distribucionItems,
  visitas,
  tags,
  customerTags,
  customerGroups,
  customerGroupMembers,
} from '@avileo/shared';

// Entity sync configurations
const entityConfigs: Record<string, EntitySyncConfig> = {
  // ============================================
  // PARENT ENTITIES (Priority 1)
  // ============================================
  
  customers: {
    table: customers,
    syncable: true,
    autoFields: true,
    priority: 1,
    conflictResolver: 'last-write-wins',
    relations: {
      children: [
        { entity: 'sales', foreignKey: 'customer_id' },
        { entity: 'abonos', foreignKey: 'customer_id' },
        { entity: 'visitas', foreignKey: 'customer_id' },
        { entity: 'customer_tags', foreignKey: 'customer_id' },
        { entity: 'customer_group_members', foreignKey: 'customer_id' },
      ],
    },
  },

  products: {
    table: products,
    syncable: true,
    autoFields: true,
    priority: 1,
    conflictResolver: 'last-write-wins',
    relations: {
      children: [
        { entity: 'product_variants', foreignKey: 'product_id' },
      ],
    },
  },

  suppliers: {
    table: suppliers,
    syncable: true,
    autoFields: true,
    priority: 1,
    conflictResolver: 'last-write-wins',
    relations: {
      children: [
        { entity: 'purchases', foreignKey: 'supplier_id' },
      ],
    },
  },

  tags: {
    table: tags,
    syncable: true,
    autoFields: true,
    priority: 1,
    conflictResolver: 'last-write-wins',
    relations: {
      children: [
        { entity: 'customer_tags', foreignKey: 'tag_id' },
      ],
    },
  },

  customer_groups: {
    table: customerGroups,
    syncable: true,
    autoFields: true,
    priority: 1,
    conflictResolver: 'last-write-wins',
    // API path is "groups" not "customerGroups" (prefix is /groups in customer-groups.ts)
    apiPath: 'groups',
    relations: {
      children: [
        { entity: 'customer_group_members', foreignKey: 'group_id' },
      ],
    },
  },

  purchases: {
    table: purchases,
    syncable: true,
    autoFields: true,
    priority: 1,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'suppliers', foreignKey: 'supplier_id', required: false },
      ],
      children: [
        { entity: 'purchase_items', foreignKey: 'purchase_id' },
      ],
    },
  },

  distribuciones: {
    table: distribuciones,
    syncable: true,
    autoFields: true,
    priority: 1,
    conflictResolver: 'last-write-wins',
    relations: {
      children: [
        { entity: 'distribucion_items', foreignKey: 'distribucion_id' },
        { entity: 'visitas', foreignKey: 'distribucion_id' },
      ],
    },
  },

  // ============================================
  // CHILD ENTITIES (Priority 2)
  // ============================================

  sales: {
    table: sales,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'version-based',
    relations: {
      parents: [
        { entity: 'customers', foreignKey: 'customer_id', required: false },
      ],
      children: [
        { entity: 'sale_items', foreignKey: 'sale_id' },
      ],
    },
  },

  sale_items: {
    table: saleItems,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'sales', foreignKey: 'sale_id', required: true },
        { entity: 'products', foreignKey: 'product_id', required: true },
        { entity: 'product_variants', foreignKey: 'variant_id', required: true },
      ],
    },
  },

  abonos: {
    table: abonos,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'customers', foreignKey: 'customer_id', required: true },
        { entity: 'sales', foreignKey: 'related_sale_id', required: false },
      ],
    },
  },

  product_variants: {
    table: productVariants,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'products', foreignKey: 'product_id', required: true },
      ],
    },
  },

  purchase_items: {
    table: purchaseItems,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'purchases', foreignKey: 'purchase_id', required: true },
        { entity: 'products', foreignKey: 'product_id', required: true },
      ],
    },
  },

  distribucion_items: {
    table: distribucionItems,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'distribuciones', foreignKey: 'distribucion_id', required: true },
      ],
    },
  },

  visitas: {
    table: visitas,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'distribuciones', foreignKey: 'distribucion_id', required: true },
        { entity: 'customers', foreignKey: 'customer_id', required: true },
      ],
    },
  },

  customer_tags: {
    table: customerTags,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'customers', foreignKey: 'customer_id', required: true },
        { entity: 'tags', foreignKey: 'tag_id', required: true },
      ],
    },
  },

  customer_group_members: {
    table: customerGroupMembers,
    syncable: true,
    autoFields: true,
    priority: 2,
    conflictResolver: 'last-write-wins',
    relations: {
      parents: [
        { entity: 'customer_groups', foreignKey: 'group_id', required: true },
        { entity: 'customers', foreignKey: 'customer_id', required: true },
      ],
    },
    // Explicitly mark as junction table since it has an 'id' column
    // but should not include businessId in insert/findByBusiness
    metadata: { isJunctionTable: true },
  },
};

export const avileoConfig = defineSyncConfig({
  entities: entityConfigs,
  options: {
    batchSize: 100,
    maxRetries: 5,
    syncInterval: 5000,
  },
});

// Export entity configs for direct access
export const avileoEntities = entityConfigs;

export type AvileoEntity = keyof typeof avileoEntities;

export default avileoConfig;
