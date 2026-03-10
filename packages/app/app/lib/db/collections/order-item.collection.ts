import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { orderItemSchema } from "../schemas/order";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

/**
 * Order Item collection for independent item CRUD.
 * Items can be added, updated, and removed independently of the order.
 */
export const orderItemCollection = createCollection(
  electricCollectionOptions({
    id: "order_items",
    schema: orderItemSchema,
    getKey: (item) => item.id,
    shapeOptions: createShapeOptions("order_items"),
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified;
      
      const response = await api
        .orders({ id: newItem.orderId })
        .items.post({
          productId: newItem.productId,
          variantId: newItem.variantId,
          productName: newItem.productName,
          variantName: newItem.variantName,
          orderedQuantity: newItem.orderedQuantity,
          unitPriceQuoted: newItem.unitPriceQuoted,
          baseVersion: 1, // Should be passed from context
        });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { data: { item: { id: string }; txid?: number } };
      const txid = data?.data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }
      return { txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];
      
      // Use the modify item endpoint for quantity changes
      if (changes.orderedQuantity !== undefined) {
        const response = await api
          .orders({ id: original.orderId })
          .items({ itemId: original.id })
          .patch({
            newQuantity: changes.orderedQuantity,
            baseVersion: 1,
          });

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { data: { txid?: number } };
        const txid = data?.data?.txid;
        if (!txid) {
          throw new Error("No txid returned from server");
        }
        return { txid };
      }

      // Use details endpoint for other updates
      const response = await api
        .orders({ id: original.orderId })
        .items({ itemId: original.id })
        ["details"].patch({
          orderedQuantity: changes.orderedQuantity,
          unitPriceQuoted: changes.unitPriceQuoted,
          baseVersion: 1,
        });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { data: { txid?: number } };
      const txid = data?.data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }
      return { txid };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      
      const response = await api
        .orders({ id: original.orderId })
        .items({ itemId: original.id })
        .delete({ baseVersion: 1 });

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
  })
);
