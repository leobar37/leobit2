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

// Subscription Plans
export const SubscriptionPlan = {
  GRATIS: "gratis",
  PROFESIONAL: "profesional",
} as const;

export type SubscriptionPlanType =
  (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

export interface SubscriptionPlanConfig {
  plan: SubscriptionPlanType;
  monthlyRecordLimit: number | null;
  priceMonthly: number;
  features: {
    reports: boolean;
    exportExcel: boolean;
  };
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, SubscriptionPlanConfig> = {
  gratis: {
    plan: "gratis",
    monthlyRecordLimit: 50,
    priceMonthly: 0,
    features: { reports: false, exportExcel: false },
  },
  profesional: {
    plan: "profesional",
    monthlyRecordLimit: null,
    priceMonthly: 49,
    features: { reports: true, exportExcel: true },
  },
};

export interface BusinessSubscription {
  id: string;
  businessId: string;
  plan: SubscriptionPlanType;
  monthlyRecordLimit: number | null;
  priceMonthly: number;
  features: SubscriptionPlanConfig["features"];
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  id: string;
  businessId: string;
  periodStart: string;
  periodEnd: string;
  recordCount: number;
  updatedAt: string;
}

export interface PlanStatus {
  plan: SubscriptionPlanType;
  isWithinLimit: boolean;
  recordsUsedThisPeriod: number;
  recordsLimit: number | null;
  periodEnd: string;
  canExport: boolean;
  canAccessReports: boolean;
}

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
  businessMode: "polleria" | "agua" | "cochera";
  modeConfigOverrides: Record<string, unknown> | null;
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
  businessMode?: "polleria" | "agua" | "cochera";
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
  businessMode?: "polleria" | "agua" | "cochera";
  modeConfigOverrides?: Record<string, unknown>;
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

export const WaterDeliveryFrequency = {
  DAILY: "daily",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  MONTHLY: "monthly",
  ON_DEMAND: "on_demand",
} as const;

export const WaterDepositStatus = {
  NONE: "none",
  ACTIVE: "active",
  REFUNDED: "refunded",
  PENALIZED: "penalized",
} as const;

export type WaterDeliveryFrequency =
  (typeof WaterDeliveryFrequency)[keyof typeof WaterDeliveryFrequency];
export type WaterDepositStatus =
  (typeof WaterDepositStatus)[keyof typeof WaterDepositStatus];

export interface WaterCustomerProfileDTO {
  id: string;
  businessId: string;
  customerId: string;
  deliveryFrequency: WaterDeliveryFrequency | string;
  deliveryDays: string[];
  defaultContainerQuantity: number;
  containersAtCustomer: number;
  depositAmount: string;
  depositStatus: WaterDepositStatus | string;
  depositExceptionReason: string | null;
  waterRouteId: string | null;
  waterRouteName?: string | null;
  preferredRoute: string | null;
  deliveryInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWaterCustomerProfileInput {
  deliveryFrequency?: WaterDeliveryFrequency | string;
  deliveryDays?: string[];
  defaultContainerQuantity?: number;
  containersAtCustomer?: number;
  depositAmount?: string | number;
  depositStatus?: WaterDepositStatus | string;
  depositExceptionReason?: string | null;
  waterRouteId?: string | null;
  preferredRoute?: string | null;
  deliveryInstructions?: string | null;
}

export type UpdateWaterCustomerProfileInput =
  Partial<CreateWaterCustomerProfileInput>;

export interface CustomerWithWaterProfile {
  waterProfile?: WaterCustomerProfileDTO | null;
}

export interface GenerateWaterRouteInput {
  vendedorId: string;
  fecha: string;
  waterRouteId: string;
  preview?: boolean;
}

export interface WaterRoutePreviewCustomer {
  customerId: string;
  customerName: string;
  phone: string | null;
  address: string | null;
  profileId: string;
  defaultContainerQuantity: number;
  containersAtCustomer: number;
  waterRouteId: string | null;
  waterRouteName: string | null;
  preferredRoute: string | null;
  deliveryInstructions: string | null;
}

export interface WaterRouteGenerationResult {
  distribucionId: string | null;
  customers: WaterRoutePreviewCustomer[];
  createdVisits: number;
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
  hidePrices: boolean;
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
    sales: { hideTara: true, autoFillPrice: false, hidePrices: false },
    orders: { hideTara: true, autoFillPrice: false, hidePrices: false },
    purchases: { hideTara: true, autoFillPrice: false, hidePrices: false },
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

export {
  getCalendarDayPeriod,
  getCalendarMonthPeriod,
  getCalendarWeekPeriod,
  isDateInPeriod,
  periodToISOStrings,
} from "./standards/periods";
export type { CalendarMonthPeriod, CalendarPeriod } from "./standards/periods";

// Business Modes
export {
  BusinessModeFlagsSchema,
  BusinessModeSlugSchema,
  mergeBusinessModeFlags,
  BUSINESS_MODE_DEFAULTS,
  getDefaultFlags,
  SUPPORTED_BUSINESS_MODES,
} from "./business-modes";

export type {
  BusinessModeFlags,
  BusinessModeSlug,
} from "./business-modes";

// Cochera (Parking) Settings
export interface CocheraSettings {
  id: string;
  businessId: string;
  displayName: string | null;
  displayAddress: string | null;
  hourlyRate: string;
  dailyRate: string | null;
  graceMinutes: number;
  totalSpaces: number;
  acceptedPaymentMethods: ("efectivo" | "yape" | "plin")[];
  createdAt: string;
  updatedAt: string;
}

export interface CocheraSettingsInput {
  displayName?: string;
  displayAddress?: string;
  hourlyRate: number;
  dailyRate?: number | null;
  graceMinutes: number;
  totalSpaces: number;
  acceptedPaymentMethods: ("efectivo" | "yape" | "plin")[];
}

// Cochera Vehicle Sessions
export const CocheraVehicleType = {
  AUTO: "auto",
  MOTO: "moto",
  CAMIONETA: "camioneta",
} as const;

export type CocheraVehicleType =
  (typeof CocheraVehicleType)[keyof typeof CocheraVehicleType];

export const CocheraSessionStatus = {
  DENTRO: "dentro",
  FUERA: "fuera",
} as const;

export type CocheraSessionStatus =
  (typeof CocheraSessionStatus)[keyof typeof CocheraSessionStatus];

export interface CocheraSession {
  id: string;
  businessId: string;
  plate: string;
  vehicleType: CocheraVehicleType;
  status: CocheraSessionStatus;
  entryAt: string;
  exitAt: string | null;
  notes: string | null;
  totalAmount: string | null;
  discountAmount: string | null;
  amountPaid: string | null;
  balanceDue: string | null;
  paymentMode: PaymentMode | null;
  paymentMethod: string | null;
  responsibleCustomerId: string | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  settlementNotes: string | null;
  checkoutAt: string | null;
  checkoutBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCocheraSessionInput {
  plate: string;
  vehicleType: CocheraVehicleType;
  notes?: string;
}

// Cochera Checkout
export interface CocheraCheckoutInput {
  paymentMode?: PaymentMode;
  amountPaid?: number;
  paymentMethod?: "efectivo" | "yape" | "plin";
  responsibleCustomerId?: string | null;
  responsibleName?: string | null;
  responsiblePhone?: string | null;
  notes?: string | null;
  discount?: number;
}

export interface CocheraCheckoutResult {
  id: string;
  plate: string;
  vehicleType: CocheraVehicleType;
  entryAt: string;
  exitAt: string;
  checkoutAt: string;
  durationMinutes: number;
  billableHours: number;
  hourlyRate: string;
  discountAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  paymentMode: PaymentMode;
  paymentMethod: string | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  checkoutBy: string | null;
}

export type PaymentMode = "pago_total" | "a_cuenta" | "debe_todo";

// Cochera Dashboard
export interface CocheraDashboardData {
  todayEntries: number;
  activeInside: number;
  todayIncome: string;
  monthIncome: string;
  chartData: { date: string; income: string; count: number }[];
  recentActivity: CocheraSession[];
}

// Cochera Reports
export type CocheraReportPeriod = "today" | "week" | "month";

export interface CocheraReportRow {
  id: string;
  plate: string;
  vehicleType: CocheraVehicleType;
  entryAt: string;
  exitAt: string | null;
  durationMinutes: number;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  paymentMode: PaymentMode | null;
  paymentMethod: string | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  discountAmount: string | null;
}

export interface CocheraReportSummary {
  totalVehicles: number;
  totalBilled: string;
  totalIncome: string;
  totalPending: string;
  averagePerVehicle: string;
}

export interface CocheraReportResult {
  period: CocheraReportPeriod;
  startDate: string;
  endDate: string;
  summary: CocheraReportSummary;
  rows: CocheraReportRow[];
}

// Cochera Debt Payments
export interface CocheraDebtItem {
  id: string;
  plate: string;
  vehicleType: CocheraVehicleType;
  entryAt: string;
  exitAt: string | null;
  checkoutAt: string | null;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  paymentMode: PaymentMode | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  notes: string | null;
  settlementNotes: string | null;
}

export interface CocheraDebtSummary {
  totalDebt: string;
  totalSessions: number;
}

export interface CocheraDebtListResult {
  items: CocheraDebtItem[];
  summary: CocheraDebtSummary;
}

export interface CocheraSessionPayment {
  id: string;
  businessId: string;
  sessionId: string;
  amount: string;
  paymentMethod: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta" | "saldo";
  referenceNumber: string | null;
  proofImageId: string | null;
  notes: string | null;
  collectedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCocheraSessionPaymentInput {
  amount: number;
  paymentMethod: "efectivo" | "yape" | "plin";
  referenceNumber?: string | null;
  proofImageId?: string | null;
  notes?: string | null;
}

export interface CocheraSessionPaymentResult {
  payment: CocheraSessionPayment;
  session: CocheraSession;
}
