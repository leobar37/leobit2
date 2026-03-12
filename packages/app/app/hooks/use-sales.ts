// Re-export from use-sales-db for backward compatibility
export { 
  useTodaySales as useSales,
  useSale,
  useSaleItems,
  useCreateSale,
  useAddSaleItem,
  useRemoveSaleItem,
  useCancelSale,
  useTodaySalesStats,
} from "./use-sales-db";
export type { Sale } from "~/lib/db/schemas/sale";
export type { SaleItem } from "~/lib/db/schemas/sale";
export type { CancelSaleInput } from "./use-sales-db";
