/**
 * Product Variants Hook (Service-based)
 * Reactively fetch and mutate product variants using PGlite services (offline-first)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { ProductService } from "~/lib/services/product-service";
import type {
  ProductVariant,
  CreateVariantInput,
  UpdateVariantInput,
} from "~/lib/services/product-service";

const QUERY_KEYS = {
  variants: (productId: string) => ["products", productId, "variants"],
  variant: (id: string) => ["variants", id],
  variantInventory: (variantId: string) => ["variants", variantId, "inventory"],
} as const;

export interface VariantFilters {
  isActive?: boolean;
  includeInactive?: boolean;
}

/**
 * Get all variants for a specific product
 */
export function useVariantsByProduct(productId: string, filters?: VariantFilters) {
  const engine = useSyncEngine();
  const productService = engine.use("products", () => new ProductService(engine));

  return useQuery({
    queryKey: [...QUERY_KEYS.variants(productId), filters],
    queryFn: async () => {
      const variants = await productService.getVariants(productId);
      if (filters?.isActive !== undefined && !filters.includeInactive) {
        return variants.filter((v) => v.isActive === filters.isActive);
      }
      return variants;
    },
    enabled: !!productId,
  });
}

/**
 * Get a single variant by ID
 */
export function useVariant(id: string | null) {
  const engine = useSyncEngine();
  const productService = engine.use("products", () => new ProductService(engine));

  return useQuery({
    queryKey: id ? QUERY_KEYS.variant(id) : ["variants", "detail"],
    queryFn: async () => {
      if (!id) return null;
      return productService.findVariantById(id);
    },
    enabled: !!id,
  });
}

/**
 * Create a new product variant (admin only)
 * Queues sync operation when offline
 */
export function useCreateVariant() {
  const engine = useSyncEngine();
  const productService = engine.use("products", () => new ProductService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      input,
    }: {
      productId: string;
      input: CreateVariantInput;
    }): Promise<ProductVariant> => {
      return productService.createVariant({ ...input, productId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.variants(variables.productId),
      });
    },
  });
}

/**
 * Update an existing product variant (admin only)
 * Queues sync operation when offline
 */
export function useUpdateVariant() {
  const engine = useSyncEngine();
  const productService = engine.use("products", () => new ProductService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateVariantInput;
    }): Promise<void> => {
      return productService.updateVariant(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * Deactivate a product variant (soft delete)
 * Sets isActive to false
 */
export function useDeactivateVariant() {
  const engine = useSyncEngine();
  const productService = engine.use("products", () => new ProductService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return productService.updateVariant(id, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * Reorder variants by updating sortOrder
 */
export function useReorderVariants() {
  const engine = useSyncEngine();
  const productService = engine.use("products", () => new ProductService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      variantIds,
    }: {
      productId: string;
      variantIds: string[];
    }): Promise<void> => {
      const updates = variantIds.map((variantId, index) =>
        productService.updateVariant(variantId, { sortOrder: index })
      );
      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.variants(variables.productId),
      });
    },
  });
}

// Re-export types for convenience
export type { ProductVariant, CreateVariantInput, UpdateVariantInput };
