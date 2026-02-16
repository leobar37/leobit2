/**
 * Customers Schema
 * Clientes del sistema con soporte offline-first
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { syncStatusEnum } from "./enums";
import { businesses, businessUsers } from "./businesses";

// Table definition
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Basic info
    name: varchar("name", { length: 255 }).notNull(),
    dni: varchar("dni", { length: 20 }),
    phone: varchar("phone", { length: 50 }),
    address: text("address"),
    notes: text("notes"),

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Relations - creado por un usuario dentro de un negocio
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    createdBy: uuid("created_by").references(() => businessUsers.id),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_customers_name").on(table.name),
    index("idx_customers_dni").on(table.dni),
    index("idx_customers_business_id").on(table.businessId),
    index("idx_customers_sync_status").on(table.syncStatus),
    index("idx_customers_created_by").on(table.createdBy),
  ]
);

// Type exports
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export const customersRelations = relations(customers, ({ one }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id],
  }),
  createdByUser: one(businessUsers, {
    fields: [customers.createdBy],
    references: [businessUsers.id],
  }),
}));
