/**
 * Customer Groups Schema
 * Groups for organizing customers (e.g., "VIP Customers", "Restaurant Owners")
 */
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { syncStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { customerGroupMembers } from "./customer-group-members";

// Table definition
export const customerGroups = pgTable(
  "customer_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Group info
    name: varchar("name", { length: 100 }).notNull(),

    // Business relation
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Version for optimistic locking (multi-device conflict detection)
    version: integer("version").notNull().default(1),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_groups_business_id").on(table.businessId),
    index("idx_customer_groups_name").on(table.name),
  ]
);

// Type exports
export type CustomerGroup = typeof customerGroups.$inferSelect;
export type NewCustomerGroup = typeof customerGroups.$inferInsert;

export const customerGroupsRelations = relations(customerGroups, ({ one, many }) => ({
  business: one(businesses, {
    fields: [customerGroups.businessId],
    references: [businesses.id],
  }),
  members: many(customerGroupMembers),
}));
