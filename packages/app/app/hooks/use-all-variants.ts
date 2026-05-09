/**
 * All Variants Hook
 * Fetches all active product variants for the business
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

export interface ProductVariantWithProduct {
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
  productName?: string;
}

/**
 * Get all variants across all products
 */
export function useAllVariants() {
  return useQuery({
    queryKey: PERSISTED_REMOTE_QUERY_KEYS.variants.all,
    queryFn: async () => {
      // First get all products
      const productsResponse = await api.products.get();
      const products = extractData<
        Array<{
          id: string;
          name: string;
          hasVariants: boolean;
          isActive: boolean;
        }>
      >(productsResponse);

      // Fetch variants for each product in parallel
      const activeProducts = products.filter((p) => p.isActive && p.hasVariants);
      const variantsResults = await Promise.all(
        activeProducts.map(async (product) => {
          const response = await api.products({ id: product.id }).variants.get({
            query: { isActive: "true" },
          });
          const variants = extractData<ProductVariantWithProduct[]>(response);
          return variants.map((v) => ({
            ...v,
            productName: product.name,
          }));
        })
      );

      return variantsResults.flat();
    },
  });
}
