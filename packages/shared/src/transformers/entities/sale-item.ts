/**
 * Transformador para SaleItem
 * Nivel 3 de abstracción: Combina core + decimal para entidad específica
 */
import { createTransformer } from "../core";
import { decimalToString, decimalToNumber } from "../decimal";
import { DECIMALS } from "../../standards/decimals";
import type { SaleItem } from "../../schema";

export const saleItemTransformer = createTransformer<SaleItem>({
  quantity: {
    toForm: decimalToString(DECIMALS.saleItem.quantity),
    toApi: decimalToNumber,
  },
  orderedQuantity: {
    toForm: decimalToString(DECIMALS.saleItem.orderedQuantity),
    toApi: decimalToNumber,
  },
  deliveredQuantity: {
    toForm: decimalToString(DECIMALS.saleItem.deliveredQuantity),
    toApi: decimalToNumber,
  },
  unitPrice: {
    toForm: decimalToString(DECIMALS.saleItem.unitPrice),
    toApi: decimalToNumber,
  },
  unitPriceQuoted: {
    toForm: decimalToString(DECIMALS.saleItem.unitPriceQuoted),
    toApi: decimalToNumber,
  },
  unitPriceFinal: {
    toForm: decimalToString(DECIMALS.saleItem.unitPriceFinal),
    toApi: decimalToNumber,
  },
  subtotal: {
    toForm: decimalToString(DECIMALS.saleItem.subtotal),
    toApi: decimalToNumber,
  },
  costPriceSnapshot: {
    toForm: decimalToString(DECIMALS.saleItem.costPriceSnapshot),
    toApi: decimalToNumber,
  },
  originalQuantity: {
    toForm: decimalToString(DECIMALS.saleItem.originalQuantity),
    toApi: decimalToNumber,
  },
});
