import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sales } from "./sales";

export const saleTokens = pgTable(
  "sale_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),

    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sale_tokens_sale_id").on(table.saleId),
    index("idx_sale_tokens_expires_at").on(table.expiresAt),
  ]
);

export type SaleToken = typeof saleTokens.$inferSelect;
export type NewSaleToken = typeof saleTokens.$inferInsert;

export const saleTokensRelations = relations(saleTokens, ({ one }) => ({
  sale: one(sales, {
    fields: [saleTokens.saleId],
    references: [sales.id],
  }),
}));
