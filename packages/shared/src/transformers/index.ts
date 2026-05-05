/**
 * Sistema de transformadores de decimales
 * 
 * 3 niveles de abstracción:
 * 1. Core (core.ts): Factory genérica createTransformer
 * 2. Decimal (decimal.ts): decimalToNumber, decimalToString
 * 3. Entidades: Transformadores por cada entidad del dominio
 * 
 * Uso:
 * import { saleItemTransformer } from "@avileo/shared";
 * 
 * const uiItem = saleItemTransformer.toForm(backendItem);
 * const apiPayload = saleItemTransformer.toApi(formValues);
 * const numbers = saleItemTransformer.toNumbers(item);
 */

export { createTransformer } from "./core";
export type { Transformer, FieldTransform, TransformConfig } from "./core";

export {
  decimalToNumber,
  decimalToString,
  normalizeToStrings,
  normalizeToNumbers,
} from "./decimal";

export { saleItemTransformer } from "./entities/sale-item";
export { purchaseItemTransformer } from "./entities/purchase-item";
export { distribucionItemTransformer } from "./entities/distribucion-item";
export { saleTransformer } from "./entities/sale";
export { salePaymentTransformer } from "./entities/sale-payment";
