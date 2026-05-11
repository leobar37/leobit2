import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";

export interface WaterRoute {
  id: string;
  businessId: string;
  name: string;
  zone: string | null;
  description: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export function useWaterRoutes() {
  return useQuery({
    queryKey: ["water-routes"],
    queryFn: async () => {
      const response = await api["water-routes"].get();
      return extractData<WaterRoute[]>(response);
    },
  });
}

export function useCreateWaterRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; zone?: string | null; description?: string | null }) => {
      const response = await api["water-routes"].post(input);
      return extractData<WaterRoute>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["water-routes"] });
    },
  });
}

export function useUpdateWaterRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      zone?: string | null;
      description?: string | null;
      isActive?: boolean;
    }) => {
      const { id, ...body } = input;
      const response = await api["water-routes"]({ id }).put(body);
      return extractData<WaterRoute>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["water-routes"] });
    },
  });
}
