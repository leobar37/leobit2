/**
 * Inventory Hooks (Variant-based, offline-first)
 * Reactively fetch and validate inventory using PGlite services
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { InventoryService } from "~/lib/services/inventory-service";
import type {
  VariantInventoryItem,
  StockValidationResult,
} from "~/lib/services/inventory-service";

const QUERY_KEYS = {
  variantInventory: (variantId: string) => ["variant-inventory", variantId],
  allVariantInventory: ["variant-inventory"],
} as const;

/**
 * Get all variant inventory items for the business
 */
export function useVariantInventory() {
  const engine = useSyncEngine();
  const inventoryService = engine.use("inventory", () => new InventoryService(engine));

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
  const engine = useSyncEngine();
  const inventoryService = engine.use("inventory", () => new InventoryService(engine));

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
  const engine = useSyncEngine();
  const inventoryService = engine.use("inventory", () => new InventoryService(engine));

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
 * Batch validate stock for multiple items (cart validation)
 */
export function useValidateBatchStock() {
  const engine = useSyncEngine();
  const inventoryService = engine.use("inventory", () => new InventoryService(engine));

  return useMutation({
    mutationFn: async (
      items: Array<{ variantId: string; requestedQty: number }>
    ): Promise<StockValidationResult[]> => {
      return inventoryService.validateBatchStock(items);
    },
  });
}

// Re-export types for convenience
export type { VariantInventoryItem, StockValidationResult };
