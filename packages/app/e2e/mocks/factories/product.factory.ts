import { faker } from "@faker-js/faker/locale/es";

// ============================================================================
// Types - Match the actual API schema
// ============================================================================

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  unitQuantity: string;
  price: string;
  isActive: boolean;
  inventory?: {
    quantity: string;
  };
}

export interface Product {
  id: string;
  name: string;
  type: "pollo" | "huevo" | "otro";
  categoryId: string | null;
  unit: "kg" | "unidad";
  basePrice: string;
  isActive: boolean;
  businessId: string;
  hasVariants: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
}

export interface ProductOverrides {
  businessId?: string;
  hasVariants?: boolean;
  type?: "pollo" | "huevo" | "otro";
  categoryId?: string | null;
}

// ============================================================================
// Factory Functions
// ============================================================================

const BUSINESS_ID = "biz-demo";

const DEFAULT_CATEGORIES: Record<string, string> = {
  pollo: "cat-pollo",
  huevo: "cat-huevo",
  otro: "cat-otro",
};

// Product type weights (pollo is most common)
const PRODUCT_TYPES: Array<"pollo" | "huevo" | "otro"> = ["pollo", "pollo", "pollo", "huevo", "huevo", "otro"];

// Common Peruvian chicken product names
const POLLO_NAMES = [
  "Pollo Entero",
  "Pollo Trozado",
  "Pollo a la Brasa",
  "Alitas",
  "Pechuga",
  "Muslo",
  "Pierna",
  "Molletes",
  "Corazón",
  "Molleja",
  "Hígado",
  "Pulpa",
  "Cuadril",
  "Pechuga Deshuesada",
];

const HUEVO_NAMES = [
  "Huevo Fresco",
  "Huevo Mediano",
  "Huevo Grande",
  "Huevo Extra Grande",
  "Bandeja de Huevos",
  "Huevo de Codorniz",
];

const OTRO_NAMES = [
  "Embutidos",
  "Aliño",
  "Salsa de Ají",
  "Salsa de Huancaina",
  "Mayonesa",
  "Ketchup",
  "Mostaza",
  "Pimentón",
];

// Variant names for products with variants
const VARIANT_SIZES = ["Pequeño", "Mediano", "Grande", "Extra Grande"];
const VARIANT_NAMES = ["Entero", "Medio", "Cuarto", "Porción"];

function getProductName(type: "pollo" | "huevo" | "otro"): string {
  switch (type) {
    case "pollo":
      return faker.helpers.arrayElement(POLLO_NAMES);
    case "huevo":
      return faker.helpers.arrayElement(HUEVO_NAMES);
    case "otro":
      return faker.helpers.arrayElement(OTRO_NAMES);
  }
}

export function generateProductVariant(
  productId: string,
  variantIndex: number,
  basePrice: number
): ProductVariant {
  const priceMultiplier = 0.5 + variantIndex * 0.5; // 0.5, 1.0, 1.5, 2.0
  const variantPrice = basePrice * priceMultiplier;

  return {
    id: `var-${productId}-${variantIndex}`,
    productId,
    name: faker.helpers.arrayElement(VARIANT_NAMES),
    sku: `SKU-${productId}-${variantIndex}`,
    unitQuantity: faker.string.numeric(2),
    price: variantPrice.toFixed(2),
    isActive: true,
    inventory: {
      quantity: faker.string.numeric(3),
    },
  };
}

export function generateProduct(index: number, overrides?: ProductOverrides): Product {
  const now = new Date();
  const pastDate = faker.date.past({ years: 1 });
  const productId = `prod-vol-${String(index).padStart(6, "0")}`;
  const type = overrides?.type ?? faker.helpers.arrayElement(PRODUCT_TYPES);
  const hasVariants = overrides?.hasVariants ?? faker.datatype.boolean({ probability: 0.4 });
  const basePrice = faker.number.float({ min: 5, max: 50, fractionDigits: 2 });

  // Support explicit categoryId, fallback to type mapping, or null for uncategorized
  const categoryId = overrides?.categoryId !== undefined
    ? overrides.categoryId
    : type === "otro" && index % 5 === 0
      ? null
      : DEFAULT_CATEGORIES[type] ?? null;

  const product: Product = {
    id: productId,
    name: getProductName(type),
    type,
    categoryId,
    unit: type === "huevo" ? "unidad" : "kg",
    basePrice: basePrice.toFixed(2),
    isActive: true,
    businessId: overrides?.businessId ?? BUSINESS_ID,
    hasVariants,
    createdAt: pastDate.toISOString(),
    updatedAt: faker.date.between({ from: pastDate, to: now }).toISOString(),
  };

  // Generate 2 variants for products that have variants
  if (hasVariants) {
    product.variants = Array.from({ length: 2 }, (_, i) =>
      generateProductVariant(productId, i, basePrice)
    );
  }

  return product;
}

export function generateProducts(count: number, overrides?: ProductOverrides): Product[] {
  return Array.from({ length: count }, (_, i) => generateProduct(i, overrides));
}

// ============================================================================
// Bulk Generation Helpers
// ============================================================================

/**
 * Generate a large batch of products efficiently
 */
export function generateProductsBatch(
  count: number,
  batchSize: number = 100,
  overrides?: ProductOverrides
): Product[] {
  const products: Product[] = [];
  for (let i = 0; i < count; i += batchSize) {
    const remaining = Math.min(batchSize, count - i);
    const batch = generateProducts(remaining, { ...overrides, businessId: overrides?.businessId ?? BUSINESS_ID });
    products.push(...batch);
  }
  return products;
}
