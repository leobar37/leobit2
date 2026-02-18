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
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  productTypeEnum,
  productUnitEnum,
  distribucionStatusEnum,
  syncStatusEnum,
} from "./enums";
import { businesses, businessUsers } from "./businesses";
import { sales, saleItems } from "./sales";
import { assets } from "./assets";

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

    // Asset reference (shared gallery image)
    imageId: uuid("image_id").references(() => assets.id),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_type").on(table.type),
    index("idx_products_is_active").on(table.isActive),
    index("idx_products_image_id").on(table.imageId),
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

    modo: varchar("modo", { length: 20 }).notNull().default("estricto"),
    confiarEnVendedor: boolean("confiar_en_vendedor").notNull().default(false),
    pesoConfirmado: boolean("peso_confirmado").notNull().default(true),

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
    index("idx_distribuciones_modo").on(table.modo),
    index("idx_distribuciones_sync_status").on(table.syncStatus),
    index("idx_distribuciones_vendedor_fecha").on(table.vendedorId, table.fecha),
  ]
);

export const distribucionItems = pgTable(
  "distribucion_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    distribucionId: uuid("distribucion_id")
      .notNull()
      .references(() => distribuciones.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),

    cantidadAsignada: decimal("cantidad_asignada", { precision: 10, scale: 3 }).notNull(),
    cantidadVendida: decimal("cantidad_vendida", { precision: 10, scale: 3 }).notNull().default("0"),

    unidad: varchar("unidad", { length: 20 }).notNull().default("kg"),

    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_distribucion_items_distribucion_id").on(table.distribucionId),
    index("idx_distribucion_items_variant_id").on(table.variantId),
    index("idx_distribucion_items_sync_status").on(table.syncStatus),
    uniqueIndex("idx_distribucion_items_unique").on(table.distribucionId, table.variantId),
  ]
);

// Product Variants table
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Variant info
    name: varchar("name", { length: 50 }).notNull(),
    sku: varchar("sku", { length: 50 }),
    unitQuantity: decimal("unit_quantity", { precision: 10, scale: 3 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),

    // Display & status
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    // Sync
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_variants_product_id").on(table.productId),
    index("idx_variants_is_active").on(table.isActive),
    index("idx_variants_sync_status").on(table.syncStatus),
    uniqueIndex("idx_variants_product_name").on(table.productId, table.name),
  ]
);

// Variant Inventory table
export const variantInventory = pgTable(
  "variant_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("0"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_variant_inventory_variant_id").on(table.variantId),
    uniqueIndex("idx_variant_inventory_unique").on(table.variantId),
  ]
);

// Type exports
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type Distribucion = typeof distribuciones.$inferSelect;
export type NewDistribucion = typeof distribuciones.$inferInsert;
export type DistribucionItem = typeof distribucionItems.$inferSelect;
export type NewDistribucionItem = typeof distribucionItems.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type VariantInventory = typeof variantInventory.$inferSelect;
export type NewVariantInventory = typeof variantInventory.$inferInsert;

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  inventory: many(inventory),
  saleItems: many(saleItems),
  image: one(assets, {
    fields: [products.imageId],
    references: [assets.id],
  }),
  variants: many(productVariants),
}));

export const distribucionesRelations = relations(distribuciones, ({ one, many }) => ({
  business: one(businesses, {
    fields: [distribuciones.businessId],
    references: [businesses.id],
  }),
  vendedor: one(businessUsers, {
    fields: [distribuciones.vendedorId],
    references: [businessUsers.id],
  }),
  items: many(distribucionItems),
  sales: many(sales),
}));

export const distribucionItemsRelations = relations(distribucionItems, ({ one }) => ({
  distribucion: one(distribuciones, {
    fields: [distribucionItems.distribucionId],
    references: [distribuciones.id],
  }),
  variant: one(productVariants, {
    fields: [distribucionItems.variantId],
    references: [productVariants.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  inventory: one(variantInventory, {
    fields: [productVariants.id],
    references: [variantInventory.variantId],
  }),
  saleItems: many(saleItems),
}));

export const variantInventoryRelations = relations(variantInventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantInventory.variantId],
    references: [productVariants.id],
  }),
}));
