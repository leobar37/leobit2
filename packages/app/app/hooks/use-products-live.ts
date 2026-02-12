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
