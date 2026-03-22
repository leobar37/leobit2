import { z } from "zod";

/**
 * Unified Sale Item Schema
 * Supports both instant_sales and pre_orders
 */
export const saleItemSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  saleId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),

  // For instant_sales
  quantity: z.string().nullable().optional(),
  unitPrice: z.string().nullable().optional(),

  // For pre_orders
  orderedQuantity: z.string().nullable().optional(),
  deliveredQuantity: z.string().nullable().optional(),
  unitPriceQuoted: z.string().nullable().optional(),
  unitPriceFinal: z.string().nullable().optional(),

  // Tracking
  isModified: z.boolean().optional().default(false),
  originalQuantity: z.string().nullable().optional(),

  subtotal: z.string(),
});

export type SaleItem = z.infer<typeof saleItemSchema>;

/**
 * Unified Sale Schema
 * Supports both instant_sales and pre_orders (formerly orders)
 */
export const saleTypeSchema = z.enum(["instant_sale", "pre_order"]);
export type SaleType = z.infer<typeof saleTypeSchema>;

export const saleStatusSchema = z.enum([
  "draft",
  "confirmed",
  "active",
  "delivered",
  "cancelled",
]);
export type SaleStatus = z.infer<typeof saleStatusSchema>;

export const paymentModeSchema = z.enum(["pago_total", "a_cuenta", "debe_todo"]);
export type PaymentMode = z.infer<typeof paymentModeSchema>;

export const saleSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  customerId: z.string().nullable(),
  sellerId: z.string(),

  // Type: instant_sale (immediate) or pre_order (scheduled delivery)
  type: saleTypeSchema.default("instant_sale"),

  // Sale configuration
  saleType: z.enum(["contado", "credito"]).default("contado"),
  paymentMode: paymentModeSchema.nullable().optional(),

  // Amounts
  totalAmount: z.string(),
  amountPaid: z.string(),
  balanceDue: z.string(),

  // Weight info (for instant_sales)
  tara: z.string().nullable().optional(),
  netWeight: z.string().nullable().optional(),

  // Dates
  saleDate: z.coerce.date(),
  deliveryDate: z.coerce.date().nullable().optional(), // For pre_orders
  orderDate: z.coerce.date().nullable().optional(),    // For pre_orders

  // Status workflow
  status: saleStatusSchema.default("draft"),

  // Versioning & snapshots (from orders)
  version: z.number().int().positive().default(1),
  confirmedSnapshot: z.record(z.unknown()).nullable().optional(),
  deliveredSnapshot: z.record(z.unknown()).nullable().optional(),

  // Customer edit permissions (from orders)
  allowCustomerEdit: z.boolean().default(true),

  // Sync status for offline-first
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  syncAttempts: z.number().int().nonnegative().default(0),

  // Sync group ID for grouping related operations
  syncGroupId: z.string().nullable().optional(),

  // Cancellation
  cancelledAt: z.coerce.date().nullable().optional(),
  cancelledBy: z.string().nullable().optional(),
  cancelReason: z.string().nullable().optional(),

  // Refund tracking
  refundAmount: z.string().nullable().optional(),
  refundDate: z.coerce.date().nullable().optional(),
  refundMethod: z.enum(["efectivo", "yape", "plin", "transferencia", "saldo"]).nullable().optional(),
  refundReference: z.string().nullable().optional(),
  refundNotes: z.string().nullable().optional(),

  // Advance payment (from orders)
  advancePaymentMethod: z.string().nullable().optional(),
  advanceReferenceNumber: z.string().nullable().optional(),
  advanceProofImageId: z.string().nullable().optional(),

  // Relations
  items: z.array(saleItemSchema).optional(),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
  }).optional(),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
});

export type Sale = z.infer<typeof saleSchema>;

/**
 * Input for creating a new sale (instant or pre_order)
 */
export interface CreateSaleInput {
  customerId?: string;
  type: SaleType;
  saleType: "contado" | "credito";
  totalAmount: number;
  amountPaid: number;
  tara?: number;
  netWeight?: number;
  deliveryDate?: string; // For pre_orders
  orderDate?: string;    // For pre_orders
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity?: number;           // For instant_sales
    orderedQuantity?: number;    // For pre_orders
    unitPrice?: number;          // For instant_sales
    unitPriceQuoted?: number;    // For pre_orders
    subtotal: number;
  }>;
}
