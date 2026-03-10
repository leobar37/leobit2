import { z } from "zod";

export const saleItemSchema = z.object({
  id: z.string(),
  saleId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  subtotal: z.string(),
});

export const saleSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  clientId: z.string().nullable(),
  sellerId: z.string(),
  orderId: z.string().nullable(),
  saleType: z.enum(["contado", "credito"]),
  totalAmount: z.string(),
  amountPaid: z.string(),
  balanceDue: z.string(),
  tara: z.string().nullable(),
  netWeight: z.string().nullable(),
  syncStatus: z.enum(["pending", "synced", "error"]),
  status: z.enum(["draft", "active", "cancelled"]).default("draft"),
  saleDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  items: z.array(saleItemSchema).optional(),
  // Joined fields from customer
  client: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
  }).optional(),
  // Additional fields for cancelled sales
  cancelReason: z.string().nullable().optional(),
  refundAmount: z.string().nullable().optional(),
  refundMethod: z.enum(["efectivo", "yape", "plin", "transferencia", "saldo"]).nullable().optional(),
});

export type Sale = z.infer<typeof saleSchema>;
export type SaleItem = z.infer<typeof saleItemSchema>;

export interface CreateSaleInput {
  clientId?: string;
  saleType: "contado" | "credito";
  totalAmount: number;
  amountPaid: number;
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
