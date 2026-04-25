/**
 * Products Hook (Service-based)
 * Reactively fetch and mutate products using PGlite services (offline-first)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEngineService } from "@avileo/drizzle-sync/react";
import { ProductService } from "~/lib/services/product-service";
import type { Product, CreateProductInput, UpdateProductInput } from "~/lib/services/product-service";

const QUERY_KEYS = {
  products: ["products"],
  product: (id: string) => ["products", id],
} as const;

/**
 * Get all products for the current business
 */
export function useProducts() {
  const productService = useEngineService<ProductService>("products");

  return useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: async () => {
      return productService.findByBusiness();
    },
  });
}

/**
 * Get a single product by ID
 */
export function useProduct(id: string | null) {
  const productService = useEngineService<ProductService>("products");

  return useQuery({
    queryKey: id ? QUERY_KEYS.product(id) : ["products", "detail"],
    queryFn: async () => {
      if (!id) return null;
      return productService.findById(id);
    },
    enabled: !!id,
  });
}

/**
 * Create a new product (admin only)
 * Queues sync operation when offline
 */
export function useCreateProduct() {
  const productService = useEngineService<ProductService>("products");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput): Promise<Product> => {
      return productService.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });
}

/**
 * Update an existing product (admin only)
 * Queues sync operation when offline
 */
export function useUpdateProduct() {
  const productService = useEngineService<ProductService>("products");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateProductInput;
    }): Promise<void> => {
      return productService.update(id, input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });
}

// Re-export types for convenience
export type { Product, CreateProductInput, UpdateProductInput };
