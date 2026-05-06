import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  categoryId: z.string().nullable().optional(),
  unit: z.enum(["kg", "unidad"]),
  basePrice: z.string().min(1, "El precio es requerido"),
  isActive: z.boolean(),
  imageId: z
    .union([
      z.string(),
      z.custom<File>((value) => typeof File !== "undefined" && value instanceof File),
      z.object({ id: z.string(), url: z.string().optional() }),
      z.null(),
    ])
    .optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
