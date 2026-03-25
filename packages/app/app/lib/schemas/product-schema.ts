import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["pollo", "huevo", "otro"]).optional(),
  unit: z.enum(["kg", "unidad"]),
  basePrice: z.string().min(1, "El precio es requerido"),
  isActive: z.boolean(),
  imageId: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
