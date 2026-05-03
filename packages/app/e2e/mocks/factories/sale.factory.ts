import { faker } from "@faker-js/faker/locale/es";
import { generateProduct, type Product } from "./product.factory";

// ============================================================================
// Types - Match the actual API schema
// ============================================================================

export interface SaleItem {
  id: string;
  businessId: string;
  saleId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
}

export interface Sale {
  id: string;
  businessId: string;
  customerId: string | null;
  sellerId: string;
  type: "instant_sale" | "pre_order";
  saleType: "contado" | "credito";
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara: string | null;
  netWeight: string | null;
  deliveryDate: string | null;
  orderDate: string | null;
  status: "draft" | "active" | "confirmed" | "delivered" | "cancelled";
  saleDate: string;
  createdAt: string;
  items: SaleItem[];
  client?: {
    id: string;
    name: string;
    dni: string | null;
    phone: string | null;
  };
}

export interface SaleOverrides {
  businessId?: string;
  customerId?: string | null;
  sellerId?: string;
  saleType?: "contado" | "credito";
  status?: "draft" | "active" | "confirmed" | "delivered" | "cancelled";
  type?: "instant_sale" | "pre_order";
}

// ============================================================================
// Constants
// ============================================================================

const BUSINESS_ID = "biz-demo";
const SELLER_ID = "seller-demo";

// ============================================================================
// Factory Functions
// ============================================================================

export function generateSaleItem(
  saleId: string,
  product: Product,
  variantIndex: number,
  businessId: string
): SaleItem {
  const variant = product.variants?.[variantIndex];
  const quantity = faker.number.float({ min: 0.5, max: 10, fractionDigits: 3 });
  const unitPrice = variant ? parseFloat(variant.price) : parseFloat(product.basePrice);
  const subtotal = (quantity * unitPrice).toFixed(2);

  return {
    id: `si-${saleId}-${product.id}`,
    businessId,
    saleId,
    productId: product.id,
    variantId: variant?.id ?? "var-default",
    productName: product.name,
    variantName: variant?.name ?? "Estándar",
    quantity: quantity.toFixed(3),
    unitPrice: unitPrice.toFixed(2),
    subtotal,
  };
}

export function generateSale(index: number, overrides?: SaleOverrides): Sale {
  const now = new Date();
  const pastDate = faker.date.past({ years: 1 });
  const saleId = `sale-vol-${String(index).padStart(6, "0")}`;
  const businessId = overrides?.businessId ?? BUSINESS_ID;
  const saleType = overrides?.saleType ?? faker.helpers.arrayElement(["contado", "contado", "credito"]);
  const status = overrides?.status ?? faker.helpers.arrayElement(["active", "confirmed", "delivered"]);

  // Generate 1-5 items per sale
  const itemCount = faker.number.int({ min: 1, max: 5 });
  const products = Array.from({ length: itemCount }, () =>
    generateProduct(faker.number.int({ min: 0, max: 999 }))
  );

  const items: SaleItem[] = products.map((product, i) =>
    generateSaleItem(saleId, product, i % 2, businessId)
  );

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

  // For credit sales, amountPaid might be partial
  let amountPaid: number;
  let balanceDue: number;

  if (saleType === "contado") {
    amountPaid = totalAmount;
    balanceDue = 0;
  } else {
    // Credit sale - might have partial payment or none
    const paymentRatio = faker.number.float({ min: 0, max: 1 });
    amountPaid = totalAmount * paymentRatio;
    balanceDue = totalAmount - amountPaid;
  }

  // Generate optional client for some sales
  const includeClient = faker.datatype.boolean({ probability: 0.7 });
  const client = includeClient
    ? {
        id: `cust-vol-${faker.string.numeric(6)}`,
        name: faker.person.fullName(),
        dni: faker.string.numeric(8),
        phone: `+51 9${faker.string.numeric(8)}`,
      }
    : undefined;

  const sale: Sale = {
    id: saleId,
    businessId,
    customerId: overrides?.customerId ?? (includeClient ? client?.id ?? null : null),
    sellerId: overrides?.sellerId ?? SELLER_ID,
    type: overrides?.type ?? "instant_sale",
    saleType,
    totalAmount: totalAmount.toFixed(2),
    amountPaid: amountPaid.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
    tara: saleType === "contado" ? faker.string.numeric(2) : null,
    netWeight: saleType === "contado" ? faker.number.float({ min: 1, max: 20, fractionDigits: 3 }).toString() : null,
    deliveryDate: null,
    orderDate: null,
    status,
    saleDate: faker.date.between({ from: pastDate, to: now }).toISOString(),
    createdAt: pastDate.toISOString(),
    items,
    client,
  };

  return sale;
}

export function generateSales(count: number, overrides?: SaleOverrides): Sale[] {
  return Array.from({ length: count }, (_, i) => generateSale(i, overrides));
}

// ============================================================================
// Bulk Generation Helpers
// ============================================================================

/**
 * Generate a large batch of sales efficiently
 */
export function generateSalesBatch(
  count: number,
  batchSize: number = 100,
  overrides?: SaleOverrides
): Sale[] {
  const sales: Sale[] = [];
  for (let i = 0; i < count; i += batchSize) {
    const remaining = Math.min(batchSize, count - i);
    const batch = generateSales(remaining, { ...overrides, businessId: overrides?.businessId ?? BUSINESS_ID });
    sales.push(...batch);
  }
  return sales;
}
