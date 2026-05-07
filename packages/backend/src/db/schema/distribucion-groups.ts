/**
 * Distribucion Groups Schema
 * Junction table for many-to-many relationship between distribuciones and customer groups
 */
import {
  pgTable,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { distribuciones } from "./inventory";
import { customerGroups } from "./customer-groups";
import { businesses } from "./businesses";

export const distribucionGroups = pgTable(
  "distribucion_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Foreign keys
    distribucionId: uuid("distribucion_id")
      .notNull()
      .references(() => distribuciones.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => customerGroups.id, { onDelete: "cascade" }),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_distribucion_groups_business_id").on(table.businessId),
    index("idx_distribucion_groups_distribucion_id").on(table.distribucionId),
    index("idx_distribucion_groups_group_id").on(table.groupId),
  ]
);

export type DistribucionGroup = typeof distribucionGroups.$inferSelect;
export type NewDistribucionGroup = typeof distribucionGroups.$inferInsert;

export const distribucionGroupsRelations = relations(distribucionGroups, ({ one }) => ({
  business: one(businesses, {
    fields: [distribucionGroups.businessId],
    references: [businesses.id],
  }),
  distribucion: one(distribuciones, {
    fields: [distribucionGroups.distribucionId],
    references: [distribuciones.id],
  }),
  group: one(customerGroups, {
    fields: [distribucionGroups.groupId],
    references: [customerGroups.id],
  }),
}));
