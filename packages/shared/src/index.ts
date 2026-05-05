// Enums as const objects for frontend usage
export const UserRole = {
  ADMIN: "ADMIN",
  VENDEDOR: "VENDEDOR",
} as const;

export const BusinessUserRole = {
  ADMIN_NEGOCIO: "ADMIN_NEGOCIO",
  VENDEDOR: "VENDEDOR",
} as const;

export const SaleType = {
  CONTADO: "contado",
  CREDITO: "credito",
} as const;

export const PaymentMethod = {
  EFECTIVO: "efectivo",
  YAPE: "yape",
  PLIN: "plin",
  TRANSFERENCIA: "transferencia",
  TARJETA: "tarjeta",
  SALDO: "saldo",
} as const;

export const ProductType = {
  POLLO: "pollo",
  HUEVO: "huevo",
  OTRO: "otro",
} as const;

export const ProductUnit = {
  KG: "kg",
  UNIDAD: "unidad",
} as const;

export const DistribucionStatus = {
  ACTIVO: "activo",
  CERRADO: "cerrado",
  EN_RUTA: "en_ruta",
} as const;

// Type helpers
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  txid?: number;
  error?: string;
};

export interface Business {
  id: string;
  businessUserId: string;
  name: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  publicCatalogEnabled: boolean;
  publicCatalogSlug: string | null;
  usarDistribucion: boolean;
  role: string;
  salesPoint: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessInput {
  name: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  usarDistribucion?: boolean;
  publicCatalogEnabled?: boolean;
  publicCatalogSlug?: string | null;
}

export const InvitationStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export interface Invitation {
  id: string;
  businessId: string;
  email: string;
  inviteeName: string;
  salesPoint: string | null;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateInvitationInput {
  email: string;
  name: string;
  salesPoint?: string;
}

export interface PublicInvitation {
  email: string;
  name: string;
  salesPoint: string | null;
}

// Product Variants (API types - different from Drizzle schema)
export interface ProductVariantDTO {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  unitQuantity: string;
  price: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VariantInventoryDTO {
  id: string;
  variantId: string;
  quantity: string;
  updatedAt: string;
}

export interface CreateVariantInput {
  name: string;
  sku?: string;
  unitQuantity: number;
  price: number;
  isActive?: boolean;
}

export interface UpdateVariantInput {
  name?: string;
  sku?: string;
  unitQuantity?: number;
  price?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ReorderVariantInput {
  variantIds: string[];
}

export const VARIANTS_CONSTRAINTS = {
  maxPerProduct: 10,
  maxNameLength: 50,
  maxSkuLength: 50,
  maxPrice: 9999.99,
  minUnitQuantity: 0.001,
  maxUnitQuantity: 9999.999,
} as const;

export const VERSION = "0.0.1";

// Finance utilities
export function calculateBalanceDue(
  saleType: "contado" | "credito",
  totalAmount: number,
  amountPaid: number
): number {
  if (saleType === "contado") return 0;
  return Math.max(totalAmount - amountPaid, 0);
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "ADMIN_NEGOCIO" | "VENDEDOR";
  salesPoint: string | null;
  isActive: boolean;
  joinedAt: string;
}

export interface UpdateTeamMemberInput {
  role?: "ADMIN_NEGOCIO" | "VENDEDOR";
  salesPoint?: string;
}

// Calculator Settings
export interface CalculatorConfig {
  hideTara: boolean;
  autoFillPrice: boolean;
}

export interface BusinessCalculatorSettings {
  calculators: {
    sales: CalculatorConfig;
    orders: CalculatorConfig;
    purchases: CalculatorConfig;
  };
}

export const defaultCalculatorSettings: BusinessCalculatorSettings = {
  calculators: {
    sales: { hideTara: true, autoFillPrice: false },
    orders: { hideTara: true, autoFillPrice: false },
    purchases: { hideTara: true, autoFillPrice: false },
  },
};

// Order Status
export const OrderStatus = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  DELIVERED: "delivered",
} as const;

export type OrderStatusType = "draft" | "confirmed" | "cancelled" | "delivered";

// Orders
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
  customerId: string;
  sellerId: string;
  deliveryDate: string;
  orderDate: string;
  status: OrderStatusType;
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
  items?: OrderItem[];
  customer?: {
    id: string;
    name: string;
    dni: string | null;
    phone: string | null;
  };
}

export interface CreateOrderInput {
  customerId: string;
  deliveryDate: string;
  paymentIntent: "contado" | "credito";
  paymentStatus?: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
  advanceAmount?: number;
  balanceDue?: number;
  advancePaymentMethod?: "efectivo" | "yape" | "plin" | "transferencia";
  advanceReferenceNumber?: string;
  advanceProofImageId?: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    orderedQuantity: number;
    unitPriceQuoted: number;
  }>;
}

export interface UpdateOrderInput {
  baseVersion: number;
  deliveryDate?: string;
  paymentIntent?: "contado" | "credito";
  paymentStatus?: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
  advanceAmount?: number;
  balanceDue?: number;
  advancePaymentMethod?: "efectivo" | "yape" | "plin" | "transferencia";
  advanceReferenceNumber?: string;
  advanceProofImageId?: string;
  totalAmount?: number;
  items?: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    orderedQuantity: number;
    unitPriceQuoted: number;
  }>;
}

export type {
  Customer,
  NewCustomer,
  Product,
  NewProduct,
  Tag,
  NewTag,
  Sale,
  NewSale,
  SaleItem,
  NewSaleItem,
  ProductVariant,
  NewProductVariant,
  Abono,
  NewAbono,
  Supplier,
  NewSupplier,
  Purchase,
  NewPurchase,
  PurchaseItem,
  NewPurchaseItem,
  Distribucion,
  NewDistribucion,
  DistribucionItem,
  NewDistribucionItem,
  CustomerTag,
  NewCustomerTag,
  CustomerGroup,
  NewCustomerGroup,
  CustomerGroupMember,
  NewCustomerGroupMember,
  Visita,
  NewVisita,
  VariantInventory,
  NewVariantInventory,
} from "./schema";

// State machine exports
export {
  createStateMachine,
  createStrictStateMachine,
  type StateMachine,
  type StateMachineConfig,
  type StateConfig,
} from "./state-machine";

// Sync utilities for frontend
import { createId } from "@paralleldrive/cuid2";
export { createId };

export function generateIdempotencyKey(): string {
  return createId();
}

// Transformers
export {
  // Core
  createTransformer,
  type Transformer,
  type FieldTransform,
  type TransformConfig,
  // Decimal utilities
  decimalToNumber,
  decimalToString,
  normalizeToStrings,
  normalizeToNumbers,
  // Entity transformers
  saleItemTransformer,
  purchaseItemTransformer,
  distribucionItemTransformer,
  saleTransformer,
  salePaymentTransformer,
} from "./transformers";

// Standards
export { DECIMALS } from "./standards/decimals";
export type { DecimalConfig } from "./standards/decimals";
