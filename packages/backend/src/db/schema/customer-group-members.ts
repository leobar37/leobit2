/**
 * Customer Group Members Schema
 * Junction table for many-to-many relationship between customers and groups
 */
import {
  pgTable,
  uuid,
  timestamp,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { syncStatusEnum } from "./enums";
import { customerGroups } from "./customer-groups";
import { customers } from "./customers";
import { businessUsers } from "./businesses";

// Table definition (junction table)
export const customerGroupMembers = pgTable(
  "customer_group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id").notNull(),

    // Foreign keys
    groupId: uuid("group_id")
      .notNull()
      .references(() => customerGroups.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Assignment metadata
    addedAt: timestamp("added_at").notNull().defaultNow(),
    addedBy: uuid("added_by").references(() => businessUsers.id),

    // Sync status for offline support
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_group_members_business_id").on(table.businessId),
    index("idx_customer_group_members_group_id").on(table.groupId),
    index("idx_customer_group_members_customer_id").on(table.customerId),
    index("idx_customer_group_members_sync_status").on(table.syncStatus),
    index("idx_customer_group_members_updated_at").on(table.updatedAt),
  ]
);

// Type exports
export type CustomerGroupMember = typeof customerGroupMembers.$inferSelect;
export type NewCustomerGroupMember = typeof customerGroupMembers.$inferInsert;

export const customerGroupMembersRelations = relations(customerGroupMembers, ({ one }) => ({
  group: one(customerGroups, {
    fields: [customerGroupMembers.groupId],
    references: [customerGroups.id],
  }),
  customer: one(customers, {
    fields: [customerGroupMembers.customerId],
    references: [customers.id],
  }),
  addedByUser: one(businessUsers, {
    fields: [customerGroupMembers.addedBy],
    references: [businessUsers.id],
  }),
}));
