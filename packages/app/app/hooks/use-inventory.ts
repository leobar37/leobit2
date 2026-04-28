/**
 * Inventory Hooks (API-based)
 * Reactively fetch and validate inventory using Eden Treaty API
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

/** Inventory item for a product variant */
export interface VariantInventoryItem {
  id: string;
  variantId: string;
  quantity: string;
  updatedAt: string;
}

/** Result of stock validation */
export interface StockValidationResult {
  available: boolean;
  requestedQty: number;
  availableQty: number;
  variantId?: string;
}

/**
 * Get all variant inventory items for the business
 * @deprecated No batch inventory API endpoint exists. Consider fetching per-variant instead.
 */
export function useVariantInventory() {
  return useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: async () => {
      throw new Error("Batch inventory fetch is not supported by the API. Use useVariantInventoryItem instead.");
    },
  });
}

/**
 * Get inventory for a specific variant
 */
export function useVariantInventoryItem(variantId: string | null) {
  return useQuery({
    queryKey: variantId ? queryKeys.inventory.detail(variantId) : ["inventory", "detail"],
    queryFn: async () => {
      if (!variantId) return null;
      const response = await api.variants({ id: variantId }).inventory.get();
      return extractData<VariantInventoryItem>(response);
    },
    enabled: !!variantId,
  });
}

/**
 * Validate stock availability for a variant (for sales)
 * Fetches inventory via API and validates locally.
 */
export function useValidateVariantStock() {
  return useMutation({
    mutationFn: async ({
      variantId,
      requestedQty,
    }: {
      variantId: string;
      requestedQty: number;
    }): Promise<StockValidationResult> => {
      const response = await api.variants({ id: variantId }).inventory.get();
      const inventory = extractData<VariantInventoryItem>(response);
      const availableQty = inventory ? parseFloat(inventory.quantity) : 0;

      return {
        available: availableQty >= requestedQty,
        requestedQty,
        availableQty,
        variantId,
      };
    },
  });
}

/**
 * Batch validate stock for multiple items (cart validation)
 * Fetches inventory per variant via API and validates locally.
 */
export function useValidateBatchStock() {
  return useMutation({
    mutationFn: async (
      items: Array<{ variantId: string; requestedQty: number }>
    ): Promise<StockValidationResult[]> => {
      const results: StockValidationResult[] = [];

      for (const item of items) {
        const response = await api.variants({ id: item.variantId }).inventory.get();
        const inventory = extractData<VariantInventoryItem>(response);
        const availableQty = inventory ? parseFloat(inventory.quantity) : 0;

        results.push({
          available: availableQty >= item.requestedQty,
          requestedQty: item.requestedQty,
          availableQty,
          variantId: item.variantId,
        });
      }

      return results;
    },
  });
}


