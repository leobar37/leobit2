/**
 * Business Subscriptions Schema
 * Tenant-scoped subscription plans for Avileo Cocheras.
 * Free/Professional plans with monthly limits and feature gates.
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";
import type { SubscriptionPlanConfig } from "@avileo/shared";

export const businessSubscriptions = pgTable(
  "business_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    plan: varchar("plan", { length: 20 }).notNull().default("gratis"),

    monthlyRecordLimit: integer("monthly_record_limit"),
    priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull().default("0"),

    features: jsonb("features").$type<SubscriptionPlanConfig["features"]>().default({
      reports: false,
      exportExcel: false,
    }),

    currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
    currentPeriodEnd: timestamp("current_period_end").notNull().defaultNow(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ux_business_subscriptions_business_id").on(table.businessId),
  ]
);

export const businessSubscriptionsRelations = relations(
  businessSubscriptions,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessSubscriptions.businessId],
      references: [businesses.id],
    }),
  })
);

export type BusinessSubscription = typeof businessSubscriptions.$inferSelect;
export type NewBusinessSubscription = typeof businessSubscriptions.$inferInsert;
