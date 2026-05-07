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
  text,
  timestamp,
  date,
  index,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  productTypeEnum,
  productUnitEnum,
  distribucionStatusEnum,
} from "./enums";
import { businesses, businessUsers } from "./businesses";
import { sales, saleItems } from "./sales";
import { assets } from "./assets";
import { puntosVenta } from "./puntos-venta";
import { distribucionGroups } from "./distribucion-groups";

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("#f97316"),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_product_categories_business_id").on(table.businessId),
    index("idx_product_categories_name").on(table.name),
    uniqueIndex("ux_product_categories_business_name_ci").on(
      table.businessId,
      sql`lower(${table.name})`
    ),
  ]
);

// Products table
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    // Product info
    name: varchar("name", { length: 255 }).notNull(),
    type: productTypeEnum("type").notNull().default("pollo"),
    categoryId: uuid("category_id").references(() => productCategories.id, {
      onDelete: "restrict",
    }),
    unit: productUnitEnum("unit").notNull().default("kg"),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),

    // Asset reference (shared gallery image)
    imageId: uuid("image_id").references(() => assets.id),

    // Variants support
    hasVariants: boolean("has_variants").notNull().default(false),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_business_id").on(table.businessId),
    index("idx_products_type").on(table.type),
    index("idx_products_category_id").on(table.categoryId),
    index("idx_products_is_active").on(table.isActive),
    index("idx_products_image_id").on(table.imageId),
    index("idx_products_updated_at").on(table.updatedAt),
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

    // Punto de venta (snapshot + reference)
    puntoVenta: varchar("punto_venta", { length: 100 }).notNull(), // Snapshot del nombre al crear
    puntoVentaId: uuid("punto_venta_id").references(() => puntosVenta.id, { onDelete: "set null" }),

    montoRecaudado: decimal("monto_recaudado", { precision: 12, scale: 2 }).notNull().default("0"),
    notaCreacion: text("nota_creacion"),
    notaCierre: text("nota_cierre"),

    // Dates and status
    fecha: date("fecha").notNull(),
    estado: distribucionStatusEnum("estado").notNull().default("activo"),

    // Cierre tracking (metrics calculated from items, not stored)
    closedAt: timestamp("closed_at"),
    closedBy: uuid("closed_by").references(() => businessUsers.id),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_distribuciones_business_id").on(table.businessId),
    index("idx_distribuciones_vendedor_id").on(table.vendedorId),
    index("idx_distribuciones_fecha").on(table.fecha),
    index("idx_distribuciones_estado").on(table.estado),
    index("idx_distribuciones_punto_venta_id").on(table.puntoVentaId),
    index("idx_distribuciones_vendedor_fecha").on(table.vendedorId, table.fecha),
    index("idx_distribuciones_closed_at").on(table.closedAt),
  ]
);

export const distribucionItems = pgTable(
  "distribucion_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy - required for data isolation
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    distribucionId: uuid("distribucion_id")
      .notNull()
      .references(() => distribuciones.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),

    cantidadAsignada: decimal("cantidad_asignada", { precision: 10, scale: 3 }).notNull(),
    cantidadVendida: decimal("cantidad_vendida", { precision: 10, scale: 3 }).notNull().default("0"),

    unidad: varchar("unidad", { length: 20 }).notNull().default("kg"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_distribucion_items_business_id").on(table.businessId),
    index("idx_distribucion_items_distribucion_id").on(table.distribucionId),
    index("idx_distribucion_items_variant_id").on(table.variantId),
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

    // Multi-tenancy - required for data isolation
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    // Variant info
    name: varchar("name", { length: 50 }).notNull(),
    sku: varchar("sku", { length: 50 }),
    unitQuantity: decimal("unit_quantity", { precision: 10, scale: 3 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),

    // Display & status
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    // Stock thresholds
    lowStockThreshold: decimal("low_stock_threshold", { precision: 10, scale: 3 }).notNull().default("10"),
    criticalStockThreshold: decimal("critical_stock_threshold", { precision: 10, scale: 3 }).notNull().default("5"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_variants_business_id").on(table.businessId),
    index("idx_variants_product_id").on(table.productId),
    index("idx_variants_is_active").on(table.isActive),
    uniqueIndex("idx_variants_product_name").on(table.productId, table.name),
  ]
);

// Variant Inventory table
export const variantInventory = pgTable(
  "variant_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Multi-tenancy - required for data isolation
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("0"),

    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_variant_inventory_business_id").on(table.businessId),
    index("idx_variant_inventory_variant_id").on(table.variantId),
    uniqueIndex("idx_variant_inventory_unique").on(table.variantId),
  ]
);

// Type exports
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Distribucion = typeof distribuciones.$inferSelect;
export type NewDistribucion = typeof distribuciones.$inferInsert;
export type DistribucionItem = typeof distribucionItems.$inferSelect;
export type NewDistribucionItem = typeof distribucionItems.$inferInsert;
export type DistribucionCierreItem = typeof distribucionCierreItems.$inferSelect;
export type NewDistribucionCierreItem = typeof distribucionCierreItems.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type VariantInventory = typeof variantInventory.$inferSelect;
export type NewVariantInventory = typeof variantInventory.$inferInsert;

export const productCategoriesRelations = relations(productCategories, ({ many, one }) => ({
  business: one(businesses, {
    fields: [productCategories.businessId],
    references: [businesses.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  saleItems: many(saleItems),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
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
  puntoVentaRef: one(puntosVenta, {
    fields: [distribuciones.puntoVentaId],
    references: [puntosVenta.id],
  }),
  items: many(distribucionItems),
  cierreItems: many(distribucionCierreItems),
  sales: many(sales),
  groups: many(distribucionGroups),
}));

export const distribucionItemsRelations = relations(distribucionItems, ({ one }) => ({
  business: one(businesses, {
    fields: [distribucionItems.businessId],
    references: [businesses.id],
  }),
  distribucion: one(distribuciones, {
    fields: [distribucionItems.distribucionId],
    references: [distribuciones.id],
  }),
  variant: one(productVariants, {
    fields: [distribucionItems.variantId],
    references: [productVariants.id],
  }),
}));

// Distribution close items - registered by vendor when closing
export const distribucionCierreItems = pgTable(
  "distribucion_cierre_items",
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
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),

    // Vendor-reported quantities at close time
    cantidadLlevada: decimal("cantidad_llevada", { precision: 10, scale: 3 }).notNull(),
    cantidadVendida: decimal("cantidad_vendida", { precision: 10, scale: 3 }).notNull(),
    cantidadDevuelta: decimal("cantidad_devuelta", { precision: 10, scale: 3 }).notNull().default("0"),

    // Calculated field
    montoVentas: decimal("monto_ventas", { precision: 12, scale: 2 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cierre_items_business_id").on(table.businessId),
    index("idx_cierre_items_distribucion_id").on(table.distribucionId),
    index("idx_cierre_items_variant_id").on(table.variantId),
    uniqueIndex("idx_cierre_items_unique").on(table.distribucionId, table.variantId),
  ]
);

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  business: one(businesses, {
    fields: [productVariants.businessId],
    references: [businesses.id],
  }),
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
  business: one(businesses, {
    fields: [variantInventory.businessId],
    references: [businesses.id],
  }),
  variant: one(productVariants, {
    fields: [variantInventory.variantId],
    references: [productVariants.id],
  }),
}));

export const distribucionCierreItemsRelations = relations(distribucionCierreItems, ({ one }) => ({
  business: one(businesses, {
    fields: [distribucionCierreItems.businessId],
    references: [businesses.id],
  }),
  distribucion: one(distribuciones, {
    fields: [distribucionCierreItems.distribucionId],
    references: [distribuciones.id],
  }),
  variant: one(productVariants, {
    fields: [distribucionCierreItems.variantId],
    references: [productVariants.id],
  }),
}));
