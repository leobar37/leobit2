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
  quantity: z.string().optional(),
  orderedQuantity: z.string().optional(),
  unitPrice: z.string().optional(),
  unitPriceQuoted: z.string().optional(),
  subtotal: z.string(),
});

export const saleCreateSchema = z.object({
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
  kilosAsignados: z.union([z.string(), z.number()]).optional(),
  kilosVendidos: z.union([z.string(), z.number()]).optional(),
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
  quantity: z.string().optional(),
  orderedQuantity: z.string().optional(),
  unitPrice: z.string().optional(),
  unitPriceQuoted: z.string().optional(),
  subtotal: z.string(),
});

export type SaleItemOperationInput = z.infer<typeof saleItemOperationSchema>;

export const syncOperationSchema = z.object({
  idempotencyKey: z.string(),
  entityType: z.enum(["customers", "sales", "sale_items", "abonos", "distribuciones"]),
  entityId: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.string(), z.unknown()),
  localVersion: z.number(),
  localTimestamp: z.string(),
  syncGroupId: z.string().optional(),
  correlationId: z.string().optional(),
});

export type SyncOperationParsed = z.infer<typeof syncOperationSchema>;
