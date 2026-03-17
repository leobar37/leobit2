/**
 * Sales Points Schema
 * Catálogo de puntos de venta para distribuciones
 */
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";
import { syncStatusEnum } from "./enums";

export const puntoVentaTypes = ["carro", "local", "mercado", "ruta", "otro"] as const;
export type PuntoVentaType = (typeof puntoVentaTypes)[number];

export const puntosVenta = pgTable(
  "puntos_venta",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 20 }),
    description: varchar("description", { length: 255 }),
    type: varchar("type", { length: 20 }).$type<PuntoVentaType>(),

    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_puntos_venta_business_id").on(table.businessId),
    index("idx_puntos_venta_name").on(table.name),
    index("idx_puntos_venta_is_active").on(table.isActive),
    index("idx_puntos_venta_sort_order").on(table.sortOrder),
    index("idx_puntos_venta_type").on(table.type),
    index("idx_puntos_venta_sync_status").on(table.syncStatus),
  ]
);

export type PuntoVenta = typeof puntosVenta.$inferSelect;
export type NewPuntoVenta = typeof puntosVenta.$inferInsert;

export const puntosVentaRelations = relations(puntosVenta, ({ one }) => ({
  business: one(businesses, {
    fields: [puntosVenta.businessId],
    references: [businesses.id],
  }),
}));
