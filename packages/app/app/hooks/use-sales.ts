import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import type { Sale, CreateSaleInput } from "~/lib/db/schema";
import { syncClient } from "~/lib/sync/client";
import { createSyncId, isOnline } from "~/lib/sync/utils";

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
      if (!isOnline()) {
        const tempId = createSyncId();

        await syncClient.enqueueOperation({
          entity: "sales",
          operation: "insert",
          entityId: tempId,
          data: {
            ...input,
            tempId,
          },
          lastError: undefined,
        });

        return {
          id: tempId,
          clientId: input.clientId ?? null,
          sellerId: "",
          businessId: "",
          saleType: input.saleType,
          totalAmount: input.totalAmount.toString(),
          amountPaid: (input.amountPaid ?? 0).toString(),
          balanceDue:
            input.saleType === "credito"
              ? Math.max(input.totalAmount - (input.amountPaid ?? 0), 0).toString()
              : "0",
          tara: input.tara?.toString() ?? null,
          netWeight: input.netWeight?.toString() ?? null,
          syncStatus: "pending",
          saleDate: new Date(),
          createdAt: new Date(),
          items: input.items.map((item) => ({
            id: createSyncId(),
            saleId: tempId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            subtotal: item.subtotal.toString(),
          })),
        } as Sale;
      }

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
