import { describe, expect, it } from "vitest";
import { productSchema } from "./product-schema";

describe("productSchema", () => {
  const baseProduct = {
    name: "Producto QA",
    categoryId: null,
    unit: "kg" as const,
    basePrice: "15.00",
    isActive: true,
  };

  it("accepts a selected image file before the media resolver uploads it", () => {
    const result = productSchema.safeParse({
      ...baseProduct,
      imageId: new File(["image"], "producto.png", { type: "image/png" }),
    });

    expect(result.success).toBe(true);
  });
});
