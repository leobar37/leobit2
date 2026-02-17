import {
  pgTable,
  uuid,
  varchar,
  decimal,
  date,
  timestamp,
  index,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { purchaseStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { suppliers } from "./suppliers";
import { products, productVariants } from "./inventory";

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),

    purchaseDate: date("purchase_date").notNull(),

    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),

    status: purchaseStatusEnum("status").notNull().default("pending"),

    invoiceNumber: varchar("invoice_number", { length: 50 }),

    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_purchases_business_id").on(table.businessId),
    index("idx_purchases_supplier_id").on(table.supplierId),
    index("idx_purchases_purchase_date").on(table.purchaseDate),
    index("idx_purchases_status").on(table.status),
  ]
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),

    variantId: uuid("variant_id").references(() => productVariants.id),

    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),

    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),

    totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_purchase_items_purchase_id").on(table.purchaseId),
    index("idx_purchase_items_product_id").on(table.productId),
    index("idx_purchase_items_variant_id").on(table.variantId),
  ]
);

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type NewPurchaseItem = typeof purchaseItems.$inferInsert;

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  business: one(businesses, {
    fields: [purchases.businessId],
    references: [businesses.id],
  }),
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [purchaseItems.variantId],
    references: [productVariants.id],
  }),
}));
