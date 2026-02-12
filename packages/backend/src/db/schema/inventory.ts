/**
 * Inventory Schema
 * Productos, inventario y distribuciones
 */
import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  timestamp,
  date,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  productTypeEnum,
  productUnitEnum,
  distribucionStatusEnum,
  syncStatusEnum,
} from "./enums";
import { businesses, businessUsers } from "./businesses";

// Products table
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Product info
    name: varchar("name", { length: 255 }).notNull(),
    type: productTypeEnum("type").notNull().default("pollo"),
    unit: productUnitEnum("unit").notNull().default("kg"),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_type").on(table.type),
    index("idx_products_is_active").on(table.isActive),
  ]
);

// Inventory table
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),

    // Stock
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("0"),

    // Timestamps
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_inventory_product_id").on(table.productId),
  ]
);

// Distribuciones table (asignacion diaria a vendedores)
export const distribuciones = pgTable(
  "distribuciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations - business y vendedor
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    vendedorId: uuid("vendedor_id")
      .notNull()
      .references(() => businessUsers.id),

    // Distribution info
    puntoVenta: varchar("punto_venta", { length: 100 }).notNull(), // Carro A, Casa, etc.
    kilosAsignados: decimal("kilos_asignados", { precision: 10, scale: 3 }).notNull(),
    kilosVendidos: decimal("kilos_vendidos", { precision: 10, scale: 3 }).notNull().default("0"),
    montoRecaudado: decimal("monto_recaudado", { precision: 12, scale: 2 }).notNull().default("0"),

    // Dates and status
    fecha: date("fecha").notNull(),
    estado: distribucionStatusEnum("estado").notNull().default("activo"),

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_distribuciones_business_id").on(table.businessId),
    index("idx_distribuciones_vendedor_id").on(table.vendedorId),
    index("idx_distribuciones_fecha").on(table.fecha),
    index("idx_distribuciones_estado").on(table.estado),
    index("idx_distribuciones_sync_status").on(table.syncStatus),
    index("idx_distribuciones_vendedor_fecha").on(table.vendedorId, table.fecha),
  ]
);

// Type exports
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type Distribucion = typeof distribuciones.$inferSelect;
export type NewDistribucion = typeof distribuciones.$inferInsert;
