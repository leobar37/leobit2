/**
 * Transformador para Sale
 */
import { createTransformer } from "../core";
import { decimalToString, decimalToNumber } from "../decimal";
import { DECIMALS } from "../../standards/decimals";
import type { Sale } from "../../schema";

export const saleTransformer = createTransformer<Sale>({
  totalAmount: {
    toForm: decimalToString(DECIMALS.sale.totalAmount),
    toApi: decimalToNumber,
  },
  amountPaid: {
    toForm: decimalToString(DECIMALS.sale.amountPaid),
    toApi: decimalToNumber,
  },
  balanceDue: {
    toForm: decimalToString(DECIMALS.sale.balanceDue),
    toApi: decimalToNumber,
  },
  tara: {
    toForm: decimalToString(DECIMALS.sale.tara),
    toApi: decimalToNumber,
  },
  netWeight: {
    toForm: decimalToString(DECIMALS.sale.netWeight),
    toApi: decimalToNumber,
  },
  refundAmount: {
    toForm: decimalToString(DECIMALS.sale.refundAmount),
    toApi: decimalToNumber,
  },
});
