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

// Sales / Transactions
export const saleTypeEnum = pgEnum("sale_type", ["contado", "credito"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["instant_sale", "pre_order"]);
export const saleStatusEnum = pgEnum("sale_status", ["draft", "confirmed", "active", "delivered", "cancelled"]);
export const paymentModeEnum = pgEnum("payment_mode", ["pago_total", "a_cuenta", "debe_todo"]);
export const refundMethodEnum = pgEnum("refund_method", [
  "efectivo",
  "yape",
  "plin",
  "transferencia",
  "saldo",
]);

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
  "tarjeta",
  "saldo",
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

export const supplierTypeEnum = pgEnum("supplier_type", [
  "generic",
  "regular",
  "internal",
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "draft",
  "pending",
  "received",
  "cancelled",
]);

export const orderPaymentStatusEnum = pgEnum("order_payment_status", [
  "sin_pago",
  "adelanto_parcial",
  "pagado_total",
  "saldo_pendiente",
]);

// Visitas (visit status for vendor distribution visits)
export const visitaStatusEnum = pgEnum("visita_status", [
  "pendiente",
  "compro",
  "no_compra",
]);
