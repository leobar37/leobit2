import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

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
  const { data, error } = await api.reports["stock-alerts"].get();

  if (error) {
    throw new Error(String(error.value));
  }

  return (data as any).data as StockAlert[];
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ["reports", "stock-alerts"],
    queryFn: () => getStockAlerts(),
  });
}
