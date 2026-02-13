import {
  pgTable,
  uuid,
  decimal,
  integer,
  timestamp,
  index,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { syncStatusEnum } from "./enums";
import { businesses, businessUsers } from "./businesses";

export const closings = pgTable(
  "closings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => businessUsers.id),

    closingDate: date("closing_date").notNull(),

    totalSales: integer("total_sales").notNull().default(0),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    cashAmount: decimal("cash_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    creditAmount: decimal("credit_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalKilos: decimal("total_kilos", { precision: 10, scale: 3 }),

    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_closings_business_id").on(table.businessId),
    index("idx_closings_seller_id").on(table.sellerId),
    index("idx_closings_date").on(table.closingDate),
    index("idx_closings_sync_status").on(table.syncStatus),
  ]
);

export const closingsRelations = relations(closings, ({ one }) => ({
  seller: one(businessUsers, {
    fields: [closings.sellerId],
    references: [businessUsers.id],
  }),
}));

export type Closing = typeof closings.$inferSelect;
export type NewClosing = typeof closings.$inferInsert;
