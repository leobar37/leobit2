import { useLiveQuery, eq } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { purchaseCollection } from "~/lib/db/collections/purchase.collection";
import { supplierCollection } from "~/lib/db/collections/supplier.collection";
import { useBusiness } from "./use-business";
import { generateId } from "~/lib/utils";
import type { CreatePurchaseInput } from "~/lib/db/schema";

export interface PurchaseItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: string;
  unitCost: string;
  totalCost: string;
  product?: {
    id: string;
    name: string;
  };
  variant?: {
    id: string;
    name: string;
  } | null;
}

export interface Purchase {
  id: string;
  supplierId: string;
  purchaseDate: string;
  totalAmount: string;
  status: "pending" | "received" | "cancelled";
  invoiceNumber: string | null;
  receiptImageId: string | null;
  notes: string | null;
  supplier?: {
    id: string;
    name: string;
  };
  receiptImage?: {
    id: string;
    filename: string;
    url?: string;
  } | null;
  items: PurchaseItem[];
  createdAt: Date;
}

export interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  quantity: number;
  unitCost: number;
}

export function usePurchases() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  return useLiveQuery(
    (q) =>
      q
        .from({ purchase: purchaseCollection })
        .join(
          { supplier: supplierCollection },
          ({ purchase, supplier }) => eq(purchase.supplierId, supplier.id),
          "left"
        )
        .where(({ purchase }) => eq(purchase.businessId, businessId))
        .orderBy(({ purchase }) => purchase.purchaseDate, "desc"),
    [businessId]
  );
}

export function usePurchase(id: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ purchase: purchaseCollection })
        .join(
          { supplier: supplierCollection },
          ({ purchase, supplier }) => eq(purchase.supplierId, supplier.id),
          "left"
        )
        .where(({ purchase }) => eq(purchase.id, id)),
    [id]
  );
}

export function useCreatePurchase() {
  return useMutation({
    mutationFn: async (input: CreatePurchaseInput) => {
      const id = generateId();
      const totalAmount = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unitCost,
        0
      );

      await purchaseCollection.insert({
        id,
        supplierId: input.supplierId,
        purchaseDate: input.purchaseDate,
        invoiceNumber: input.invoiceNumber || null,
        receiptImageId: input.receiptImageId || null,
        notes: input.notes || null,
        totalAmount: totalAmount.toString(),
        status: "pending",
        items: input.items.map((item) => ({
          id: generateId(),
          purchaseId: id,
          productId: item.productId,
          variantId: item.variantId || null,
          unitId: item.unitId || null,
          quantity: item.quantity.toString(),
          unitCost: item.unitCost.toString(),
          totalCost: (item.quantity * item.unitCost).toString(),
          syncStatus: "pending",
          syncAttempts: 0,
          createdAt: new Date(),
        })),
        businessId: "",
        syncStatus: "pending",
        syncAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return id;
    },
  });
}

export function useUpdatePurchaseStatus() {
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "pending" | "received" | "cancelled";
    }) => {
      await purchaseCollection.update(id, (draft) => {
        draft.status = status;
        draft.syncStatus = "pending";
        draft.updatedAt = new Date();
      });
      return id;
    },
  });
}

export function useDeletePurchase() {
  return useMutation({
    mutationFn: async (id: string) => {
      await purchaseCollection.delete(id);
      return id;
    },
  });
}
