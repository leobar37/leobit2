// Re-export from use-sales-db for backward compatibility
export { 
  useTodaySales as useSales,
  useSale,
  useSaleWithCustomer,
  useSaleItems,
  useCreateSale,
  useAddSaleItem,
  useRemoveSaleItem,
  useCancelSale,
  useTodaySalesStats,
} from "./use-sales-db";
export type { Sale } from "~/lib/db/schemas/sale";
export type { SaleItem } from "~/lib/db/schemas/sale";

// Export additional types for backward compatibility
export interface CancelSaleInput {
  reason: string;
  refundAmount?: number;
  refundMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "saldo";
}
