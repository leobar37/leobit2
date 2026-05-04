import { z } from "zod";

const optionalText = z.string().trim().optional();

export const paymentMethodConfigSchema = z.object({
  enabled: z.boolean(),
  phone: optionalText,
  accountName: optionalText,
  accountNumber: optionalText,
  bank: optionalText,
  cci: optionalText,
  qrImageUrl: optionalText,
});

export const paymentMethodsSchema = z.object({
  efectivo: paymentMethodConfigSchema,
  yape: paymentMethodConfigSchema.superRefine((data, ctx) => {
    if (data.enabled && !data.phone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El número de celular es requerido para Yape",
        path: ["phone"],
      });
    }
  }),
  plin: paymentMethodConfigSchema.superRefine((data, ctx) => {
    if (data.enabled && !data.phone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El número de celular es requerido para Plin",
        path: ["phone"],
      });
    }
  }),
  transferencia: paymentMethodConfigSchema.superRefine((data, ctx) => {
    if (data.enabled && !data.bank?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El banco es requerido para transferencias",
        path: ["bank"],
      });
    }

    if (data.enabled && !data.accountNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El número de cuenta es requerido para transferencias",
        path: ["accountNumber"],
      });
    }
  }),
  tarjeta: paymentMethodConfigSchema,
});

export type PaymentMethodsFormData = z.infer<typeof paymentMethodsSchema>;
