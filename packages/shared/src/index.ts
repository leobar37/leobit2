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
} as const;

export const SyncStatus = {
  PENDING: "pending",
  SYNCED: "synced",
  ERROR: "error",
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

export const ModoOperacion = {
  INVENTARIO_PROPIO: "inventario_propio",
  SIN_INVENTARIO: "sin_inventario",
  PEDIDOS: "pedidos",
  MIXTO: "mixto",
} as const;

// Type helpers
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface Business {
  id: string;
  name: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  modoOperacion: string | null;
  usarDistribucion: boolean;
  permitirVentaSinStock: boolean;
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
  permitirVentaSinStock?: boolean;
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

// Product Variants
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  unitQuantity: string;
  price: string;
  sortOrder: number;
  isActive: boolean;
  syncStatus: "pending" | "synced" | "error";
  syncAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface VariantInventory {
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
