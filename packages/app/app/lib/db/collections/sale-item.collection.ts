import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { saleItemSchema } from "../schemas/sale";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

/**
 * Sale Item collection for atomic item management.
 * Each item is a separate entity that can be created, updated, or deleted independently.
 */
export const saleItemCollection = createCollection(
  electricCollectionOptions({
    id: "sale_items",
    schema: saleItemSchema,
    getKey: (item) => item.id,
    shapeOptions: createShapeOptions("sale_items"),
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified;
      
      // Call API to add item to sale
      const response = await api
        .sales({ id: newItem.saleId })
        .items.post({
          productId: newItem.productId,
          variantId: newItem.variantId,
          productName: newItem.productName,
          variantName: newItem.variantName,
          quantity: parseFloat(newItem.quantity),
          unitPrice: parseFloat(newItem.unitPrice),
          subtotal: parseFloat(newItem.subtotal),
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
      
      const response = await api
        .sales({ id: original.saleId })
        .items({ itemId: original.id })
        .patch({
          quantity: changes.quantity ? parseFloat(changes.quantity) : undefined,
          unitPrice: changes.unitPrice ? parseFloat(changes.unitPrice) : undefined,
          subtotal: changes.subtotal ? parseFloat(changes.subtotal) : undefined,
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
        .sales({ id: original.saleId })
        .items({ itemId: original.id })
        .delete();

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
  })
);
