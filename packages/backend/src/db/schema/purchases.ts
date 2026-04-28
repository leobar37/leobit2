import {
  pgTable,
  uuid,
  varchar,
  decimal,
  date,
  timestamp,
  index,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { purchaseStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { suppliers } from "./suppliers";
import { products, productVariants } from "./inventory";
import { productUnits } from "./product-units";
import { files } from "./files";

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    supplierId: uuid("supplier_id")
      .references(() => suppliers.id),

    purchaseDate: date("purchase_date"),

    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),

    status: purchaseStatusEnum("status").notNull().default("draft"),

    invoiceNumber: varchar("invoice_number", { length: 50 }),

    receiptImageId: uuid("receipt_image_id").references(() => files.id),

    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_purchases_business_id").on(table.businessId),
    index("idx_purchases_supplier_id").on(table.supplierId),
    index("idx_purchases_purchase_date").on(table.purchaseDate),
    index("idx_purchases_status").on(table.status),
    index("idx_purchases_receipt_image_id").on(table.receiptImageId),
  ]
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy - required for data isolation
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),

    variantId: uuid("variant_id").references(() => productVariants.id),

    unitId: uuid("unit_id").references(() => productUnits.id),

    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),

    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),

    totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_purchase_items_business_id").on(table.businessId),
    index("idx_purchase_items_purchase_id").on(table.purchaseId),
    index("idx_purchase_items_product_id").on(table.productId),
    index("idx_purchase_items_variant_id").on(table.variantId),
    index("idx_purchase_items_updated_at").on(table.updatedAt),
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
  receiptImage: one(files, {
    fields: [purchases.receiptImageId],
    references: [files.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  business: one(businesses, {
    fields: [purchaseItems.businessId],
    references: [businesses.id],
  }),
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
