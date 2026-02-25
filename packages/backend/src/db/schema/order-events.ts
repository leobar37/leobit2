import {
  pgTable,
  pgEnum,
  uuid,
  jsonb,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orders } from "./orders";
import { businessUsers } from "./businesses";

export const orderEventTypeEnum = pgEnum("order_event_type", [
  "created",
  "updated",
  "item_added",
  "item_updated",
  "item_removed",
  "confirmed",
  "cancelled",
  "delivered",
  "repriced",
]);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    eventType: orderEventTypeEnum("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    clientEventId: varchar("client_event_id", { length: 128 }),
    createdByBusinessUserId: uuid("created_by_business_user_id").references(
      () => businessUsers.id
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_events_order_id").on(table.orderId),
    index("idx_order_events_created_at").on(table.createdAt),
    uniqueIndex("uq_order_events_client_event_id").on(table.clientEventId),
  ]
);

export type OrderEvent = typeof orderEvents.$inferSelect;
export type NewOrderEvent = typeof orderEvents.$inferInsert;

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderEvents.orderId],
    references: [orders.id],
  }),
  createdBy: one(businessUsers, {
    fields: [orderEvents.createdByBusinessUserId],
    references: [businessUsers.id],
  }),
}));
