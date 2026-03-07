import { pgTable, uuid, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orders } from "./orders";

export const orderTokens = pgTable(
  "order_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),

    token: varchar("token", { length: 12 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    index("idx_order_tokens_token").on(table.token),
  ]
);

export type OrderToken = typeof orderTokens.$inferSelect;
export type NewOrderToken = typeof orderTokens.$inferInsert;

export const orderTokensRelations = relations(orderTokens, ({ one }) => ({
  order: one(orders, {
    fields: [orderTokens.orderId],
    references: [orders.id],
  }),
}));
