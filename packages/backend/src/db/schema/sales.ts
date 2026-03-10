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
  text,
  date,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { saleTypeEnum, saleStatusEnum, refundMethodEnum, syncStatusEnum, salePaymentStatusEnum } from "./enums";
import { businesses, businessUsers } from "./businesses";
import { customers } from "./customers";
import { distribuciones, products, productVariants } from "./inventory";
import { orders } from "./orders";
import { files } from "./files";

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
    orderId: uuid("order_id")
      .references(() => orders.id)
      .unique(),
    distribucionId: uuid("distribucion_id").references(
      () => distribuciones.id
    ),

    // Sale info
    saleType: saleTypeEnum("sale_type").notNull().default("contado"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    // Historical balance at sale creation - use CustomerRepository.getBalance() for current debt
    balanceDue: decimal("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),

    // Weight info
    tara: decimal("tara", { precision: 10, scale: 3 }).default("0"), // kg
    netWeight: decimal("net_weight", { precision: 10, scale: 3 }), // kg

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Sale status: draft (in progress) -> active (confirmed) -> cancelled
    status: saleStatusEnum("status").notNull().default("draft"),

    // Cancellation fields
    cancelledAt: timestamp("cancelled_at"),
    cancelledBy: uuid("cancelled_by").references(() => businessUsers.id),
    cancelReason: text("cancel_reason"),

    // Refund tracking
    refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }),
    refundDate: timestamp("refund_date"),
    refundMethod: refundMethodEnum("refund_method"),
    refundReference: varchar("refund_reference", { length: 100 }),
    refundNotes: text("refund_notes"),

    // Dates
    saleDate: timestamp("sale_date").notNull().defaultNow(),
    deliveryDate: date("delivery_date"),

    // Versioning for optimistic locking
    version: integer("version").notNull().default(1),

    // Snapshots for order-like functionality
    confirmedSnapshot: jsonb("confirmed_snapshot").$type<Record<string, unknown>>(),
    deliveredSnapshot: jsonb("delivered_snapshot").$type<Record<string, unknown>>(),

    // Payment tracking
    paymentStatus: salePaymentStatusEnum("payment_status").notNull().default("sin_pago"),
    advanceAmount: decimal("advance_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    advancePaymentMethod: varchar("advance_payment_method", { length: 20 }),
    advanceReferenceNumber: varchar("advance_reference_number", { length: 50 }),
    advanceProofImageId: uuid("advance_proof_image_id").references(() => files.id),

    // Allow customer to edit the sale
    allowCustomerEdit: boolean("allow_customer_edit").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sales_business_id").on(table.businessId),
    index("idx_sales_client_id").on(table.clientId),
    index("idx_sales_seller_id").on(table.sellerId),
    index("idx_sales_order_id").on(table.orderId),
    index("idx_sales_distribucion_id").on(table.distribucionId),
    index("idx_sales_sale_type").on(table.saleType),
    index("idx_sales_sync_status").on(table.syncStatus),
    index("idx_sales_status").on(table.status),
    index("idx_sales_cancelled_at").on(table.cancelledAt),
    index("idx_sales_sale_date").on(table.saleDate),
    index("idx_sales_delivery_date").on(table.deliveryDate),
    index("idx_sales_payment_status").on(table.paymentStatus),
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
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),

    // Item details - productName denormalizado para offline
    productName: varchar("product_name", { length: 255 }).notNull(),
    variantName: varchar("variant_name", { length: 50 }).notNull(), // snapshot legible
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(), // snapshot final vendido
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),

    // Order-like fields for partial delivery tracking
    orderedQuantity: decimal("ordered_quantity", { precision: 10, scale: 3 }),
    deliveredQuantity: decimal("delivered_quantity", { precision: 10, scale: 3 }),
    unitPriceQuoted: decimal("unit_price_quoted", { precision: 10, scale: 2 }),
    unitPriceFinal: decimal("unit_price_final", { precision: 10, scale: 2 }),
    isModified: boolean("is_modified").notNull().default(false),
    originalQuantity: decimal("original_quantity", { precision: 10, scale: 3 }),
  },
  (table) => [
    index("idx_sale_items_sale_id").on(table.saleId),
    index("idx_sale_items_product_id").on(table.productId),
    index("idx_sale_items_variant_id").on(table.variantId),
  ]
);

// Type exports
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;

export const salesRelations = relations(sales, ({ one, many }) => ({
  items: many(saleItems),
  client: one(customers, {
    fields: [sales.clientId],
    references: [customers.id],
  }),
  business: one(businesses, {
    fields: [sales.businessId],
    references: [businesses.id],
  }),
  seller: one(businessUsers, {
    fields: [sales.sellerId],
    references: [businessUsers.id],
  }),
  order: one(orders, {
    fields: [sales.orderId],
    references: [orders.id],
  }),
  distribucion: one(distribuciones, {
    fields: [sales.distribucionId],
    references: [distribuciones.id],
  }),
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
  variant: one(productVariants, {
    fields: [saleItems.variantId],
    references: [productVariants.id],
  }),
}));
