import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { saleSchema, type Sale } from "../schemas/sale";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

/**
 * Unified Sale Collection
 * Supports both instant_sales and pre_orders with offline-first patterns
 *
 * Status workflows:
 * - instant_sale: draft → active → cancelled
 * - pre_order: draft → confirmed → delivered/cancelled
 */
export const saleCollection = createCollection(
  electricCollectionOptions({
    id: "sales",
    schema: saleSchema,
    getKey: (sale) => sale.id,
    shapeOptions: createShapeOptions("sales"),
    onInsert: async ({ transaction }) => {
      const newSale = transaction.mutations[0].modified as Sale;

      // Skip server sync for drafts without a client (incomplete drafts stay local only)
      // This is the offline-first pattern from orders
      if (!newSale.clientId) {
        return { txid: Date.now() };
      }

      const payload = {
        clientId: newSale.clientId,
        type: newSale.type || "instant_sale",
        saleType: newSale.saleType,
        totalAmount: parseFloat(newSale.totalAmount),
        amountPaid: parseFloat(newSale.amountPaid),
        tara: newSale.tara ? parseFloat(newSale.tara) : undefined,
        netWeight: newSale.netWeight ? parseFloat(newSale.netWeight) : undefined,
        deliveryDate: newSale.deliveryDate?.toISOString(),
        orderDate: newSale.orderDate?.toISOString(),
        // Items are synced independently via saleItemCollection (offline-first pattern)
        items: [],
      };

      const response = await api.sales.post(payload);

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
      const { original, changes } = transaction.mutations[0] as {
        original: Sale;
        changes: Partial<Sale>;
      };

      // If this was a local-only draft and now has a client, create it on the server
      if (changes.clientId && !original.clientId) {
        const payload = {
          clientId: changes.clientId,
          type: original.type || "instant_sale",
          saleType: original.saleType,
          totalAmount: parseFloat(original.totalAmount),
          amountPaid: parseFloat(original.amountPaid),
          tara: original.tara ? parseFloat(original.tara) : undefined,
          netWeight: original.netWeight ? parseFloat(original.netWeight) : undefined,
          deliveryDate: original.deliveryDate?.toISOString(),
          orderDate: original.orderDate?.toISOString(),
          items: [],
        };

        const response = await api.sales.post(payload);

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }

      // Handle instant_sale: draft → active transition
      if (changes.status === "active" && original.status === "draft" && original.type === "instant_sale") {
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

      // Handle pre_order: draft → confirmed transition
      if (changes.status === "confirmed" && original.status === "draft" && original.type === "pre_order") {
        const response = await api.sales({ id: original.id }).confirm.post({
          baseVersion: original.version,
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

      // Handle pre_order: confirmed → delivered transition
      if (changes.status === "delivered" && original.status === "confirmed" && original.type === "pre_order") {
        const response = await api.sales({ id: original.id }).deliver.post({
          baseVersion: original.version,
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

      // Handle cancelled status (works for both types)
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

      // Regular update for other changes
      const response = await api.sales({ id: original.id }).patch({
        clientId: changes.clientId,
        deliveryDate: changes.deliveryDate?.toISOString(),
        saleType: changes.saleType,
        totalAmount: changes.totalAmount ? parseFloat(changes.totalAmount) : undefined,
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { txid?: number };
      return { txid: data?.txid || Date.now() };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0] as { original: Sale };

      // Only allow deletion of drafts
      if (original.status !== "draft") {
        throw new Error("Solo se pueden eliminar ventas en estado draft");
      }

      const response = await api.sales({ id: original.id }).delete();

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
  })
);
