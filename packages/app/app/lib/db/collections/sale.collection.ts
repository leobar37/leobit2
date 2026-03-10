import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { saleSchema } from "../schemas/sale";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

export const saleCollection = createCollection(
  electricCollectionOptions({
    id: "sales",
    schema: saleSchema,
    getKey: (sale) => sale.id,
    shapeOptions: createShapeOptions("sales"),
    onInsert: async ({ transaction }) => {
      const newSale = transaction.mutations[0].modified;
      const response = await api.sales.post({
        clientId: newSale.clientId || undefined,
        saleType: newSale.saleType,
        totalAmount: parseFloat(newSale.totalAmount),
        amountPaid: parseFloat(newSale.amountPaid),
        tara: newSale.tara ? parseFloat(newSale.tara) : undefined,
        netWeight: newSale.netWeight ? parseFloat(newSale.netWeight) : undefined,
        items: newSale.items?.map(item => ({
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          subtotal: parseFloat(item.subtotal),
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
      if (changes.status === "active" && original.status === "draft") {
        // Confirming a draft sale
        const response = await api.sales({ id: original.id }).confirm.post();

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { txid?: number };
        const txid = data?.txid;
        if (!txid) {
          throw new Error("No txid returned from server");
        }
        return { txid };
      }

      if (changes.status === "cancelled") {
        const response = await api.sales({ id: original.id }).cancel.post({
          reason: changes.cancelReason || "Cancelación",
          refundAmount: changes.refundAmount ? parseFloat(changes.refundAmount) : undefined,
          refundMethod: changes.refundMethod as "efectivo" | "yape" | "plin" | "transferencia" | "saldo" | undefined,
        });

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { txid?: number };
        const txid = data?.txid;
        if (!txid) {
          throw new Error("No txid returned from server");
        }
        return { txid };
      }

      return { txid: Date.now() };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      await api.sales({ id: original.id }).delete();
    },
  })
);
