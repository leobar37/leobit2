/**
 * Transformador para SalePaymentForm
 * Convierte entre string (UI) y number (API) para campos de pago
 */
import { createTransformer } from "../core";
import { decimalToString, decimalToNumber } from "../decimal";
import { DECIMALS } from "../../standards/decimals";

export interface SalePaymentForm {
  amountPaid: string;
}

export const salePaymentTransformer = createTransformer<SalePaymentForm>({
  amountPaid: {
    toForm: decimalToString(DECIMALS.sale.amountPaid),
    toApi: decimalToNumber,
  },
});
