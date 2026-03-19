import { z } from "zod";

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
  quantity: z.union([z.string(), z.number()]).optional(),
  orderedQuantity: z.union([z.string(), z.number()]).optional(),
  unitPrice: z.union([z.string(), z.number()]).optional(),
  unitPriceQuoted: z.union([z.string(), z.number()]).optional(),
  subtotal: z.union([z.string(), z.number()]),
});

export const saleCreateSchema = z.object({
  sellerId: z.string().min(1, "sellerId es requerido"),
  customerId: z.string().optional(),
  type: z.enum(["instant_sale", "pre_order"]),
  saleType: z.enum(["contado", "credito"]),
  totalAmount: z.union([z.string(), z.number()]),
  amountPaid: z.union([z.string(), z.number()]).optional(),
  balanceDue: z.union([z.string(), z.number()]).optional(),
  tara: z.union([z.string(), z.number()]).optional(),
  netWeight: z.union([z.string(), z.number()]).optional(),
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
      const paid = Number(data.amountPaid ?? total);
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
  type: z.enum(["instant_sale", "pre_order"]).optional(),
  saleType: z.enum(["contado", "credito"]).optional(),
  totalAmount: z.union([z.string(), z.number()]).optional(),
  amountPaid: z.union([z.string(), z.number()]).optional(),
  balanceDue: z.union([z.string(), z.number()]).optional(),
  tara: z.union([z.string(), z.number()]).optional(),
  netWeight: z.union([z.string(), z.number()]).optional(),
  deliveryDate: z.string().optional(),
  orderDate: z.string().optional(),
  items: z.array(saleItemSchema).optional(),
});

export const saleUpdateSchema = saleBaseSchema.extend({
  status: z.enum(["draft", "active", "confirmed", "delivered", "cancelled"]).optional(),
  version: z.number().optional(),
  refundAmount: z.union([z.string(), z.number()]).optional(),
  cancelReason: z.string().optional(),
  refundMethod: z.string().optional(),
});

export type SaleCreateInput = z.infer<typeof saleCreateSchema>;
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;

export const abonoCreateSchema = z.object({
  customerId: z.string().min(1, "customerId es requerido"),
  amount: z.union([z.string(), z.number()]).refine(
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
});

export type AbonoUpdateInput = z.infer<typeof abonoUpdateSchema>;

export const distribucionItemSchema = z.object({
  variantId: z.string(),
  cantidadAsignada: z.union([z.string(), z.number()]),
  unidad: z.string(),
});

export const distribucionCreateSchema = z.object({
  vendedorId: z.string().min(1, "vendedorId es requerido"),
  puntoVenta: z.string().min(1, "puntoVenta es requerido"),
  fecha: z.string().optional(),
  modo: z.enum(["estricto", "acumulativo", "libre"]).optional(),
  confiarEnVendedor: z.boolean().optional(),
  groupId: z.string().optional(),
  items: z.array(distribucionItemSchema).min(1, "La distribución requiere items"),
});

const distribucionBaseSchema = z.object({
  vendedorId: z.string().optional(),
  puntoVenta: z.string().optional(),
  fecha: z.string().optional(),
  modo: z.enum(["estricto", "acumulativo", "libre"]).optional(),
  confiarEnVendedor: z.boolean().optional(),
  items: z.array(distribucionItemSchema).optional(),
});

export const distribucionUpdateSchema = distribucionBaseSchema.extend({
  montoRecaudado: z.union([z.string(), z.number()]).optional(),
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
  quantity: z.union([z.string(), z.number()]).optional(),
  orderedQuantity: z.union([z.string(), z.number()]).optional(),
  unitPrice: z.union([z.string(), z.number()]).optional(),
  unitPriceQuoted: z.union([z.string(), z.number()]).optional(),
  subtotal: z.union([z.string(), z.number()]),
});

export type SaleItemOperationInput = z.infer<typeof saleItemOperationSchema>;

export const productCreateSchema = z.object({
  name: z.string().min(1, "name es requerido"),
  type: z.enum(["pollo", "huevo", "otro"]).optional(),
  unit: z.string().optional(),
  basePrice: z.union([z.string(), z.number()]).optional(),
  costPrice: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
  imageId: z.string().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

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
  packs: z.union([z.string(), z.number()]).optional(),
  quantity: z.union([z.string(), z.number()]),
  unitCost: z.union([z.string(), z.number()]),
});

export const purchaseCreateSchema = z.object({
  supplierId: z.string().min(1, "supplierId es requerido"),
  purchaseDate: z.string().optional(),
  status: z.enum(["pending", "received", "cancelled"]).optional(),
  totalAmount: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  receiptImageId: z.string().optional(),
  items: z.array(purchaseItemSchema).optional(),
});

export const purchaseUpdateSchema = purchaseCreateSchema.extend({
  status: z.enum(["pending", "received", "cancelled"]),
});

export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;
export type PurchaseUpdateInput = z.infer<typeof purchaseUpdateSchema>;

export const inventoryCreateSchema = z.object({
  productId: z.string().min(1, "productId es requerido"),
  quantity: z.union([z.string(), z.number()]),
});

export const inventoryUpdateSchema = z.object({
  productId: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
});

export type InventoryCreateInput = z.infer<typeof inventoryCreateSchema>;
export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;

export const syncOperationSchema = z.object({
  idempotencyKey: z.string(),
  entityType: z.enum(["customers", "sales", "sale_items", "abonos", "distribuciones", "products", "tags", "customer_tags", "purchases", "purchase_items", "inventory", "customer_groups", "customer_group_members", "visitas", "suppliers"]),
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
