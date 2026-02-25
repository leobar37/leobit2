import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  integer,
  date,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses, businessUsers } from "./businesses";
import { customers } from "./customers";
import { products, productVariants } from "./inventory";
import { orderStatusEnum, saleTypeEnum, syncStatusEnum } from "./enums";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => customers.id),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => businessUsers.id),

    deliveryDate: date("delivery_date").notNull(),
    orderDate: date("order_date").notNull(),
    status: orderStatusEnum("status").notNull().default("draft"),
    paymentIntent: saleTypeEnum("payment_intent").notNull().default("contado"),

    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    confirmedSnapshot: jsonb("confirmed_snapshot").$type<Record<string, unknown>>(),
    deliveredSnapshot: jsonb("delivered_snapshot").$type<Record<string, unknown>>(),
    version: integer("version").notNull().default(1),

    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_orders_business_delivery_status").on(
      table.businessId,
      table.deliveryDate,
      table.status
    ),
    index("idx_orders_business_client").on(table.businessId, table.clientId),
    index("idx_orders_business_sync").on(table.businessId, table.syncStatus),
    index("idx_orders_seller_id").on(table.sellerId),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),

    productName: varchar("product_name", { length: 255 }).notNull(),
    variantName: varchar("variant_name", { length: 50 }).notNull(),

    orderedQuantity: decimal("ordered_quantity", { precision: 10, scale: 3 }).notNull(),
    deliveredQuantity: decimal("delivered_quantity", { precision: 10, scale: 3 }),
    unitPriceQuoted: decimal("unit_price_quoted", { precision: 10, scale: 2 }).notNull(),
    unitPriceFinal: decimal("unit_price_final", { precision: 10, scale: 2 }),

    isModified: boolean("is_modified").notNull().default(false),
    originalQuantity: decimal("original_quantity", { precision: 10, scale: 3 }),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.orderId),
    index("idx_order_items_product_id").on(table.productId),
    index("idx_order_items_variant_id").on(table.variantId),
  ]
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  client: one(customers, {
    fields: [orders.clientId],
    references: [customers.id],
  }),
  business: one(businesses, {
    fields: [orders.businessId],
    references: [businesses.id],
  }),
  seller: one(businessUsers, {
    fields: [orders.sellerId],
    references: [businessUsers.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));
