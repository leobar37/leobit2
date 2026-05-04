/**
 * Product Variants Hook (API-based)
 * Reactively fetch and mutate product variants using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

/** Product variant entity */
export interface ProductVariant {
  id: string;
  productId: string;
  businessId: string;
  name: string;
  sku: string | null;
  unitQuantity: string;
  price: string;
  costPrice: string;
  sortOrder: number;
  isActive: boolean;
  lowStockThreshold: string;
  criticalStockThreshold: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a product variant */
export interface CreateVariantInput {
  name: string;
  sku?: string;
  unitQuantity: number;
  price: number;
  isActive?: boolean;
}

/** Input for updating a product variant */
export interface UpdateVariantInput {
  name?: string;
  sku?: string;
  unitQuantity?: number;
  price?: number;
  isActive?: boolean;
}

/** Filters for variant queries */
export interface VariantFilters {
  isActive?: boolean;
  includeInactive?: boolean;
}

/**
 * Get all variants for a specific product
 */
export function useVariantsByProduct(productId: string, filters?: VariantFilters) {
  return useQuery({
    queryKey: [...queryKeys.variants.byProduct(productId), filters],
    queryFn: async () => {
      const response = await api.products({ id: productId }).variants.get({
        query: {
          isActive: filters?.isActive !== undefined ? String(filters.isActive) : undefined,
          includeInactive: filters?.includeInactive ? "true" : undefined,
        },
      });
      const variants = extractData<ProductVariant[]>(response);
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
  return useQuery({
    queryKey: id ? queryKeys.variants.detail(id) : ["variants", "detail"],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.variants({ id }).get();
      return extractData<ProductVariant>(response);
    },
    enabled: !!id,
  });
}

/**
 * Create a new product variant (admin only)
 */
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      input,
    }: {
      productId: string;
      input: CreateVariantInput;
    }): Promise<ProductVariant> => {
      const response = await api.products({ id: productId }).variants.post(input);
      return extractData<ProductVariant>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.variants.byProduct(variables.productId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
    },
  });
}

/**
 * Update an existing product variant (admin only)
 */
export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateVariantInput;
    }): Promise<void> => {
      const response = await api.variants({ id }).put(input);
      extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Deactivate a product variant (soft delete)
 * Sets isActive to false
 */
export function useDeactivateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api.variants({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Reorder variants by updating sortOrder
 */
export function useReorderVariants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      variantIds,
    }: {
      productId: string;
      variantIds: string[];
    }): Promise<void> => {
      const response = await api.products({ id: productId }).variants.reorder.post({ variantIds });
      extractData(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.variants.byProduct(variables.productId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
    },
  });
}

