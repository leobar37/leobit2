import { faker } from "@faker-js/faker/locale/es";
import { generateProduct, type Product } from "./product.factory";

// ============================================================================
// Types - Match the actual API schema
// ============================================================================

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  orderedQuantity: string;
  deliveredQuantity: string | null;
  unitPriceQuoted: string;
  unitPriceFinal: string | null;
  isModified: boolean;
  originalQuantity: string | null;
}

export interface Order {
  id: string;
  businessId: string;
  clientId: string;
  sellerId: string;
  deliveryDate: string;
  orderDate: string;
  status: "draft" | "confirmed" | "cancelled" | "delivered";
  paymentIntent: "contado" | "credito";
  paymentStatus: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
  advanceAmount: string;
  balanceDue: string;
  advancePaymentMethod: string | null;
  advanceReferenceNumber: string | null;
  advanceProofImageId: string | null;
  totalAmount: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  client?: {
    id: string;
    name: string;
    dni: string | null;
    phone: string | null;
  };
}

export interface OrderOverrides {
  businessId?: string;
  clientId?: string;
  sellerId?: string;
  status?: "draft" | "confirmed" | "cancelled" | "delivered";
  paymentIntent?: "contado" | "credito";
  paymentStatus?: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
}

// ============================================================================
// Constants
// ============================================================================

const BUSINESS_ID = "biz-demo";
const SELLER_ID = "seller-demo";

// ============================================================================
// Factory Functions
// ============================================================================

export function generateOrderItem(
  orderId: string,
  product: Product,
  variantIndex: number
): OrderItem {
  const variant = product.variants?.[variantIndex];
  const orderedQuantity = faker.number.float({ min: 1, max: 20, fractionDigits: 3 });
  const unitPriceQuoted = variant
    ? parseFloat(variant.price)
    : parseFloat(product.basePrice);

  return {
    id: `oi-${orderId}-${product.id}`,
    orderId,
    productId: product.id,
    variantId: variant?.id ?? "var-default",
    productName: product.name,
    variantName: variant?.name ?? "Estándar",
    orderedQuantity: orderedQuantity.toFixed(3),
    deliveredQuantity: null, // Will be updated if order is delivered
    unitPriceQuoted: unitPriceQuoted.toFixed(2),
    unitPriceFinal: null,
    isModified: false,
    originalQuantity: null,
  };
}

export function generateOrder(index: number, overrides?: OrderOverrides): Order {
  const now = new Date();
  const pastDate = faker.date.past({ years: 1 });
  const orderId = `ord-vol-${String(index).padStart(6, "0")}`;
  const businessId = overrides?.businessId ?? BUSINESS_ID;
  const status = overrides?.status ?? faker.helpers.arrayElement(["draft", "confirmed", "delivered"]);
  const paymentIntent = overrides?.paymentIntent ?? faker.helpers.arrayElement(["contado", "credito"]);

  // Generate 1-5 items per order
  const itemCount = faker.number.int({ min: 1, max: 5 });
  const products = Array.from({ length: itemCount }, () =>
    generateProduct(faker.number.int({ min: 0, max: 999 }))
  );

  const items: OrderItem[] = products.map((product, i) =>
    generateOrderItem(orderId, product, i % 2)
  );

  // Calculate totals
  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.orderedQuantity) * parseFloat(item.unitPriceQuoted),
    0
  );

  // Determine payment status based on payment intent and status
  let paymentStatus: Order["paymentStatus"];
  let advanceAmount: number;
  let balanceDue: number;

  if (paymentIntent === "contado") {
    advanceAmount = totalAmount;
    balanceDue = 0;
    paymentStatus = "pagado_total";
  } else {
    // Credito - might have partial payment or none
    if (status === "draft") {
      paymentStatus = "sin_pago";
      advanceAmount = 0;
      balanceDue = totalAmount;
    } else if (status === "cancelled") {
      paymentStatus = faker.helpers.arrayElement(["sin_pago", "adelanto_parcial"]);
      advanceAmount = paymentStatus === "adelanto_parcial" ? totalAmount * 0.3 : 0;
      balanceDue = totalAmount - advanceAmount;
    } else {
      // confirmed or delivered
      const paymentRatio = faker.number.float({ min: 0, max: 0.8 });
      advanceAmount = totalAmount * paymentRatio;
      balanceDue = totalAmount - advanceAmount;
      if (advanceAmount === 0) {
        paymentStatus = "sin_pago";
      } else if (balanceDue === 0) {
        paymentStatus = "pagado_total";
      } else if (advanceAmount < totalAmount * 0.5) {
        paymentStatus = "adelanto_parcial";
      } else {
        paymentStatus = "saldo_pendiente";
      }
    }
  }

  // Generate delivery date (future date for active orders, past for delivered)
  const orderDate = pastDate.toISOString();
  let deliveryDate: string;
  if (status === "delivered") {
    deliveryDate = faker.date.between({ from: pastDate, to: now }).toISOString();
  } else if (status === "confirmed") {
    deliveryDate = faker.date.soon({ days: 7 }).toISOString();
  } else {
    deliveryDate = faker.date.soon({ days: 14 }).toISOString();
  }

  // Generate optional client
  const includeClient = faker.datatype.boolean({ probability: 0.9 });
  const client = includeClient
    ? {
        id: `cust-vol-${faker.string.numeric(6)}`,
        name: faker.person.fullName(),
        dni: faker.string.numeric(8),
        phone: `+51 9${faker.string.numeric(8)}`,
      }
    : undefined;

  // Payment method for advance payments
  const hasAdvancePayment = parseFloat(advanceAmount.toFixed(2)) > 0;
  const advancePaymentMethod = hasAdvancePayment
    ? faker.helpers.arrayElement(["efectivo", "yape", "plin", "transferencia"])
    : null;
  const advanceReferenceNumber = hasAdvancePayment ? faker.string.numeric(10) : null;

  if (status === "delivered") {
    // Update delivered quantities
    items.splice(0, items.length, ...items.map((item) => ({
      ...item,
      deliveredQuantity: item.orderedQuantity,
      unitPriceFinal: item.unitPriceQuoted,
    })));
  }

  const order: Order = {
    id: orderId,
    businessId,
    clientId: overrides?.clientId ?? client?.id ?? `cust-vol-${faker.string.numeric(6)}`,
    sellerId: overrides?.sellerId ?? SELLER_ID,
    deliveryDate,
    orderDate,
    status,
    paymentIntent,
    paymentStatus: overrides?.paymentStatus ?? paymentStatus,
    advanceAmount: advanceAmount.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
    advancePaymentMethod,
    advanceReferenceNumber,
    advanceProofImageId: null,
    totalAmount: totalAmount.toFixed(2),
    version: status === "delivered" ? 3 : status === "confirmed" ? 2 : 1,
    createdAt: pastDate.toISOString(),
    updatedAt: faker.date.between({ from: pastDate, to: now }).toISOString(),
    items,
    client,
  };

  return order;
}

export function generateOrders(count: number, overrides?: OrderOverrides): Order[] {
  return Array.from({ length: count }, (_, i) => generateOrder(i, overrides));
}

// ============================================================================
// Bulk Generation Helpers
// ============================================================================

/**
 * Generate a large batch of orders efficiently
 */
export function generateOrdersBatch(
  count: number,
  batchSize: number = 100,
  overrides?: OrderOverrides
): Order[] {
  const orders: Order[] = [];
  for (let i = 0; i < count; i += batchSize) {
    const remaining = Math.min(batchSize, count - i);
    const batch = generateOrders(remaining, { ...overrides, businessId: overrides?.businessId ?? BUSINESS_ID });
    orders.push(...batch);
  }
  return orders;
}
