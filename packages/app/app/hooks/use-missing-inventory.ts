import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface MissingInventoryItem {
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  totalSold: string;
  currentStock: string;
  needed: string;
}

export interface MissingInventoryFilters {
  startDate?: string;
  endDate?: string;
}

async function getMissingInventory(
  filters?: MissingInventoryFilters
): Promise<MissingInventoryItem[]> {
  const { data, error } = await api.reports["missing-inventory"].get({
    query: filters,
  });

  if (error) {
    throw new Error(String(error.value));
  }

  return (data as any).data as MissingInventoryItem[];
}

export function useMissingInventory(filters?: MissingInventoryFilters) {
  return useQuery({
    queryKey: ["reports", "missing-inventory", filters],
    queryFn: () => getMissingInventory(filters),
  });
}
