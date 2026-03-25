/**
 * Sale Tokens Schema
 * Tokens para compartir ventas (drafts/pre_orders) con clientes
 * Similar a order-tokens pero para el sistema unificado de ventas
 */
import { pgTable, uuid, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sales } from "./sales";

export const saleTokens = pgTable(
  "sale_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" })
      .unique(), // One token per sale

    // Token for public access (12 chars, URL-safe)
    token: varchar("token", { length: 12 }).notNull().unique(),

    // Token status
    isActive: boolean("is_active").notNull().default(true),

    // Expiration (default 7 days from creation)
    expiresAt: timestamp("expires_at").notNull(),

    // Tracking
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    index("idx_sale_tokens_token").on(table.token),
    index("idx_sale_tokens_sale_id").on(table.saleId),
    index("idx_sale_tokens_is_active").on(table.isActive),
    index("idx_sale_tokens_expires_at").on(table.expiresAt),
  ]
);

// Relations
export const saleTokensRelations = relations(saleTokens, ({ one }) => ({
  sale: one(sales, {
    fields: [saleTokens.saleId],
    references: [sales.id],
  }),
}));

// Types
export type SaleToken = typeof saleTokens.$inferSelect;
export type NewSaleToken = typeof saleTokens.$inferInsert;
