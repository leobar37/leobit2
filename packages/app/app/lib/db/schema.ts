import { z } from "zod";

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  businessId: z.string(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Customer = z.infer<typeof customerSchema>;

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["pollo", "huevo", "otro"]),
  unit: z.enum(["kg", "unidad"]),
  basePrice: z.string(),
  isActive: z.boolean().default(true),
  imageId: z.string().nullable(),
  hasVariants: z.boolean().optional(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("synced"),
  syncAttempts: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Product = z.infer<typeof productSchema>;

export const paymentSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  sellerId: z.string(),
  businessId: z.string(),
  amount: z.string(),
  paymentMethod: z.enum(["efectivo", "yape", "plin", "transferencia"]),
  notes: z.string().nullable(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
  relatedSaleId: z.string().nullable(),
  proofImageId: z.string().nullable(),
  referenceNumber: z.string().nullable(),
});

export type Payment = z.infer<typeof paymentSchema>;

export const saleItemSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  saleId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  subtotal: z.string(),
});

export type SaleItem = z.infer<typeof saleItemSchema>;

export const saleSchema = z.object({
  id: z.string(),
  clientId: z.string().nullable(),
  sellerId: z.string(),
  businessId: z.string(),
  saleType: z.enum(["contado", "credito"]),
  totalAmount: z.string(),
  amountPaid: z.string().default("0"),
  balanceDue: z.string().default("0"),
  tara: z.string().nullable(),
  netWeight: z.string().nullable(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  status: z.enum(["draft", "active", "cancelled"]).default("draft"),
  cancelledAt: z.coerce.date().nullable(),
  cancelledBy: z.string().nullable(),
  cancelReason: z.string().nullable(),
  refundAmount: z.string().nullable(),
  refundDate: z.coerce.date().nullable(),
  refundMethod: z.enum(["efectivo", "yape", "plin", "transferencia", "saldo"]).nullable(),
  refundReference: z.string().nullable(),
  refundNotes: z.string().nullable(),
  saleDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  items: z.array(saleItemSchema).optional(),
  client: z.object({
    id: z.string(),
    name: z.string(),
    dni: z.string().nullable(),
    phone: z.string().nullable(),
  }).optional(),
});

export type Sale = z.infer<typeof saleSchema>;

export interface CreateSaleInput {
  clientId?: string;
  saleType: "contado" | "credito";
  totalAmount: number;
  amountPaid?: number;
  tara?: number;
  netWeight?: number;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export const distribucionItemSchema = z.object({
  id: z.string(),
  distribucionId: z.string(),
  variantId: z.string(),
  cantidadAsignada: z.string(),
  cantidadVendida: z.string().default("0"),
  unidad: z.string().default("kg"),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
});

export type DistribucionItem = z.infer<typeof distribucionItemSchema>;

export const distribucionSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  vendedorId: z.string(),
  puntoVenta: z.string(),
  montoRecaudado: z.string().default("0"),
  fecha: z.string(),
  estado: z.enum(["activo", "cerrado", "en_ruta"]).default("activo"),
  modo: z.string().default("estricto"),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
  items: z.array(distribucionItemSchema).optional(),
});

export type Distribucion = z.infer<typeof distribucionSchema>;

export const fileSchema = z.object({
  id: z.string(),
  businessId: z.string().nullable(),
  filename: z.string(),
  storagePath: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  url: z.string().optional(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
});

export type FileRecord = z.infer<typeof fileSchema>;

export const assetSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  filename: z.string(),
  storagePath: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  url: z.string(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
});

export type Asset = z.infer<typeof assetSchema>;

export const syncOperationSchema = z.object({
  id: z.string(),
  entity: z.enum(["customers", "sales", "sale_items", "abonos", "distribuciones", "orders", "order_items", "files", "assets", "suppliers", "purchases", "purchase_items"]),
  operation: z.enum(["insert", "update", "delete"]),
  entityId: z.string(),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.number(),
  attempts: z.number().default(0),
  lastError: z.string().optional(),
});

export type SyncOperation = z.infer<typeof syncOperationSchema>;


// Order schemas
export const orderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  orderedQuantity: z.string(),
  deliveredQuantity: z.string().nullable(),
  unitPriceQuoted: z.string(),
  unitPriceFinal: z.string().nullable(),
  isModified: z.boolean().default(false),
  originalQuantity: z.string().nullable(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  clientId: z.string(),
  sellerId: z.string(),
  deliveryDate: z.string(),
  orderDate: z.string(),
  status: z.enum(["draft", "confirmed", "cancelled", "delivered"]),
  paymentIntent: z.enum(["contado", "credito"]),
  paymentStatus: z.enum(["sin_pago", "adelanto_parcial", "pagado_total", "saldo_pendiente"]).default("sin_pago"),
  advanceAmount: z.string().default("0"),
  balanceDue: z.string().default("0"),
  advancePaymentMethod: z.string().nullable(),
  advanceReferenceNumber: z.string().nullable(),
  advanceProofImageId: z.string().nullable(),
  totalAmount: z.string(),
  confirmedSnapshot: z.record(z.string(), z.unknown()).nullable(),
  deliveredSnapshot: z.record(z.string(), z.unknown()).nullable(),
  version: z.number().default(1),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  syncAttempts: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  items: z.array(orderItemSchema).optional(),
  client: z.object({
    id: z.string(),
    name: z.string(),
    dni: z.string().nullable(),
    phone: z.string().nullable(),
  }).optional(),
});

export type Order = z.infer<typeof orderSchema>;

export interface CreateOrderInput {
  clientId: string;
  deliveryDate: string;
  paymentIntent: "contado" | "credito";
  paymentStatus?: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
  advanceAmount?: number;
  balanceDue?: number;
  advancePaymentMethod?: "efectivo" | "yape" | "plin" | "transferencia";
  advanceReferenceNumber?: string;
  advanceProofImageId?: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    orderedQuantity: number;
    unitPriceQuoted: number;
  }>;
}

export interface CreateOrderItemInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  orderedQuantity: number;
  unitPriceQuoted: number;
}

// Supplier schemas
export const supplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["generic", "regular", "internal"]),
  ruc: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  businessId: z.string(),
  isActive: z.boolean().default(true),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  syncAttempts: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Supplier = z.infer<typeof supplierSchema>;

export interface CreateSupplierInput {
  name: string;
  type?: "generic" | "regular" | "internal";
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

// Purchase item schema
export const purchaseItemSchema = z.object({
  id: z.string(),
  purchaseId: z.string(),
  productId: z.string(),
  variantId: z.string().nullable(),
  unitId: z.string().nullable(),
  quantity: z.string(),
  unitCost: z.string(),
  totalCost: z.string(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  syncAttempts: z.number().default(0),
  createdAt: z.coerce.date(),
  product: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  variant: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
});

export type PurchaseItem = z.infer<typeof purchaseItemSchema>;

// Purchase schema
export const purchaseSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  supplierId: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  totalAmount: z.string(),
  status: z.enum(["draft", "pending", "received", "cancelled"]),
  invoiceNumber: z.string().nullable(),
  receiptImageId: z.string().nullable(),
  notes: z.string().nullable(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  syncAttempts: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  items: z.array(purchaseItemSchema).optional(),
  supplier: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  receiptImage: z.object({
    id: z.string(),
    url: z.string(),
  }).optional(),
});

export type Purchase = z.infer<typeof purchaseSchema>;

export interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber?: string;
  receiptImageId?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}
