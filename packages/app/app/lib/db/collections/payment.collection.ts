import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { paymentSchema } from "../schema";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

export const paymentCollection = createCollection(
  electricCollectionOptions({
    id: "payments",
    schema: paymentSchema,
    getKey: (payment) => payment.id,
    shapeOptions: createShapeOptions("abonos"),
    syncMode: "eager",
    startSync: true,
    onInsert: async ({ transaction }) => {
      const newPayment = transaction.mutations[0].modified;

      if (!isOnline()) {
        return { txid: Date.now() };
      }

      const response = await api.payments.post({
        customerId: newPayment.customerId,
        amount: newPayment.amount,
        paymentMethod: newPayment.paymentMethod as "efectivo" | "yape" | "plin" | "transferencia",
        notes: newPayment.notes || undefined,
        proofImageId: newPayment.proofImageId || undefined,
        referenceNumber: newPayment.referenceNumber || undefined,
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { data: { id: string }; txid?: number };
      const txid = data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }

      return { txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];

      if (!isOnline()) {
        return { txid: Date.now() };
      }

      if (changes.proofImageId) {
        const response = await api.payments({ id: original.id }).proof.put({
          proofImageId: changes.proofImageId,
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

      if (changes.referenceNumber) {
        const response = await api.payments({ id: original.id }).reference.put({
          referenceNumber: changes.referenceNumber,
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

      throw new Error("No valid changes to process");
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];

      if (!isOnline()) {
        return { txid: Date.now() };
      }

      const response = await api.payments({ id: original.id }).delete();

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
  })
);
