import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { supplierSchema } from "../schema";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

// @ts-ignore - electricCollectionOptions types are not fully aligned
export const supplierCollection = createCollection(
  // @ts-ignore
  electricCollectionOptions({
    id: "suppliers",
    schema: supplierSchema,
    getKey: (supplier) => supplier.id,
    shapeOptions: createShapeOptions("suppliers"),
    syncMode: "eager",
    startSync: true,
    onInsert: async ({ transaction }) => {
      const newSupplier = transaction.mutations[0].modified;
      const response = await api.suppliers.post({
        name: newSupplier.name,
        type: newSupplier.type,
        ruc: newSupplier.ruc ?? undefined,
        address: newSupplier.address ?? undefined,
        phone: newSupplier.phone ?? undefined,
        email: newSupplier.email ?? undefined,
        notes: newSupplier.notes ?? undefined,
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
      const response = await api.suppliers({ id: original.id }).put({
        name: changes.name,
        ruc: changes.ruc ?? undefined,
        address: changes.address ?? undefined,
        phone: changes.phone ?? undefined,
        email: changes.email ?? undefined,
        notes: changes.notes ?? undefined,
        isActive: changes.isActive,
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
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      const response = await api.suppliers({ id: original.id }).delete();

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
  })
);
