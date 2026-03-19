/**
 * Inventory Hook (Service-based)
 * Reactively fetch and validate inventory using PGlite services (offline-first)
 *
 * @deprecated Use useVariantInventory, useVariantInventoryItem, useValidateVariantStock instead
 * Product-level inventory (inventory table) is deprecated. All operations should use variantInventory.
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { useInventoryService } from "~/lib/sync/service-provider";
import type {
  InventoryItem,
  VariantInventoryItem,
  StockValidationResult,
} from "~/lib/services/inventory-service";

const QUERY_KEYS = {
  variantInventory: (variantId: string) => ["variant-inventory", variantId],
  allVariantInventory: ["variant-inventory"],
} as const;

/**
 * @deprecated Use useVariantInventory instead
 * Product-level inventory is deprecated
 */
export function useInventory() {
  console.warn("useInventory is deprecated. Use useVariantInventory instead.");
  return useVariantInventory();
}

/**
 * @deprecated Use useVariantInventoryItem with variantId instead
 * Product-level inventory is deprecated
 */
export function useInventoryItem(productId: string | null) {
  console.warn("useInventoryItem is deprecated. Use useVariantInventoryItem with variantId instead.");
  return useVariantInventoryItem(null);
}

/**
 * Get all variant inventory items for the business
 */
export function useVariantInventory() {
  const inventoryService = useInventoryService();

  return useQuery({
    queryKey: QUERY_KEYS.allVariantInventory,
    queryFn: async () => {
      return inventoryService.getAllVariantInventory();
    },
  });
}

/**
 * Get inventory for a specific variant
 */
export function useVariantInventoryItem(variantId: string | null) {
  const inventoryService = useInventoryService();

  return useQuery({
    queryKey: variantId ? QUERY_KEYS.variantInventory(variantId) : ["variant-inventory", "detail"],
    queryFn: async () => {
      if (!variantId) return null;
      return inventoryService.getInventoryForVariant(variantId);
    },
    enabled: !!variantId,
  });
}

/**
 * Validate stock availability for a variant (for sales)
 */
export function useValidateVariantStock() {
  const inventoryService = useInventoryService();

  return useMutation({
    mutationFn: async ({
      variantId,
      requestedQty,
    }: {
      variantId: string;
      requestedQty: number;
    }): Promise<StockValidationResult> => {
      return inventoryService.validateVariantStock(variantId, requestedQty);
    },
  });
}

/**
 * @deprecated Use useValidateVariantStock with variantId instead
 * Product-level stock validation is deprecated
 */
export function useValidateProductStock() {
  console.warn("useValidateProductStock is deprecated. Use useValidateVariantStock with variantId instead.");
  return useValidateVariantStock();
}

/**
 * Batch validate stock for multiple items (cart validation)
 */
export function useValidateBatchStock() {
  const inventoryService = useInventoryService();

  return useMutation({
    mutationFn: async (
      items: Array<{ variantId: string; requestedQty: number }>
    ): Promise<StockValidationResult[]> => {
      return inventoryService.validateBatchStock(items);
    },
  });
}

// Re-export types for convenience
export type { InventoryItem, VariantInventoryItem, StockValidationResult };
