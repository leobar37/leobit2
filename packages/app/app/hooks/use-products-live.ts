import { useQuery } from "@tanstack/react-query";
import { useProductService } from "~/lib/sync/service-provider";

export interface Product {
  id: string;
  name: string;
  type: "pollo" | "huevo" | "otro";
  unit: "kg" | "unidad";
  basePrice: string;
  isActive: boolean;
}

export function useProducts() {
  const productService = useProductService();

  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      return productService.findByBusiness();
    },
  });
}

export function useProduct(id: string | null) {
  const productService = useProductService();

  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      return productService.findById(id);
    },
    enabled: !!id,
  });
}
