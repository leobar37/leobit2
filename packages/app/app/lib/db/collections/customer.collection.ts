import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { customerSchema } from "../schema";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

export const customerCollection = createCollection(
  electricCollectionOptions({
    id: "customers",
    schema: customerSchema,
    getKey: (customer) => customer.id,
    shapeOptions: createShapeOptions("customers"),
    onInsert: async ({ transaction }) => {
      const newCustomer = transaction.mutations[0].modified;
      const response = await api.customers.post({
        name: newCustomer.name,
        dni: newCustomer.dni || undefined,
        phone: newCustomer.phone || undefined,
        address: newCustomer.address || undefined,
        notes: newCustomer.notes || undefined,
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
      const response = await api.customers({ id: original.id }).put({
        name: changes.name,
        dni: changes.dni,
        phone: changes.phone,
        address: changes.address,
        notes: changes.notes,
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      return { txid: Date.now() };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      await api.customers({ id: original.id }).delete();
    },
  })
);
