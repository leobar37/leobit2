import { useLiveQuery, eq } from "@tanstack/react-db";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderCollection, orderItemCollection } from "~/lib/db/collections";
import { generateId } from "~/lib/utils";
import { handleCollectionError } from "~/lib/db/error-handler";
import type { Order, OrderItem } from "~/lib/db/schemas/order";

const ORDERS_KEY = "orders";

/**
 * Hook to get all orders for a business using live queries
 * Automatically updates when orders change
 */
export function useOrders() {
  return useLiveQuery(
    (q) =>
      q
        .from({ o: orderCollection })
        .orderBy(({ o }) => o.createdAt, "desc")
  );
}

/**
 * Hook to get a single order by ID using live queries
 * Automatically updates when the order changes
 */
export function useOrder(id: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ o: orderCollection })
        .where(({ o }) => eq(o.id, id)),
    [id]
  );
}

/**
 * Hook to create a new order
 * Works offline - will sync automatically when online
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      clientId: string;
      deliveryDate: string;
      paymentIntent: "contado" | "credito";
      businessId: string;
    }) => {
      try {
        const newOrder: Order = {
          id: generateId(),
          clientId: input.clientId,
          deliveryDate: input.deliveryDate,
          paymentIntent: input.paymentIntent,
          status: "draft",
          totalAmount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        orderCollection.insert(newOrder);
        return newOrder;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

/**
 * Hook to create an empty draft order
 * Used when clicking "New" button - creates draft and returns ID for navigation
 */
export function useCreateEmptyDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const deliveryDate = tomorrow.toISOString().slice(0, 10);

        const newOrder: Order = {
          id: generateId(),
          clientId: "", // Empty initially - user will select
          deliveryDate,
          paymentIntent: "contado",
          status: "draft",
          totalAmount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await orderCollection.insert(newOrder);
        return newOrder;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

/**
 * Hook to update an order
 * Works offline - will sync automatically when online
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      changes,
    }: {
      id: string;
      changes: Partial<Order>;
    }) => {
      try {
        orderCollection.update(id, (draft) => {
          Object.assign(draft, changes);
          draft.updatedAt = new Date().toISOString();
        });
        return { id, ...changes };
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.id] });
    },
  });
}

/**
 * Hook to cancel an order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      try {
        orderCollection.update(orderId, (draft) => {
          draft.status = "cancelled";
          draft.updatedAt = new Date().toISOString();
        });
        return { id: orderId, status: "cancelled" };
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
    },
  });
}

/**
 * Hook to get order items for a specific order
 */
export function useOrderItems(orderId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ i: orderItemCollection })
        .where(({ i }) => eq(i.orderId, orderId)),
    [orderId]
  );
}

/**
 * Hook to add an item to an order
 */
export function useAddOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      item,
    }: {
      orderId: string;
      item: Omit<OrderItem, "id" | "orderId" | "createdAt" | "updatedAt">;
    }) => {
      try {
        const newItem: OrderItem = {
          id: generateId(),
          orderId,
          ...item,
        };

        orderItemCollection.insert(newItem);

        // Update order total
        const { data: items } = useOrderItems(orderId);
        const total =
          (items || []).reduce(
            (sum, i) => sum + i.orderedQuantity * i.unitPriceQuoted,
            0
          ) ||
          item.orderedQuantity * item.unitPriceQuoted;

        orderCollection.update(orderId, (draft) => {
          draft.totalAmount = total;
          draft.updatedAt = new Date().toISOString();
        });

        return newItem;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [ORDERS_KEY, variables.orderId, "items"],
      });
    },
  });
}

/**
 * Hook to remove an item from an order
 */
export function useRemoveOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
    }: {
      orderId: string;
      itemId: string;
    }) => {
      try {
        orderItemCollection.delete(itemId);

        // Update order total
        const { data: items } = useOrderItems(orderId);
        const total = (items || []).reduce(
          (sum, i) => sum + i.orderedQuantity * i.unitPriceQuoted,
          0
        );

        orderCollection.update(orderId, (draft) => {
          draft.totalAmount = total;
          draft.updatedAt = new Date().toISOString();
        });

        return { orderId, itemId };
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [ORDERS_KEY, variables.orderId, "items"],
      });
    },
  });
}

/**
 * Hook to confirm an order (change status from draft to confirmed)
 */
export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      try {
        orderCollection.update(orderId, (draft) => {
          draft.status = "confirmed";
          draft.updatedAt = new Date().toISOString();
        });
        return { id: orderId, status: "confirmed" };
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
    },
  });
}

/**
 * Hook to mark an order as delivered
 */
export function useDeliverOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      try {
        orderCollection.update(orderId, (draft) => {
          draft.status = "delivered";
          draft.updatedAt = new Date().toISOString();
        });
        return { id: orderId, status: "delivered" };
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
    },
  });
}

/**
 * Hook to delete an order (only for empty/draft orders)
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      try {
        orderCollection.delete(orderId);
        return { id: orderId };
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}
