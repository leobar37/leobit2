/**
 * Transformador para DistribucionItem
 */
import { createTransformer } from "../core";
import { decimalToString, decimalToNumber } from "../decimal";
import { DECIMALS } from "../../standards/decimals";
import type { DistribucionItem } from "../../schema";

export const distribucionItemTransformer = createTransformer<DistribucionItem>({
  cantidadAsignada: {
    toForm: decimalToString(DECIMALS.distribucionItem.cantidadAsignada),
    toApi: decimalToNumber,
  },
  cantidadVendida: {
    toForm: decimalToString(DECIMALS.distribucionItem.cantidadVendida),
    toApi: decimalToNumber,
  },
});
