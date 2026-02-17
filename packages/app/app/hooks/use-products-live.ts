import { useQuery } from "@tanstack/react-query";
import { loadProducts } from "~/lib/db/collections";

const QUERY_KEY = "products";

export function useProducts() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: loadProducts,
    staleTime: 1000 * 60 * 10,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const products = await loadProducts();
      return products.find((p) => p.id === id) || null;
    },
    enabled: !!id,
  });
}
