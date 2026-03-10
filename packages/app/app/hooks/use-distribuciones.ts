import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useBusiness } from "./use-business";
import { useToast } from "@/hooks/use-toast";

export interface Distribucion {
  id: string;
  fecha: string;
  estado: "activo" | "cerrado" | "en_ruta";
  puntoVenta: string;
  kilosAsignados: number;
  kilosVendidos: number;
  montoRecaudado: number;
  vendedor?: {
    id: string;
    name: string;
  };
}

interface UseDistribucionesParams {
  fecha?: string;
}

export function useDistribuciones(params?: UseDistribucionesParams) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["distribuciones", params?.fecha],
    queryFn: async () => {
      if (!business?.id) return [];
      // TODO: Update with actual API endpoint when available
      return [] as Distribucion[];
    },
    enabled: !!business?.id,
  });
}

export function useCloseDistribucion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement actual API call
      toast({
        title: "Próximamente",
        description: "Funcionalidad en desarrollo",
      });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribuciones"] });
    },
  });
}

export function useDeleteDistribucion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement actual API call
      toast({
        title: "Próximamente",
        description: "Funcionalidad en desarrollo",
      });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribuciones"] });
    },
  });
}

export const useMiDistribucion = useDistribuciones;
