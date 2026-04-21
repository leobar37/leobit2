import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import { currency, weight } from "@avileo/drizzle-sync/codecs";
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
      fieldCodecs: {
        total_amount: currency(),
        amount_paid: currency({ nullable: true }),
        balance_due: currency({ nullable: true }),
        tara: weight({ nullable: true }),
        net_weight: weight({ nullable: true }),
      },
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
      fieldCodecs: {
        quantity: weight({ nullable: true }),
        ordered_quantity: weight({ nullable: true }),
        delivered_quantity: weight({ nullable: true }),
        unit_price: currency({ nullable: true }),
        unit_price_quoted: currency({ nullable: true }),
        unit_price_final: currency({ nullable: true }),
        subtotal: currency(),
        cost_price_snapshot: currency({ nullable: true }),
        original_quantity: weight({ nullable: true }),
      },
    },

    purchases: {
      table: purchases,
      syncable: true,
      conflictResolver: "version-based",
      fieldCodecs: {
        total_amount: currency(),
      },
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
      fieldCodecs: {
        quantity: weight(),
        unit_cost: currency(),
        total_cost: currency({ nullable: true }),
      },
    },

    distribuciones: {
      table: distribuciones,
      syncable: true,
      conflictResolver: "version-based",
      fieldCodecs: {
        monto_recaudado: currency({ nullable: true }),
      },
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
      fieldCodecs: {
        cantidad_asignada: weight(),
        cantidad_vendida: weight({ nullable: true }),
      },
    },

    // Payments (abonos) - API uses /payments prefix
    abonos: {
      table: abonos,
      syncable: true,
      conflictResolver: "version-based",
      apiPath: "payments",
      fieldCodecs: {
        amount: currency(),
      },
    },
  },

  options: {
    batchSize: 50,
    maxRetries: 3,
    syncInterval: 30000, // 30 seconds
  },
});

export default syncConfig;
