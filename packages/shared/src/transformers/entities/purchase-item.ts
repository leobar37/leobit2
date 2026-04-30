/**
 * Transformador para PurchaseItem
 */
import { createTransformer } from "../core";
import { decimalToString, decimalToNumber } from "../decimal";
import { DECIMALS } from "../../standards/decimals";
import type { PurchaseItem } from "../../schema";

export const purchaseItemTransformer = createTransformer<PurchaseItem>({
  quantity: {
    toForm: decimalToString(DECIMALS.purchaseItem.quantity),
    toApi: decimalToNumber,
  },
  unitCost: {
    toForm: decimalToString(DECIMALS.purchaseItem.unitCost),
    toApi: decimalToNumber,
  },
  totalCost: {
    toForm: decimalToString(DECIMALS.purchaseItem.totalCost),
    toApi: decimalToNumber,
  },
});
