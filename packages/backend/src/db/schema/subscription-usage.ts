/**
 * Subscription Usage Schema
 * Tracks monthly record usage per business for fast limit checks.
 */
import {
  pgTable,
  uuid,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";

export const subscriptionUsage = pgTable(
  "subscription_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    periodStart: timestamp("period_start").notNull().defaultNow(),
    periodEnd: timestamp("period_end").notNull().defaultNow(),

    recordCount: integer("record_count").notNull().default(0),

    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ux_subscription_usage_business_id").on(table.businessId),
  ]
);

export const subscriptionUsageRelations = relations(
  subscriptionUsage,
  ({ one }) => ({
    business: one(businesses, {
      fields: [subscriptionUsage.businessId],
      references: [businesses.id],
    }),
  })
);

export type SubscriptionUsage = typeof subscriptionUsage.$inferSelect;
export type NewSubscriptionUsage = typeof subscriptionUsage.$inferInsert;
