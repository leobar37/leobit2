/**
 * Shared Drizzle Schema
 * Schema compartido entre frontend (PGlite) y backend (PostgreSQL)
 * Usa text en lugar de enum para compatibilidad con PGlite
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  date,
  jsonb,
  index,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// Enums como const para type safety
// ============================================================================

export const SyncStatus = {
  PENDING: "pending",
  SYNCED: "synced",
  ERROR: "error",
} as const;

export const SaleType = {
  CONTADO: "contado",
  CREDITO: "credito",
} as const;

export const TransactionType = {
  INSTANT_SALE: "instant_sale",
  PRE_ORDER: "pre_order",
} as const;

export const SaleStatus = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  ACTIVE: "active",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const PaymentMode = {
  PAGO_TOTAL: "pago_total",
  A_CUENTA: "a_cuenta",
  DEBE_TODO: "debe_todo",
} as const;

export const PaymentMethod = {
  EFECTIVO: "efectivo",
  YAPE: "yape",
  PLIN: "plin",
  TRANSFERENCIA: "transferencia",
  SALDO: "saldo",
} as const;

export const RefundMethod = {
  EFECTIVO: "efectivo",
  YAPE: "yape",
  PLIN: "plin",
  TRANSFERENCIA: "transferencia",
  SALDO: "saldo",
} as const;

export const ProductType = {
  POLLO: "pollo",
  HUEVO: "huevo",
  OTRO: "otro",
} as const;

export const ProductUnit = {
  KG: "kg",
  UNIDAD: "unidad",
} as const;

export const DistribucionStatus = {
  ACTIVO: "activo",
  CERRADO: "cerrado",
  EN_RUTA: "en_ruta",
} as const;

export const SupplierType = {
  GENERIC: "generic",
  REGULAR: "regular",
  INTERNAL: "internal",
} as const;

export const PurchaseStatus = {
  DRAFT: "draft",
  PENDING: "pending",
  RECEIVED: "received",
  CANCELLED: "cancelled",
} as const;

export const OrderPaymentStatus = {
  SIN_PAGO: "sin_pago",
  ADELANTO_PARCIAL: "adelanto_parcial",
  PAGADO_TOTAL: "pagado_total",
  SALDO_PENDIENTE: "saldo_pendiente",
} as const;

// ============================================================================
// Visita Status
// ============================================================================

export const VisitaStatus = {
  PENDIENTE: "pendiente",
  COMPRO: "compro",
  NO_COMPRA: "no_compra",
} as const;

export type VisitaStatus = (typeof VisitaStatus)[keyof typeof VisitaStatus];

// ============================================================================
// Customers
// ============================================================================

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    dni: varchar("dni", { length: 20 }),
    phone: varchar("phone", { length: 50 }),
    address: text("address"),
    notes: text("notes"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    businessId: uuid("business_id").notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_customers_name").on(table.name),
    index("idx_customers_dni").on(table.dni),
    index("idx_customers_business_id").on(table.businessId),
    index("idx_customers_sync_status").on(table.syncStatus),
  ]
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

// ============================================================================
// Sales
// ============================================================================

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    customerId: uuid("customer_id"),
    sellerId: uuid("seller_id").notNull(),
    distribucionId: uuid("distribucion_id"),
    type: text("type").notNull().default(TransactionType.INSTANT_SALE),
    saleType: text("sale_type").notNull().default(SaleType.CONTADO),
    paymentMode: text("payment_mode"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    balanceDue: decimal("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),
    tara: decimal("tara", { precision: 10, scale: 3 }).default("0"),
    netWeight: decimal("net_weight", { precision: 10, scale: 3 }),
    saleDate: timestamp("sale_date").notNull().defaultNow(),
    deliveryDate: date("delivery_date"),
    orderDate: date("order_date"),
    status: text("status").notNull().default(SaleStatus.DRAFT),
    version: integer("version").notNull().default(1),
    confirmedSnapshot: jsonb("confirmed_snapshot").$type<Record<string, unknown>>(),
    deliveredSnapshot: jsonb("delivered_snapshot").$type<Record<string, unknown>>(),
    allowCustomerEdit: boolean("allow_customer_edit").notNull().default(true),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    syncGroupId: varchar("sync_group_id", { length: 100 }),
    cancelledAt: timestamp("cancelled_at"),
    cancelledBy: uuid("cancelled_by"),
    cancelReason: text("cancel_reason"),
    refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }),
    refundDate: timestamp("refund_date"),
    refundMethod: text("refund_method"),
    refundReference: varchar("refund_reference", { length: 100 }),
    refundNotes: text("refund_notes"),
    advancePaymentMethod: varchar("advance_payment_method", { length: 20 }),
    advanceReferenceNumber: varchar("advance_reference_number", { length: 50 }),
    advanceProofImageId: uuid("advance_proof_image_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sales_business_id").on(table.businessId),
    index("idx_sales_customer_id").on(table.customerId),
    index("idx_sales_seller_id").on(table.sellerId),
    index("idx_sales_sync_status").on(table.syncStatus),
    index("idx_sales_status").on(table.status),
    index("idx_sales_sale_date").on(table.saleDate),
  ]
);

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;

// ============================================================================
// Sale Items
// ============================================================================

export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id"),
    saleId: uuid("sale_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    productName: varchar("product_name", { length: 255 }).notNull(),
    variantName: varchar("variant_name", { length: 50 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 3 }),
    orderedQuantity: decimal("ordered_quantity", { precision: 10, scale: 3 }),
    deliveredQuantity: decimal("delivered_quantity", { precision: 10, scale: 3 }),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
    unitPriceQuoted: decimal("unit_price_quoted", { precision: 10, scale: 2 }),
    unitPriceFinal: decimal("unit_price_final", { precision: 10, scale: 2 }),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    isModified: boolean("is_modified").notNull().default(false),
    originalQuantity: decimal("original_quantity", { precision: 10, scale: 3 }),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    syncGroupId: varchar("sync_group_id", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sale_items_business_id").on(table.businessId),
    index("idx_sale_items_sale_id").on(table.saleId),
    index("idx_sale_items_product_id").on(table.productId),
    index("idx_sale_items_sync_status").on(table.syncStatus),
    index("idx_sale_items_sync_group_id").on(table.syncGroupId),
  ]
);

export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;

// ============================================================================
// Payments (Abonos)
// ============================================================================

export const abonos = pgTable(
  "abonos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull(),
    sellerId: uuid("seller_id").notNull(),
    businessId: uuid("business_id").notNull(),
    relatedSaleId: uuid("related_sale_id"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").notNull().default(PaymentMethod.EFECTIVO),
    referenceNumber: varchar("reference_number", { length: 50 }),
    proofImageId: uuid("proof_image_id"),
    notes: text("notes"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_abonos_customer_id").on(table.customerId),
    index("idx_abonos_business_id").on(table.businessId),
    index("idx_abonos_sync_status").on(table.syncStatus),
  ]
);

export type Abono = typeof abonos.$inferSelect;
export type NewAbono = typeof abonos.$inferInsert;

// ============================================================================
// Products
// ============================================================================

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: text("type").notNull().default(ProductType.POLLO),
    unit: text("unit").notNull().default(ProductUnit.KG),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    hasVariants: boolean("has_variants").notNull().default(false),
    imageId: uuid("image_id"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_business_id").on(table.businessId),
    index("idx_products_type").on(table.type),
    index("idx_products_sync_status").on(table.syncStatus),
  ]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// ============================================================================
// Product Variants
// ============================================================================

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull(),
    businessId: uuid("business_id").notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    sku: varchar("sku", { length: 50 }),
    unitQuantity: decimal("unit_quantity", { precision: 10, scale: 3 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_product_variants_business_id").on(table.businessId),
    index("idx_product_variants_product_id").on(table.productId),
  ]
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

// ============================================================================
// Variant Inventory (for products with variants)
// ============================================================================

export const variantInventory = pgTable(
  "variant_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("0"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_variant_inventory_business_id").on(table.businessId),
    index("idx_variant_inventory_variant_id").on(table.variantId),
  ]
);

export type VariantInventory = typeof variantInventory.$inferSelect;
export type NewVariantInventory = typeof variantInventory.$inferInsert;

// ============================================================================
// Suppliers
// ============================================================================

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: text("type").notNull().default(SupplierType.GENERIC),
    ruc: varchar("ruc", { length: 20 }),
    address: text("address"),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_suppliers_business_id").on(table.businessId),
    index("idx_suppliers_sync_status").on(table.syncStatus),
  ]
);

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

// ============================================================================
// Purchases
// ============================================================================

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    supplierId: uuid("supplier_id"),
    purchaseDate: date("purchase_date"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default(PurchaseStatus.DRAFT),
    invoiceNumber: varchar("invoice_number", { length: 50 }),
    receiptImageId: uuid("receipt_image_id"),
    notes: text("notes"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    syncGroupId: varchar("sync_group_id", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_purchases_business_id").on(table.businessId),
    index("idx_purchases_supplier_id").on(table.supplierId),
    index("idx_purchases_sync_status").on(table.syncStatus),
  ]
);

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;

// ============================================================================
// Purchase Items
// ============================================================================

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    purchaseId: uuid("purchase_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id"),
    unitId: uuid("unit_id"),
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
    totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    syncGroupId: varchar("sync_group_id", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_purchase_items_business_id").on(table.businessId),
    index("idx_purchase_items_purchase_id").on(table.purchaseId),
    index("idx_purchase_items_sync_group_id").on(table.syncGroupId),
  ]
);

export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type NewPurchaseItem = typeof purchaseItems.$inferInsert;

// ============================================================================
// Distribuciones
// ============================================================================

export const distribuciones = pgTable(
  "distribuciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    vendedorId: uuid("vendedor_id").notNull(),
    puntoVenta: varchar("punto_venta", { length: 100 }).notNull(),
    puntoVentaId: uuid("punto_venta_id"),
    montoRecaudado: decimal("monto_recaudado", { precision: 12, scale: 2 }).notNull().default("0"),
    fecha: date("fecha").notNull(),
    estado: text("estado").notNull().default(DistribucionStatus.ACTIVO),
    modo: text("modo").notNull().default("estricto"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_distribuciones_business_id").on(table.businessId),
    index("idx_distribuciones_vendedor_id").on(table.vendedorId),
    index("idx_distribuciones_sync_status").on(table.syncStatus),
    index("idx_distribuciones_punto_venta_id").on(table.puntoVentaId),
  ]
);

export type Distribucion = typeof distribuciones.$inferSelect;
export type NewDistribucion = typeof distribuciones.$inferInsert;

// ============================================================================
// Distribucion Items
// ============================================================================

export const distribucionItems = pgTable(
  "distribucion_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    distribucionId: uuid("distribucion_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    cantidadAsignada: decimal("cantidad_asignada", { precision: 10, scale: 3 }).notNull(),
    cantidadVendida: decimal("cantidad_vendida", { precision: 10, scale: 3 }).notNull().default("0"),
    unidad: text("unidad").notNull().default(ProductUnit.KG),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_distribucion_items_business_id").on(table.businessId),
    index("idx_distribucion_items_distribucion_id").on(table.distribucionId),
  ]
);

export type DistribucionItem = typeof distribucionItems.$inferSelect;
export type NewDistribucionItem = typeof distribucionItems.$inferInsert;

// ============================================================================
// Closings
// ============================================================================

export const closings = pgTable(
  "closings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    sellerId: uuid("seller_id").notNull(),
    closingDate: date("closing_date").notNull(),
    totalSales: integer("total_sales").notNull().default(0),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    cashAmount: decimal("cash_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    totalKilos: decimal("total_kilos", { precision: 10, scale: 3 }),
    backdateReason: text("backdate_reason"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_closings_business_id").on(table.businessId),
    index("idx_closings_seller_id").on(table.sellerId),
    index("idx_closings_date").on(table.closingDate),
    index("idx_closings_sync_status").on(table.syncStatus),
  ]
);

export type Closing = typeof closings.$inferSelect;
export type NewClosing = typeof closings.$inferInsert;

// ============================================================================
// Relations
// ============================================================================

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  abonos: many(abonos),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  items: many(saleItems),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  abonos: many(abonos),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
}));

export const abonosRelations = relations(abonos, ({ one }) => ({
  customer: one(customers, {
    fields: [abonos.customerId],
    references: [customers.id],
  }),
  sale: one(sales, {
    fields: [abonos.relatedSaleId],
    references: [sales.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  inventory: one(variantInventory, {
    fields: [productVariants.id],
    references: [variantInventory.variantId],
  }),
}));

export const variantInventoryRelations = relations(variantInventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantInventory.variantId],
    references: [productVariants.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
}));

export const distribucionesRelations = relations(distribuciones, ({ many }) => ({
  items: many(distribucionItems),
  sales: many(sales),
}));

export const distribucionItemsRelations = relations(distribucionItems, ({ one }) => ({
  distribucion: one(distribuciones, {
    fields: [distribucionItems.distribucionId],
    references: [distribuciones.id],
  }),
}));

// ============================================================================
// Tags
// ============================================================================

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("#f97316"),
    businessId: uuid("business_id").notNull(),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_tags_business_id").on(table.businessId),
    index("idx_tags_name").on(table.name),
  ]
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

// ============================================================================
// Customer Tags (Junction Table)
// ============================================================================

export const customerTags = pgTable(
  "customer_tags",
  {
    customerId: uuid("customer_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    assignedBy: uuid("assigned_by"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
  },
  (table) => [
    index("idx_customer_tags_customer_id").on(table.customerId),
    index("idx_customer_tags_tag_id").on(table.tagId),
  ]
);

export type CustomerTag = typeof customerTags.$inferSelect;
export type NewCustomerTag = typeof customerTags.$inferInsert;

// ============================================================================
// Tag Relations
// ============================================================================

export const tagsRelations = relations(tags, ({ many }) => ({
  customerTags: many(customerTags),
}));

export const customerTagsRelations = relations(customerTags, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTags.customerId],
    references: [customers.id],
  }),
  tag: one(tags, {
    fields: [customerTags.tagId],
    references: [tags.id],
  }),
}));

// ============================================================================
// Customer Groups
// ============================================================================

export const customerGroups = pgTable(
  "customer_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_groups_business_id").on(table.businessId),
    index("idx_customer_groups_name").on(table.name),
  ]
);

export type CustomerGroup = typeof customerGroups.$inferSelect;
export type NewCustomerGroup = typeof customerGroups.$inferInsert;

// ============================================================================
// Customer Group Members
// ============================================================================

export const customerGroupMembers = pgTable(
  "customer_group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    groupId: uuid("group_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    addedBy: uuid("added_by"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
  },
  (table) => [
    index("idx_customer_group_members_business_id").on(table.businessId),
    index("idx_customer_group_members_group_id").on(table.groupId),
    index("idx_customer_group_members_customer_id").on(table.customerId),
  ]
);

export type CustomerGroupMember = typeof customerGroupMembers.$inferSelect;
export type NewCustomerGroupMember = typeof customerGroupMembers.$inferInsert;

// ============================================================================
// Visitas
// ============================================================================

export const visitas = pgTable(
  "visitas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    distribucionId: uuid("distribucion_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    vendedorId: uuid("vendedor_id").notNull(),
    status: text("status").notNull().default(VisitaStatus.PENDIENTE),
    motivoNoCompra: varchar("motivo_no_compra", { length: 255 }),
    saleId: uuid("sale_id"),
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),
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

export type Visita = typeof visitas.$inferSelect;
export type NewVisita = typeof visitas.$inferInsert;

// ============================================================================
// Relations for Customer Groups and Visitas
// ============================================================================

export const customerGroupsRelations = relations(customerGroups, ({ many }) => ({
  members: many(customerGroupMembers),
}));

export const customerGroupMembersRelations = relations(customerGroupMembers, ({ one }) => ({
  group: one(customerGroups, {
    fields: [customerGroupMembers.groupId],
    references: [customerGroups.id],
  }),
  customer: one(customers, {
    fields: [customerGroupMembers.customerId],
    references: [customers.id],
  }),
}));

export const visitasRelations = relations(visitas, ({ one }) => ({
  customer: one(customers, {
    fields: [visitas.customerId],
    references: [customers.id],
  }),
}));
