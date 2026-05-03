import { z } from "zod";

export const paymentMethodConfigSchema = z.object({
  enabled: z.boolean(),
  phone: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bank: z.string().optional(),
  cci: z.string().optional(),
  qrImageUrl: z.string().optional(),
});

export const paymentMethodsSchema = z.object({
  efectivo: paymentMethodConfigSchema,
  yape: paymentMethodConfigSchema,
  plin: paymentMethodConfigSchema,
  transferencia: paymentMethodConfigSchema,
  tarjeta: paymentMethodConfigSchema,
});

export type PaymentMethodsFormData = z.infer<typeof paymentMethodsSchema>;
