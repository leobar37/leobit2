/**
 * Visitas Schema
 * Visit records linked to distributions for vendor tracking
 */
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { visitaStatusEnum, syncStatusEnum } from "./enums";
import { businesses, businessUsers } from "./businesses";
import { customers } from "./customers";
import { distribuciones } from "./inventory";
import { sales } from "./sales";

export const visitas = pgTable(
  "visitas",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    // Relations
    distribucionId: uuid("distribucion_id")
      .notNull()
      .references(() => distribuciones.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    vendedorId: uuid("vendedor_id")
      .notNull()
      .references(() => businessUsers.id),

    // Visit status
    status: visitaStatusEnum("status").notNull().default("pendiente"),

    // Reason when status is "no_compra"
    motivoNoCompra: varchar("motivo_no_compra", { length: 255 }),

    // Optional link to sale if customer purchased
    saleId: uuid("sale_id").references(() => sales.id, { onDelete: "set null" }),

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
    index("idx_visitas_business_id").on(table.businessId),
    index("idx_visitas_distribucion_id").on(table.distribucionId),
    index("idx_visitas_customer_id").on(table.customerId),
    index("idx_visitas_vendedor_id").on(table.vendedorId),
    index("idx_visitas_status").on(table.status),
    index("idx_visitas_sale_id").on(table.saleId),
    index("idx_visitas_sync_status").on(table.syncStatus),
    index("idx_visitas_created_at").on(table.createdAt),
  ]
);

// Type exports
export type Visita = typeof visitas.$inferSelect;
export type NewVisita = typeof visitas.$inferInsert;

// Relations
export const visitasRelations = relations(visitas, ({ one }) => ({
  business: one(businesses, {
    fields: [visitas.businessId],
    references: [businesses.id],
  }),
  distribucion: one(distribuciones, {
    fields: [visitas.distribucionId],
    references: [distribuciones.id],
  }),
  customer: one(customers, {
    fields: [visitas.customerId],
    references: [customers.id],
  }),
  vendedor: one(businessUsers, {
    fields: [visitas.vendedorId],
    references: [businessUsers.id],
  }),
  sale: one(sales, {
    fields: [visitas.saleId],
    references: [sales.id],
  }),
}));
