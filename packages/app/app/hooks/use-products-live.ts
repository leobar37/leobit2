import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface Product {
  id: string;
  name: string;
  type: "pollo" | "huevo" | "otro";
  unit: "kg" | "unidad";
  basePrice: string;
  isActive: boolean;
}

export function useProductsLive() {
  return useQuery({
    queryKey: ["products-live"],
    queryFn: async () => {
      const res = await api.products.get();
      if (res.data?.success) {
        return res.data.data as Product[];
      }
      return [];
    },
  });
}
