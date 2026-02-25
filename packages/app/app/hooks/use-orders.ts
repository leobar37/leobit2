import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import type { Order, CreateOrderInput } from "~/lib/db/schema";
import { syncClient } from "~/lib/sync/client";
import { createSyncId, isOnline } from "~/lib/sync/utils";

const QUERY_KEY = "orders";

export function useOrders(filters?: {
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
  status?: "draft" | "confirmed" | "cancelled" | "delivered";
}) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      const { data, error } = await api.orders.get({
        query: {
          ...(filters?.deliveryDateFrom && { deliveryDateFrom: filters.deliveryDateFrom }),
          ...(filters?.deliveryDateTo && { deliveryDateTo: filters.deliveryDateTo }),
          ...(filters?.status && { status: filters.status }),
        },
      });
      if (error) throw new Error(String(error.value));
      return (data as { data: Order[] })?.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data, error } = await api.orders({ id }).get();
      if (error) throw new Error(String(error.value));
      return (data as { data: Order })?.data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      if (!isOnline()) {
        const tempId = createSyncId();

        await syncClient.enqueueOperation({
          entity: "orders",
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
          businessId: "",
          clientId: input.clientId,
          sellerId: "",
          deliveryDate: input.deliveryDate,
          orderDate: new Date().toISOString().split("T")[0],
          status: "draft" as const,
          paymentIntent: input.paymentIntent,
          totalAmount: input.totalAmount.toFixed(2),
          confirmedSnapshot: null,
          deliveredSnapshot: null,
          version: 1,
          syncStatus: "pending" as const,
          syncAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: input.items.map((item) => ({
            id: createSyncId(),
            orderId: tempId,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            orderedQuantity: item.orderedQuantity.toString(),
            deliveredQuantity: null,
            unitPriceQuoted: item.unitPriceQuoted.toFixed(2),
            unitPriceFinal: null,
            isModified: false,
            originalQuantity: null,
          })),
        } as Order;
      }

      const { data, error } = await api.orders.post(input);
      if (error) throw new Error(String(error.value));
      return (data as { data: Order })?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: {
        baseVersion: number;
        deliveryDate?: string;
        paymentIntent?: "contado" | "credito";
        totalAmount?: number;
        items?: CreateOrderInput["items"];
      };
    }) => {
      if (!isOnline()) {
        await syncClient.enqueueOperation({
          entity: "orders",
          operation: "update",
          entityId: id,
          data: input,
          lastError: undefined,
        });
        return null;
      }

      const { data, error } = await api.orders({ id }).put(input);
      if (error) throw new Error(String(error.value));
      return (data as { data: Order })?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
}

export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      baseVersion,
    }: {
      id: string;
      baseVersion: number;
    }) => {
      if (!isOnline()) {
        await syncClient.enqueueOperation({
          entity: "orders",
          operation: "update",
          entityId: id,
          data: { baseVersion, status: "confirmed" },
          lastError: undefined,
        });
        return null;
      }

      const { data, error } = await api.orders({ id }).confirm.post({ baseVersion });
      if (error) throw new Error(String(error.value));
      return (data as { data: Order })?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      baseVersion,
    }: {
      id: string;
      baseVersion: number;
    }) => {
      if (!isOnline()) {
        await syncClient.enqueueOperation({
          entity: "orders",
          operation: "delete",
          entityId: id,
          data: { baseVersion },
          lastError: undefined,
        });
        return null;
      }

      const { data, error } = await api.orders({ id }).cancel.post({ baseVersion });
      if (error) throw new Error(String(error.value));
      return (data as { data: Order })?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
}

export function useDeliverOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      baseVersion,
      deliveredItems,
    }: {
      id: string;
      baseVersion: number;
      deliveredItems: Array<{
        itemId: string;
        deliveredQuantity: number;
        unitPriceFinal?: number;
      }>;
    }) => {
      const { data, error } = await api.orders({ id }).deliver.post({
        baseVersion,
        deliveredItems,
      });
      if (error) throw new Error(String(error.value));
      return (data as { data: { order: Order; sale: unknown } })?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export function useModifyOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      newQuantity,
      baseVersion,
    }: {
      orderId: string;
      itemId: string;
      newQuantity: number;
      baseVersion: number;
    }) => {
      const { data, error } = await api
        .orders({ id: orderId })
        .items({ itemId })
        .patch({ newQuantity, baseVersion });
      if (error) throw new Error(String(error.value));
      return (data as { data: { order: Order; item: unknown } })?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.orderId] });
    },
  });
}
