import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useBusiness } from "./use-business";

export interface Distribucion {
  id: string;
  date: string;
  total: number;
  status: "pending" | "completed";
}

export function useDistribuciones() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["distribuciones"],
    queryFn: async () => {
      if (!business?.id) return [];
      // Placeholder - update with actual API endpoint
      return [] as Distribucion[];
    },
    enabled: !!business?.id,
  });
}

export const useMiDistribucion = useDistribuciones;
