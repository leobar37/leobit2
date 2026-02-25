/**
 * Database Enums
 * Centralized enum definitions to avoid circular dependencies
 */
import { pgEnum } from "drizzle-orm/pg-core";

// User (legacy - mantener para compatibilidad)
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "VENDEDOR"]);

// Business User Roles - roles dentro de un negocio específico
export const businessUserRoleEnum = pgEnum("business_user_role", [
  "ADMIN_NEGOCIO",
  "VENDEDOR",
]);

// Sync status (used by multiple tables)
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "synced",
  "error",
]);

// Sales
export const saleTypeEnum = pgEnum("sale_type", ["contado", "credito"]);
export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "confirmed",
  "cancelled",
  "delivered",
]);

// Payments
export const paymentMethodEnum = pgEnum("payment_method", [
  "efectivo",
  "yape",
  "plin",
  "transferencia",
]);

// Products
export const productTypeEnum = pgEnum("product_type", ["pollo", "huevo", "otro"]);
export const productUnitEnum = pgEnum("product_unit", ["kg", "unidad"]);

// Distribuciones
export const distribucionStatusEnum = pgEnum("distribucion_status", [
  "activo",
  "cerrado",
  "en_ruta",
]);

export const modoOperacionEnum = pgEnum("modo_operacion", [
  "inventario_propio",
  "sin_inventario",
  "pedidos",
  "mixto",
]);

export const supplierTypeEnum = pgEnum("supplier_type", [
  "generic",
  "regular",
  "internal",
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "pending",
  "received",
  "cancelled",
]);
