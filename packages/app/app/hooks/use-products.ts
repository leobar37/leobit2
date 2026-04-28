/**
 * Products Hook (API-based)
 * Reactively fetch and mutate products using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export interface Product {
  id: string;
  businessId: string;
  name: string;
  type: string;
  unit: string;
  basePrice: string;
  costPrice: string;
  isActive: boolean;
  hasVariants: boolean;
  imageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  type?: "pollo" | "huevo" | "otro";
  unit: "kg" | "unidad";
  basePrice: string;
  costPrice?: string;
  isActive?: boolean;
  imageId?: string;
  hasVariants?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  type?: "pollo" | "huevo" | "otro";
  unit?: "kg" | "unidad";
  basePrice?: string;
  costPrice?: string;
  isActive?: boolean;
  imageId?: string | null;
}

/**
 * Get all products for the current business
 */
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const response = await api.products.get();
      return extractData<Product[]>(response);
    },
  });
}

/**
 * Get a single product by ID
 */
export function useProduct(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.products.detail(id) : ["products", "detail"],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.products({ id }).get();
      return extractData<Product>(response);
    },
    enabled: !!id,
  });
}

/**
 * Create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput): Promise<Product> => {
      const response = await api.products.post(input);
      return extractData<Product>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Update an existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateProductInput;
    }): Promise<Product> => {
      const response = await api.products({ id }).put(input);
      return extractData<Product>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
