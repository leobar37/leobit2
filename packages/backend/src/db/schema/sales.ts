/**
 * Sales Schema
 * Ventas e items de venta con soporte offline-first
 * Unificado: soporta ventas instantáneas (instant_sale) y pedidos (pre_order)
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
import { saleTypeEnum, saleStatusEnum, transactionTypeEnum, paymentModeEnum, refundMethodEnum, syncStatusEnum } from "./enums";
import { businesses, businessUsers } from "./businesses";
import { customers } from "./customers";
import { distribuciones, products, productVariants } from "./inventory";
import { files } from "./files";
import { visitas } from "./visitas";

// Sales table - Unified for instant_sales and pre_orders
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    customerId: uuid("customer_id").references(() => customers.id),
    // sellerId apunta a business_users (usuario dentro de un negocio específico)
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => businessUsers.id),
    distribucionId: uuid("distribucion_id").references(
      () => distribuciones.id
    ),
    visitaId: uuid("visita_id").references(() => visitas.id),

    // Transaction type: instant_sale (venta inmediata) or pre_order (pedido)
    type: transactionTypeEnum("type").notNull().default("instant_sale"),

    // Sale info
    saleType: saleTypeEnum("sale_type").notNull().default("contado"),
    paymentMode: paymentModeEnum("payment_mode"), // pago_total, a_cuenta, debe_todo
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    // Historical balance at sale creation - use CustomerRepository.getBalance() for current debt
    balanceDue: decimal("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),

    // Weight info (for instant_sales)
    tara: decimal("tara", { precision: 10, scale: 3 }).default("0"), // kg
    netWeight: decimal("net_weight", { precision: 10, scale: 3 }), // kg

    // Dates
    saleDate: timestamp("sale_date").notNull().defaultNow(),
    deliveryDate: date("delivery_date"), // For pre_orders
    orderDate: date("order_date"),       // For pre_orders

    // Status workflow:
    // instant_sale: draft -> active -> cancelled
    // pre_order: draft -> confirmed -> delivered/cancelled
    status: saleStatusEnum("status").notNull().default("draft"),

    // Versioning & snapshots (from orders)
    version: integer("version").notNull().default(1),
    confirmedSnapshot: jsonb("confirmed_snapshot").$type<Record<string, unknown>>(),
    deliveredSnapshot: jsonb("delivered_snapshot").$type<Record<string, unknown>>(),

    // Customer edit permissions (from orders)
    allowCustomerEdit: boolean("allow_customer_edit").notNull().default(true),

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Sync group ID for grouping related operations (create, update, confirm)
    syncGroupId: varchar("sync_group_id", { length: 100 }),

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

    // Advance payment info (from orders)
    advancePaymentMethod: varchar("advance_payment_method", { length: 20 }),
    advanceReferenceNumber: varchar("advance_reference_number", { length: 50 }),
    advanceProofImageId: uuid("advance_proof_image_id").references(() => files.id),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sales_business_id").on(table.businessId),
    index("idx_sales_customer_id").on(table.customerId),
    index("idx_sales_seller_id").on(table.sellerId),
    index("idx_sales_distribucion_id").on(table.distribucionId),
    index("idx_sales_visita_id").on(table.visitaId),
    index("idx_sales_type").on(table.type),
    index("idx_sales_sale_type").on(table.saleType),
    index("idx_sales_sync_status").on(table.syncStatus),
    index("idx_sales_status").on(table.status),
    index("idx_sales_cancelled_at").on(table.cancelledAt),
    index("idx_sales_sale_date").on(table.saleDate),
    index("idx_sales_delivery_date").on(table.deliveryDate),
  ]
);

// Sale items table - Unified for instant_sales and pre_orders
export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy - required for Electric sync filtering
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

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

    // Quantities - unified for both instant_sales and pre_orders
    quantity: decimal("quantity", { precision: 10, scale: 3 }), // For instant_sales
    orderedQuantity: decimal("ordered_quantity", { precision: 10, scale: 3 }), // For pre_orders
    deliveredQuantity: decimal("delivered_quantity", { precision: 10, scale: 3 }), // For pre_orders

    // Pricing
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }), // For instant_sales
    unitPriceQuoted: decimal("unit_price_quoted", { precision: 10, scale: 2 }), // For pre_orders
    unitPriceFinal: decimal("unit_price_final", { precision: 10, scale: 2 }), // For pre_orders

    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),

    // Cost snapshot at time of sale (for profit margin analysis)
    costPriceSnapshot: decimal("cost_price_snapshot", { precision: 10, scale: 2 }),

    // Tracking modifications (from orders)
    isModified: boolean("is_modified").notNull().default(false),
    originalQuantity: decimal("original_quantity", { precision: 10, scale: 3 }),

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    syncGroupId: varchar("sync_group_id", { length: 100 }),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sale_items_business_id").on(table.businessId),
    index("idx_sale_items_sale_id").on(table.saleId),
    index("idx_sale_items_product_id").on(table.productId),
    index("idx_sale_items_variant_id").on(table.variantId),
    index("idx_sale_items_sync_group_id").on(table.syncGroupId),
  ]
);

// Type exports
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;

export const salesRelations = relations(sales, ({ one, many }) => ({
  items: many(saleItems),
  customer: one(customers, {
    fields: [sales.customerId],
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
  distribucion: one(distribuciones, {
    fields: [sales.distribucionId],
    references: [distribuciones.id],
  }),
  visita: one(visitas, {
    fields: [sales.visitaId],
    references: [visitas.id],
  }),
  advanceProofImage: one(files, {
    fields: [sales.advanceProofImageId],
    references: [files.id],
  }),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  business: one(businesses, {
    fields: [saleItems.businessId],
    references: [businesses.id],
  }),
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
