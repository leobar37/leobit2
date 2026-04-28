import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";

export interface StockAlert {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  currentStock: string;
  lowThreshold: string;
  criticalThreshold: string;
  alertType: "negative" | "critical" | "low";
  suggestedQuantity: string;
}

async function getStockAlerts(): Promise<StockAlert[]> {
  const response = await api.reports["stock-alerts"].get();
  return extractData<StockAlert[]>(response);
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ["reports", "stock-alerts"],
    queryFn: () => getStockAlerts(),
  });
}
