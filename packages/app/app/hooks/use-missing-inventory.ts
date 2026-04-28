import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";

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
  const response = await api.reports["missing-inventory"].get({
    query: filters,
  });
  return extractData<MissingInventoryItem[]>(response);
}

export function useMissingInventory(filters?: MissingInventoryFilters) {
  return useQuery({
    queryKey: ["reports", "missing-inventory", filters],
    queryFn: () => getMissingInventory(filters),
  });
}
