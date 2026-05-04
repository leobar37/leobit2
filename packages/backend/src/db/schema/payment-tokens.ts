import { relations } from "drizzle-orm";
import { boolean, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { abonos } from "./payments";

export const paymentTokens = pgTable(
  "payment_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => abonos.id, { onDelete: "cascade" })
      .unique(),
    token: varchar("token", { length: 12 }).notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    index("idx_payment_tokens_token").on(table.token),
    index("idx_payment_tokens_payment_id").on(table.paymentId),
    index("idx_payment_tokens_is_active").on(table.isActive),
    index("idx_payment_tokens_expires_at").on(table.expiresAt),
  ]
);

export const paymentTokensRelations = relations(paymentTokens, ({ one }) => ({
  payment: one(abonos, {
    fields: [paymentTokens.paymentId],
    references: [abonos.id],
  }),
}));

export type PaymentToken = typeof paymentTokens.$inferSelect;
export type NewPaymentToken = typeof paymentTokens.$inferInsert;
