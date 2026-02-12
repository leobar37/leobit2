/**
 * System Config Schema
 * Configuracion del sistema - solo 1 registro
 */
import {
  pgTable,
  uuid,
  boolean,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { modoOperacionEnum } from "./enums";

// Table definition - solo permite 1 registro via constraint
export const systemConfig = pgTable(
  "system_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Operation mode
    modoOperacion: modoOperacionEnum("modo_operacion")
      .notNull()
      .default("inventario_propio"),

    // Feature flags
    controlKilos: boolean("control_kilos").notNull().default(true),
    usarDistribucion: boolean("usar_distribucion").notNull().default(true),
    permitirVentaSinStock: boolean("permitir_venta_sin_stock")
      .notNull()
      .default(false),

    // Timestamps
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Constraint para asegurar solo 1 registro
    check("single_row_check", sql`${table.id} IS NOT NULL`),
  ]
);

// Type exports
export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;
