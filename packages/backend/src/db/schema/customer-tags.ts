/**
 * Customer Tags Schema
 * Tabla de unión many-to-many entre clientes y etiquetas
 */
import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
  index,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customers } from "./customers";
import { tags } from "./tags";
import { businessUsers } from "./businesses";

// Sync status enum
const syncStatusEnum = pgEnum("sync_status", ["pending", "synced", "error"]);

// Table definition (junction table)
export const customerTags = pgTable(
  "customer_tags",
  {
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),

    // Assignment metadata
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    assignedBy: uuid("assigned_by").references(() => businessUsers.id),

    // Sync status for offline support
    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.customerId, table.tagId] }),
    customerIdx: index("idx_customer_tags_customer_id").on(table.customerId),
    tagIdx: index("idx_customer_tags_tag_id").on(table.tagId),
  })
);

// Type exports
export type CustomerTag = typeof customerTags.$inferSelect;
export type NewCustomerTag = typeof customerTags.$inferInsert;

export const customerTagsRelations = relations(customerTags, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTags.customerId],
    references: [customers.id],
  }),
  tag: one(tags, {
    fields: [customerTags.tagId],
    references: [tags.id],
  }),
  assignedByUser: one(businessUsers, {
    fields: [customerTags.assignedBy],
    references: [businessUsers.id],
  }),
}));
