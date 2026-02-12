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
  controlKilos: boolean;
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
  modoOperacion?: "inventario_propio" | "sin_inventario" | "pedidos" | "mixto";
  controlKilos?: boolean;
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

export const VERSION = "0.0.1";
