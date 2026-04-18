import { z } from "zod";

// ============================================================================
// Numeric String Transformation Helpers
// ============================================================================

/**
 * Transforms a number or numeric string to a string.
 * Preserves precision by avoiding Number() conversion for string inputs.
 * Throws if value is not a finite number.
 */
const numericStringTransform = z.union([z.string(), z.number()]).transform((val) => {
  if (typeof val === "number") {
    if (!Number.isFinite(val)) {
      throw new Error("Invalid number: must be finite");
    }
    return val.toString();
  }
  // Validate string format without Number() to preserve precision
  // Accepts: "100", "100.50", "0.5", etc.
  if (!/^\d+(\.\d+)?$/.test(val)) {
    throw new Error("Invalid numeric string format");
  }
  return val;
});

/**
 * Transforms an optional number, numeric string, or null to a string or undefined.
 * Accepts null to match frontend behavior where normalizeNullableCurrency/normalizeWeight return null.
 * Preserves precision by avoiding Number() conversion for string inputs.
 */
const optionalNumericStringTransform = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((val) => {
    if (val === null || val === undefined) {
      return undefined;
    }
    if (typeof val === "number") {
      if (!Number.isFinite(val)) {
        return undefined;
      }
      return val.toString();
    }
    // Validate string format without Number() to preserve precision
    if (!/^\d+(\.\d+)?$/.test(val)) {
      return undefined;
    }
    return val;
  });

export { numericStringTransform, optionalNumericStringTransform };

export const customerCreateSchema = z.object({
  name: z.string().min(1, "name es requerido"),
  dni: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const saleItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  quantity: optionalNumericStringTransform,
  orderedQuantity: optionalNumericStringTransform,
  unitPrice: optionalNumericStringTransform,
  unitPriceQuoted: optionalNumericStringTransform,
  subtotal: numericStringTransform,
});

export const saleCreateSchema = z.object({
  sellerId: z.string().optional(),
  customerId: z.string().optional(),
  distribucionId: z.string().optional(),
  visitaId: z.string().optional(),
  type: z.enum(["instant_sale", "pre_order"]),
  saleType: z.enum(["contado", "credito"]),
  paymentMode: z.enum(["pago_total", "a_cuenta", "debe_todo"]).optional(),
  totalAmount: numericStringTransform,
  amountPaid: optionalNumericStringTransform,
  balanceDue: optionalNumericStringTransform,
  tara: optionalNumericStringTransform,
  netWeight: optionalNumericStringTransform,
  deliveryDate: z.string().optional(),
  orderDate: z.string().optional(),
  items: z.array(saleItemSchema),
}).refine(
  (data) => {
    if (data.saleType === "credito" && !data.customerId) {
      return false;
    }
    return true;
  },
  { message: "La venta a crédito requiere cliente", path: ["customerId"] }
).refine(
  (data) => {
    if (data.saleType === "contado") {
      const total = Number(data.totalAmount);
      const paid = Number(data.amountPaid ?? data.totalAmount);
      return Math.abs(paid - total) <= 0.01;
    }
    return true;
  },
  { message: "En venta al contado, el monto pagado debe ser igual al total", path: ["amountPaid"] }
).refine(
  (data) => {
    if (data.saleType === "credito") {
      const total = Number(data.totalAmount);
      const paid = Number(data.amountPaid ?? 0);
      return paid <= total;
    }
    return true;
  },
  { message: "El monto pagado no puede ser mayor al total", path: ["amountPaid"] }
);

const saleBaseSchema = z.object({
  sellerId: z.string().optional(),
  customerId: z.string().optional(),
  distribucionId: z.string().optional(),
  visitaId: z.string().optional(),
  type: z.enum(["instant_sale", "pre_order"]).optional(),
  saleType: z.enum(["contado", "credito"]).optional(),
  paymentMode: z.enum(["pago_total", "a_cuenta", "debe_todo"]).optional(),
  totalAmount: optionalNumericStringTransform,
  amountPaid: optionalNumericStringTransform,
  balanceDue: optionalNumericStringTransform,
  tara: optionalNumericStringTransform,
  netWeight: optionalNumericStringTransform,
  deliveryDate: z.string().optional(),
  orderDate: z.string().optional(),
  items: z.array(saleItemSchema).optional(),
});

export const saleUpdateSchema = saleBaseSchema.extend({
  status: z.enum(["draft", "active", "confirmed", "delivered", "cancelled"]).optional(),
  version: z.number().optional(),
  refundAmount: optionalNumericStringTransform,
  cancelReason: z.string().optional(),
  refundMethod: z.string().optional(),
});

export type SaleCreateInput = z.infer<typeof saleCreateSchema>;
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;

export const abonoCreateSchema = z.object({
  customerId: z.string().min(1, "customerId es requerido"),
  sellerId: z.string().optional(),
  amount: numericStringTransform.refine(
    (val) => Number(val) > 0,
    { message: "amount es requerido y debe ser mayor a 0" }
  ),
  paymentMethod: z.enum(["efectivo", "yape", "plin", "transferencia", "tarjeta"]),
  notes: z.string().optional(),
});

export type AbonoCreateInput = z.infer<typeof abonoCreateSchema>;

export const abonoUpdateSchema = z.object({
  proofImageId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  version: z.number().optional(),
});

export type AbonoUpdateInput = z.infer<typeof abonoUpdateSchema>;

export const distribucionItemSchema = z.object({
  variantId: z.string(),
  cantidadAsignada: numericStringTransform,
  unidad: z.string(),
});

// Sync schemas for distribucion_items entity (child of distribuciones)
export const distribucionItemSyncCreateSchema = z.object({
  distribucionId: z.string().min(1, "distribucionId es requerido"),
  variantId: z.string().min(1, "variantId es requerido"),
  cantidadAsignada: numericStringTransform,
  cantidadVendida: optionalNumericStringTransform,
  unidad: z.string().optional(),
});

export const distribucionItemSyncUpdateSchema = z.object({
  distribucionId: z.string().min(1, "distribucionId es requerido"),
  cantidadAsignada: optionalNumericStringTransform,
  cantidadVendida: optionalNumericStringTransform,
  unidad: z.string().optional(),
});

export const distribucionCreateSchema = z.object({
  vendedorId: z.string().min(1, "vendedorId es requerido"),
  puntoVenta: z.string().min(1, "puntoVenta es requerido"),
  puntoVentaId: z.string().optional(),
  notaCreacion: z.string().optional(),
  fecha: z.string().optional(),
  groupId: z.string().optional(),
  // Items are now optional at creation - products registered at close time
  items: z.array(distribucionItemSchema).optional(),
});

const distribucionBaseSchema = z.object({
  vendedorId: z.string().optional(),
  puntoVenta: z.string().optional(),
  puntoVentaId: z.string().optional(),
  notaCreacion: z.string().optional(),
  notaCierre: z.string().optional(),
  fecha: z.string().optional(),
  // Items are now optional - products registered at close time
  items: z.array(distribucionItemSchema).optional(),
});

export const distribucionUpdateSchema = distribucionBaseSchema.extend({
  montoRecaudado: optionalNumericStringTransform,
  estado: z.enum(["activo", "cerrado", "en_ruta"]).optional(),
});

export type DistribucionCreateInput = z.infer<typeof distribucionCreateSchema>;
export type DistribucionUpdateInput = z.infer<typeof distribucionUpdateSchema>;

export const saleItemOperationSchema = z.object({
  saleId: z.string().min(1, "saleId es requerido"),
  productId: z.string().min(1, "productId es requerido"),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  quantity: optionalNumericStringTransform,
  orderedQuantity: optionalNumericStringTransform,
  unitPrice: optionalNumericStringTransform,
  unitPriceQuoted: optionalNumericStringTransform,
  subtotal: numericStringTransform,
});

export type SaleItemOperationInput = z.infer<typeof saleItemOperationSchema>;

export const productCreateSchema = z.object({
  name: z.string().min(1, "name es requerido"),
  unit: z.string().optional(),
  basePrice: z.union([z.string(), z.number()]).optional().default("0").transform((val) => {
    if (val === undefined) return "0";
    if (typeof val === "number") {
      return Number.isFinite(val) ? val.toString() : "0";
    }
    return /^\d+(\.\d+)?$/.test(val) ? val : "0";
  }),
  costPrice: z.union([z.string(), z.number()]).optional().default("0").transform((val) => {
    if (val === undefined) return "0";
    if (typeof val === "number") {
      return Number.isFinite(val) ? val.toString() : "0";
    }
    return /^\d+(\.\d+)?$/.test(val) ? val : "0";
  }),
  isActive: z.boolean().optional(),
  imageId: z.string().optional(),
  hasVariants: z.boolean().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productVariantCreateSchema = z.object({
  productId: z.string().min(1, "productId es requerido"),
  name: z.string().min(1, "name es requerido"),
  sku: z.string().optional().nullable(),
  unitQuantity: numericStringTransform,
  price: numericStringTransform,
  costPrice: optionalNumericStringTransform,
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const productVariantUpdateSchema = productVariantCreateSchema.partial();

export type ProductVariantCreateInput = z.infer<typeof productVariantCreateSchema>;
export type ProductVariantUpdateInput = z.infer<typeof productVariantUpdateSchema>;

export const tagCreateSchema = z.object({
  name: z.string().min(1, "name es requerido"),
  color: z.string().optional(),
});

export const tagUpdateSchema = tagCreateSchema.partial();

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;

export const customerTagCreateSchema = z.object({
  customerId: z.string().min(1, "customerId es requerido"),
  tagId: z.string().min(1, "tagId es requerido"),
  assignedBy: z.string().optional(),
});

export type CustomerTagCreateInput = z.infer<typeof customerTagCreateSchema>;

export const purchaseItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  variantId: z.string().optional(),
  unitId: z.string().optional(),
  packs: optionalNumericStringTransform,
  quantity: numericStringTransform,
  unitCost: numericStringTransform,
});

/**
 * Transforms empty strings to null for optional UUID/string fields
 * that shouldn't accept "" as a valid value (especially UUID FKs).
 * Using null instead of undefined so the handler's ?? null fallback works correctly.
 */
const emptyStringToNull = z.string().transform((val) => (val === "" ? null : val));

export const purchaseCreateSchema = z.object({
  supplierId: emptyStringToNull.optional(),
  purchaseDate: z.string().optional(),
  invoiceNumber: emptyStringToNull.optional(),
  status: z.enum(["draft", "pending", "received", "cancelled"]).optional(),
  totalAmount: optionalNumericStringTransform,
  notes: emptyStringToNull.optional(),
  receiptImageId: emptyStringToNull.optional(),
  syncGroupId: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).optional(),
});

export const purchaseUpdateSchema = purchaseCreateSchema.extend({
  status: z.enum(["draft", "pending", "received", "cancelled"]).optional(),
});

export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;
export type PurchaseUpdateInput = z.infer<typeof purchaseUpdateSchema>;

// Purchase Item schemas for sync handlers (use transforms for numeric fields)
export const purchaseItemCreateSchema = z.object({
  id: z.string().optional(),
  purchaseId: z.string(),
  productId: z.string(),
  variantId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  quantity: numericStringTransform,
  unitCost: numericStringTransform,
  totalCost: optionalNumericStringTransform,
});

export const purchaseItemUpdateSchema = z.object({
  purchaseId: z.string(),
  quantity: optionalNumericStringTransform,
  unitCost: optionalNumericStringTransform,
  totalCost: optionalNumericStringTransform,
});

export const syncOperationSchema = z.object({
  idempotencyKey: z.string(),
  entityType: z.enum(["customers", "sales", "sale_items", "abonos", "distribuciones", "distribucion_items", "products", "product_variants", "tags", "customer_tags", "purchases", "purchase_items", "customer_groups", "customer_group_members", "visitas", "suppliers"]),
  entityId: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.string(), z.unknown()),
  localVersion: z.number(),
  localTimestamp: z.string(),
  syncGroupId: z.string().optional(),
  correlationId: z.string().optional(),
});

export type SyncOperationParsed = z.infer<typeof syncOperationSchema>;

// Customer Group schemas
export const customerGroupCreateSchema = z.object({
  name: z.string().min(1, "name es requerido"),
  color: z.string().optional(),
});

export const customerGroupUpdateSchema = customerGroupCreateSchema.partial();

export type CustomerGroupCreateInput = z.infer<typeof customerGroupCreateSchema>;
export type CustomerGroupUpdateInput = z.infer<typeof customerGroupUpdateSchema>;

// Customer Group Member schemas
export const customerGroupMemberCreateSchema = z.object({
  groupId: z.string(),
  customerId: z.string(),
  addedBy: z.string().optional(),
});

export const customerGroupMemberUpdateSchema = customerGroupMemberCreateSchema.partial();

export type CustomerGroupMemberCreateInput = z.infer<typeof customerGroupMemberCreateSchema>;
export type CustomerGroupMemberUpdateInput = z.infer<typeof customerGroupMemberUpdateSchema>;

// Visita schemas
export const visitaCreateSchema = z.object({
  distribucionId: z.string(),
  customerId: z.string(),
  status: z.enum(["pendiente", "compro", "no_compra"]).default("pendiente"),
  motivoNoCompra: z.string().optional(),
  saleId: z.string().optional(),
});

export const visitaUpdateSchema = z.object({
  status: z.enum(["pendiente", "compro", "no_compra"]).optional(),
  motivoNoCompra: z.string().optional(),
  saleId: z.string().optional(),
});

export type VisitaCreateInput = z.infer<typeof visitaCreateSchema>;
export type VisitaUpdateInput = z.infer<typeof visitaUpdateSchema>;

// Supplier schemas
export const supplierCreateSchema = z.object({
  name: z.string().min(1, "name es requerido"),
  type: z.enum(["generic", "regular", "internal"]).optional(),
  ruc: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});

export const supplierUpdateSchema = supplierCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
