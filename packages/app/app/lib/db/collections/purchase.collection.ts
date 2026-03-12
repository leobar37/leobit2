import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { purchaseSchema } from "../schema";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

// @ts-ignore - electricCollectionOptions types are not fully aligned
export const purchaseCollection = createCollection(
  // @ts-ignore
  electricCollectionOptions({
    id: "purchases",
    schema: purchaseSchema,
    getKey: (purchase) => purchase.id,
    shapeOptions: createShapeOptions("purchases"),
    syncMode: "eager",
    startSync: true,
    onInsert: async ({ transaction }) => {
      const newPurchase = transaction.mutations[0].modified;
      const response = await api.purchases.post({
        supplierId: newPurchase.supplierId,
        purchaseDate: newPurchase.purchaseDate,
        invoiceNumber: newPurchase.invoiceNumber ?? undefined,
        receiptImageId: newPurchase.receiptImageId ?? undefined,
        notes: newPurchase.notes ?? undefined,
        items: newPurchase.items?.map(item => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          unitId: item.unitId ?? undefined,
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost),
        })) || [],
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { data: { id: string; txid?: number } };
      const txid = data?.data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }

      return { txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];

      // Handle status transitions
      if (changes.status && changes.status !== original.status) {
        const response = await api.purchases({ id: original.id }).status.put({
          status: changes.status,
        });

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { data?: { txid?: number } };
        const txid = data?.data?.txid;
        if (!txid) {
          throw new Error("No txid returned from server");
        }

        return { txid };
      }

      throw new Error("No valid changes to process");
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      const response = await api.purchases({ id: original.id }).delete();

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
  })
);
