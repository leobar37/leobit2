/**
 * Product Categories Hook (API-based)
 * Reactively fetch and mutate product categories using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export interface ProductCategory {
  id: string;
  name: string;
  color: string;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductCategoryInput {
  name: string;
  color?: string;
}

export interface UpdateProductCategoryInput {
  name?: string;
  color?: string;
}

/**
 * Get all product categories for the current business
 */
export function useProductCategories() {
  return useQuery({
    queryKey: queryKeys.productCategories.all,
    queryFn: async () => {
      const response = await api["product-categories"].get();
      return extractData<ProductCategory[]>(response);
    },
  });
}

/**
 * Get a single product category by ID
 */
export function useProductCategory(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.productCategories.detail(id) : ["product-categories", "detail"],
    queryFn: async () => {
      if (!id) return null;
      const response = await api["product-categories"]({ id }).get();
      return extractData<ProductCategory>(response);
    },
    enabled: !!id,
  });
}

/**
 * Create a new product category
 */
export function useCreateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductCategoryInput): Promise<ProductCategory> => {
      const response = await api["product-categories"].post(input);
      return extractData<ProductCategory>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productCategories.all });
    },
  });
}

/**
 * Update an existing product category
 */
export function useUpdateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateProductCategoryInput;
    }): Promise<ProductCategory> => {
      const response = await api["product-categories"]({ id }).put(input);
      return extractData<ProductCategory>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.productCategories.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.productCategories.all });
    },
  });
}

/**
 * Delete a product category
 */
export function useDeleteProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api["product-categories"]({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.productCategories.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.productCategories.all });
    },
  });
}
