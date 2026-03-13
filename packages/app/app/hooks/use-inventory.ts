/**
 * Inventory Hook (Service-based)
 * Reactively fetch and validate inventory using PGlite services (offline-first)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInventoryService, useProductService } from "~/lib/sync/service-provider";
import type {
  InventoryItem,
  VariantInventoryItem,
  StockValidationResult,
} from "~/lib/services/inventory-service";

const QUERY_KEYS = {
  inventory: ["inventory"],
  inventoryItem: (productId: string) => ["inventory", productId],
  variantInventory: (variantId: string) => ["variant-inventory", variantId],
  allVariantInventory: ["variant-inventory"],
} as const;

/**
 * Get all inventory items for the business
 */
export function useInventory() {
  const inventoryService = useInventoryService();

  return useQuery({
    queryKey: QUERY_KEYS.inventory,
    queryFn: async () => {
      return inventoryService.getAllInventory();
    },
  });
}

/**
 * Get inventory for a specific product
 */
export function useInventoryItem(productId: string | null) {
  const inventoryService = useInventoryService();

  return useQuery({
    queryKey: productId ? QUERY_KEYS.inventoryItem(productId) : ["inventory", "detail"],
    queryFn: async () => {
      if (!productId) return null;
      return inventoryService.getInventoryForProduct(productId);
    },
    enabled: !!productId,
  });
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
 * Validate stock availability for a product
 */
export function useValidateProductStock() {
  const inventoryService = useInventoryService();

  return useMutation({
    mutationFn: async ({
      productId,
      requestedQty,
    }: {
      productId: string;
      requestedQty: number;
    }): Promise<StockValidationResult> => {
      return inventoryService.validateProductStock(productId, requestedQty);
    },
  });
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
