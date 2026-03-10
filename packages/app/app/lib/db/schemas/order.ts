import { z } from "zod";

export const orderStatusSchema = z.enum([
  "draft",
  "confirmed",
  "delivered",
  "cancelled",
]);

export const paymentIntentSchema = z.enum(["contado", "credito"]);

export const orderSchema = z.object({
  id: z.string(),
  businessId: z.string().optional(),
  sellerId: z.string().optional(),
  clientId: z.string().nullable(),
  deliveryDate: z.string(),
  orderDate: z.string().optional(),
  paymentIntent: paymentIntentSchema,
  paymentStatus: z.enum(["sin_pago", "adelanto_parcial", "pagado_total", "saldo_pendiente"]).optional(),
  status: orderStatusSchema,
  totalAmount: z.number(),
  advanceAmount: z.number().optional(),
  balanceDue: z.number().optional(),
  version: z.number().optional().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const orderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  orderedQuantity: z.number(),
  deliveredQuantity: z.number().optional(),
  unitPriceQuoted: z.number(),
  unitPriceFinal: z.number().optional(),
  isModified: z.boolean().optional(),
  originalQuantity: z.number().optional(),
});

export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
