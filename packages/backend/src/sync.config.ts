import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import {
  customers,
  sales,
  saleItems,
  products,
  productVariants,
  purchases,
  purchaseItems,
  suppliers,
  abonos,
  distribuciones,
  distribucionItems,
  tags,
  customerTags,
  customerGroups,
  customerGroupMembers,
  visitas,
} from "./db/schema";

export const syncConfig = defineSyncConfig({
  entities: {
    // Simple entities (no children)
    customers: {
      table: customers,
      syncable: true,
      conflictResolver: "version-based",
    },

    products: {
      table: products,
      syncable: true,
      autoFields: true,
      excludeFields: ["cost_price"],
      conflictResolver: "version-based",
    },

    productVariants: {
      table: productVariants,
      syncable: true,
      conflictResolver: "version-based",
      // API uses /variants prefix
      apiPath: "variants",
    },

    suppliers: {
      table: suppliers,
      syncable: true,
      conflictResolver: "version-based",
    },

    tags: {
      table: tags,
      syncable: true,
      conflictResolver: "version-based",
    },

    customerTags: {
      table: customerTags,
      syncable: true,
      conflictResolver: "version-based",
      // Mark as junction table - no businessId, managed through parent entities
      metadata: { isJunctionTable: true },
    },

    customerGroups: {
      table: customerGroups,
      syncable: true,
      conflictResolver: "version-based",
      // API path is "groups" not "customerGroups" (prefix is /groups in customer-groups.ts)
      apiPath: "groups",
    },

    customerGroupMembers: {
      table: customerGroupMembers,
      syncable: true,
      conflictResolver: "version-based",
      // Mark as junction table - no businessId in insert/findByBusiness
      metadata: { isJunctionTable: true },
    },

    visitas: {
      table: visitas,
      syncable: true,
      conflictResolver: "version-based",
    },

    // Parent entities with children
    sales: {
      table: sales,
      syncable: true,
      conflictResolver: "version-based",
      relations: {
        children: [
          {
            entity: "saleItems",
            foreignKey: "sale_id",
            cascade: true,
          },
        ],
      },
    },

    saleItems: {
      table: saleItems,
      syncable: true,
      conflictResolver: "version-based",
    },

    purchases: {
      table: purchases,
      syncable: true,
      conflictResolver: "version-based",
      relations: {
        children: [
          {
            entity: "purchaseItems",
            foreignKey: "purchase_id",
            cascade: true,
          },
        ],
      },
    },

    purchaseItems: {
      table: purchaseItems,
      syncable: true,
      conflictResolver: "version-based",
    },

    distribuciones: {
      table: distribuciones,
      syncable: true,
      conflictResolver: "version-based",
      relations: {
        children: [
          {
            entity: "distribucionItems",
            foreignKey: "distribucion_id",
            cascade: true,
          },
        ],
      },
    },

    distribucionItems: {
      table: distribucionItems,
      syncable: true,
      conflictResolver: "version-based",
    },

    // Payments (abonos) - API uses /payments prefix
    abonos: {
      table: abonos,
      syncable: true,
      conflictResolver: "version-based",
      apiPath: "payments",
    },
  },

  options: {
    batchSize: 50,
    maxRetries: 3,
    syncInterval: 30000, // 30 seconds
  },
});

export default syncConfig;
