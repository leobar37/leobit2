/**
 * Sales Schema
 * Ventas e items de venta con soporte offline-first
 */
import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { saleTypeEnum, syncStatusEnum } from "./enums";
import { businesses, businessUsers } from "./businesses";
import { customers } from "./customers";
import { distribuciones, products } from "./inventory";

// Sales table
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    clientId: uuid("client_id").references(() => customers.id),
    // sellerId apunta a business_users (usuario dentro de un negocio específico)
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => businessUsers.id),
    distribucionId: uuid("distribucion_id").references(
      () => distribuciones.id
    ),

    // Sale info
    saleType: saleTypeEnum("sale_type").notNull().default("contado"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    balanceDue: decimal("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),

    // Weight info
    tara: decimal("tara", { precision: 10, scale: 3 }).default("0"), // kg
    netWeight: decimal("net_weight", { precision: 10, scale: 3 }), // kg

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Dates
    saleDate: timestamp("sale_date").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sales_business_id").on(table.businessId),
    index("idx_sales_client_id").on(table.clientId),
    index("idx_sales_seller_id").on(table.sellerId),
    index("idx_sales_distribucion_id").on(table.distribucionId),
    index("idx_sales_sale_type").on(table.saleType),
    index("idx_sales_sync_status").on(table.syncStatus),
    index("idx_sales_sale_date").on(table.saleDate),
  ]
);

// Sale items table
export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),

    // Item details - productName denormalizado para offline
    productName: varchar("product_name", { length: 255 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [
    index("idx_sale_items_sale_id").on(table.saleId),
    index("idx_sale_items_product_id").on(table.productId),
  ]
);

// Relations
export const salesRelations = relations(sales, ({ one, many }) => ({
  client: one(customers, {
    fields: [sales.clientId],
    references: [customers.id],
  }),
  seller: one(businessUsers, {
    fields: [sales.sellerId],
    references: [businessUsers.id],
  }),
  distribucion: one(distribuciones, {
    fields: [sales.distribucionId],
    references: [distribuciones.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

// Type exports
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
