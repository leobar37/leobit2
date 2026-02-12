import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import type { Sale, CreateSaleInput } from "~/lib/db/schema";

const QUERY_KEY = "sales";

export function useSales() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await api.sales.get();
      if (error) throw new Error(String(error.value));
      return (data as { data: Sale[] })?.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data, error } = await api.sales({ id }).get();
      if (error) throw new Error(String(error.value));
      return (data as { data: Sale })?.data;
    },
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const { data, error } = await api.sales.post(input);
      if (error) throw new Error(String(error.value));
      return (data as { data: Sale })?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useTodayStats() {
  return useQuery({
    queryKey: ["sales", "today-stats"],
    queryFn: async () => {
      const { data, error } = await api.sales["today-stats"].get();
      if (error) throw new Error(String(error.value));
      return (data as { data: { count: number; total: string } })?.data;
    },
    staleTime: 1000 * 60 * 1,
  });
}
