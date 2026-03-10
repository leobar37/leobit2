import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { z } from "zod";
import { createShapeOptions } from "./utils";

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["pollo", "huevo", "otro"]),
  unit: z.enum(["kg", "unidad"]),
  basePrice: z.string(),
  isActive: z.boolean(),
  imageId: z.string().nullable(),
  createdAt: z.coerce.date(),
});

const productVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  priceModifier: z.string(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Product = z.infer<typeof productSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;

// Products collection (read-only for vendors)
// @ts-ignore - electricCollectionOptions types are not fully aligned
export const productCollection = createCollection(
  electricCollectionOptions({
    id: "products",
    schema: productSchema,
    getKey: (product) => product.id,
    shapeOptions: createShapeOptions("products"),
    // No onInsert/onUpdate - vendors only read products
  })
);

// Product variants collection (read-only)
// @ts-ignore - electricCollectionOptions types are not fully aligned
export const productVariantCollection = createCollection(
  electricCollectionOptions({
    id: "product_variants",
    schema: productVariantSchema,
    getKey: (variant) => variant.id,
    shapeOptions: createShapeOptions("product_variants"),
  })
);
