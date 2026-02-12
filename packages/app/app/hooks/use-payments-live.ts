import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadPayments, createPayment, deletePayment } from "~/lib/db/collections";

const QUERY_KEY = "payments";

export function usePayments() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: loadPayments,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
