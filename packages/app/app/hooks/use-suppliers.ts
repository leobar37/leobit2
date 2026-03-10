import { useLiveQuery, eq, ilike } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { supplierCollection } from "~/lib/db/collections/supplier.collection";
import { useBusiness } from "./use-business";
import { generateId } from "~/lib/utils";
import type { CreateSupplierInput, UpdateSupplierInput } from "~/lib/db/schema";

export interface Supplier {
  id: string;
  name: string;
  type: "generic" | "regular" | "internal";
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
}

export function useSuppliers(searchQuery?: string) {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  return useLiveQuery(
    (q) => {
      let query = q
        .from({ supplier: supplierCollection })
        .where(({ supplier }) => eq(supplier.businessId, businessId));

      if (searchQuery) {
        query = query.where(({ supplier }) =>
          ilike(supplier.name, `%${searchQuery}%`)
        );
      }

      return query.orderBy(({ supplier }) => supplier.name, "asc");
    },
    [businessId, searchQuery]
  );
}

export function useSupplier(id: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ supplier: supplierCollection })
        .where(({ supplier }) => eq(supplier.id, id)),
    [id]
  );
}

export function useCreateSupplier() {
  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const id = generateId();
      await supplierCollection.insert({
        id,
        ...input,
        type: input.type || "regular",
        ruc: input.ruc || null,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        notes: input.notes || null,
        businessId: "", // Will be filled by backend
        isActive: true,
        syncStatus: "pending",
        syncAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return id;
    },
  });
}

export function useUpdateSupplier() {
  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: UpdateSupplierInput & { id: string }) => {
      await supplierCollection.update(id, (draft) => {
        if (changes.name !== undefined) draft.name = changes.name;
        if (changes.ruc !== undefined) draft.ruc = changes.ruc || null;
        if (changes.address !== undefined) draft.address = changes.address || null;
        if (changes.phone !== undefined) draft.phone = changes.phone || null;
        if (changes.email !== undefined) draft.email = changes.email || null;
        if (changes.notes !== undefined) draft.notes = changes.notes || null;
        if (changes.isActive !== undefined) draft.isActive = changes.isActive;
        draft.syncStatus = "pending";
        draft.updatedAt = new Date();
      });
      return id;
    },
  });
}

export function useDeleteSupplier() {
  return useMutation({
    mutationFn: async (id: string) => {
      await supplierCollection.delete(id);
      return id;
    },
  });
}
