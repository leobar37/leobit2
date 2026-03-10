import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { orderSchema } from "../schemas/order";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

/**
 * Order collection for offline-first order management.
 * Uses status field for workflow (draft -> confirmed -> delivered/cancelled).
 */
export const orderCollection = createCollection(
  electricCollectionOptions({
    id: "orders",
    schema: orderSchema,
    getKey: (order) => order.id,
    shapeOptions: createShapeOptions("orders"),
    onInsert: async ({ transaction }) => {
      const newOrder = transaction.mutations[0].modified;

      // Skip server sync for drafts without a client (incomplete drafts stay local only)
      if (!newOrder.clientId) {
        // Return a local txid - will sync later when client is assigned
        return { txid: Date.now() };
      }

      // Use main orders endpoint - backend creates with status="draft" by default
      const payload = {
        clientId: newOrder.clientId,
        deliveryDate: newOrder.deliveryDate,
        paymentIntent: newOrder.paymentIntent,
        totalAmount: newOrder.totalAmount || 0,
        items: [], // Items added separately via orderItemCollection
      };

      const response = await api.orders.post(payload);

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { txid?: number };
      const txid = data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }
      return { txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];

      // If this was a local-only draft and now has a client, create it on the server
      if (changes.clientId && !original.clientId) {
        const response = await api.orders.post({
          id: original.id,
          clientId: changes.clientId,
          deliveryDate: original.deliveryDate,
          paymentIntent: original.paymentIntent,
          totalAmount: original.totalAmount || 0,
          items: [],
        });

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }

      // Handle draft -> confirmed transition
      if (changes.status === "confirmed" && original.status === "draft") {
        const response = await api.orders({ id: original.id }).confirm.post({
          baseVersion: original.version || 1,
        });

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }

      // Handle cancelled status
      if (changes.status === "cancelled") {
        const response = await api.orders({ id: original.id }).cancel.post({
          baseVersion: original.version || 1,
        });

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }

      // Regular update for other changes
      const response = await api.orders({ id: original.id }).patch({
        clientId: changes.clientId,
        deliveryDate: changes.deliveryDate,
        paymentIntent: changes.paymentIntent,
        totalAmount: changes.totalAmount,
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { txid?: number };
      return { txid: data?.txid || Date.now() };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      // Use DELETE endpoint for hard delete (only allowed for empty/draft orders)
      const response = await api.orders({ id: original.id }).delete({
        baseVersion: original.version || 1,
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
  })
);
