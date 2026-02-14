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
  createdAt: z.coerce.date(),
});

export type Product = z.infer<typeof productSchema>;

export const paymentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  sellerId: z.string(),
  businessId: z.string(),
  amount: z.string(),
  paymentMethod: z.enum(["efectivo", "yape", "plin", "transferencia"]),
  notes: z.string().nullable(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
});

export type Payment = z.infer<typeof paymentSchema>;

export const saleItemSchema = z.object({
  id: z.string(),
  saleId: z.string(),
  productId: z.string(),
  productName: z.string(),
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
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export const syncOperationSchema = z.object({
  id: z.string(),
  collection: z.enum(["customers", "payments", "sales"]),
  operation: z.enum(["insert", "update", "delete"]),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.number(),
  attempts: z.number().default(0),
  lastError: z.string().optional(),
});

export type SyncOperation = z.infer<typeof syncOperationSchema>;
