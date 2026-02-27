/**
 * Product Units Schema
 * Unidades configurables para variantes de productos
 */
import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { syncStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { products } from "./inventory";
import { productVariants } from "./inventory";

export const productUnits = pgTable(
  "product_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    // Relations
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),

    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),

    // Unit info
    name: varchar("name", { length: 50 }).notNull(), // "Jaba"
    displayName: varchar("display_name", { length: 100 }).notNull(), // "Jaba 60un"
    baseUnitQuantity: decimal("base_unit_quantity", {
      precision: 10,
      scale: 3,
    }).notNull(), // 60
    baseUnit: varchar("base_unit", { length: 20 }).notNull().default("unidad"),

    // Display & status
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    // Sync
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_product_units_business_id").on(table.businessId),
    index("idx_product_units_product_id").on(table.productId),
    index("idx_product_units_variant_id").on(table.variantId),
    index("idx_product_units_is_active").on(table.isActive),
    index("idx_product_units_sync_status").on(table.syncStatus),
  ]
);

// Relations
export const productUnitsRelations = relations(productUnits, ({ one }) => ({
  product: one(products, {
    fields: [productUnits.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productUnits.variantId],
    references: [productVariants.id],
  }),
}));

// Type exports
export type ProductUnit = typeof productUnits.$inferSelect;
export type NewProductUnit = typeof productUnits.$inferInsert;
