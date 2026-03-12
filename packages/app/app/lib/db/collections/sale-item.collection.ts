import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { saleItemSchema, type SaleItem } from "../schemas/sale";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

/**
 * Unified Sale Item Collection
 * Supports both instant_sales and pre_orders with atomic CRUD operations
 *
 * For instant_sales: uses quantity, unitPrice
 * For pre_orders: uses orderedQuantity, deliveredQuantity, unitPriceQuoted, unitPriceFinal
 */
export const saleItemCollection = createCollection(
  // @ts-ignore - electricCollectionOptions types are not fully aligned across TanStack DB versions
  electricCollectionOptions({
    id: "sale_items",
    schema: saleItemSchema,
    getKey: (item) => item.id,
    shapeOptions: createShapeOptions("sale_items"),
    syncMode: "eager",
    startSync: true,
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified as SaleItem;

      const isPreOrder = newItem.orderedQuantity !== null && newItem.orderedQuantity !== undefined;

      const response = await api
        .sales({ id: newItem.saleId })
        .items.post({
          productId: newItem.productId,
          variantId: newItem.variantId,
          productName: newItem.productName,
          variantName: newItem.variantName,
          quantity: newItem.quantity ? parseFloat(newItem.quantity) : undefined,
          unitPrice: newItem.unitPrice ? parseFloat(newItem.unitPrice) : undefined,
          orderedQuantity: isPreOrder ? parseFloat(newItem.orderedQuantity!) : undefined,
          unitPriceQuoted: newItem.unitPriceQuoted ? parseFloat(newItem.unitPriceQuoted) : undefined,
          subtotal: parseFloat(newItem.subtotal),
        });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as unknown as { data: { item: { id: string }; txid?: number } };
      const txid = data?.data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }

      return { txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0] as {
        original: SaleItem;
        changes: Partial<SaleItem>;
      };

      // Handle quantity updates for pre_orders (with versioning)
      if (changes.orderedQuantity !== undefined) {
        const response = await api
          .sales({ id: original.saleId })
          .items({ itemId: original.id })
          .patch({
            orderedQuantity: changes.orderedQuantity ? parseFloat(changes.orderedQuantity) : undefined,
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

      // Handle delivered quantity updates (for pre_orders) - use regular patch endpoint
      if (changes.deliveredQuantity !== undefined) {
        const response = await api
          .sales({ id: original.saleId })
          .items({ itemId: original.id })
          .patch({
            deliveredQuantity: changes.deliveredQuantity ? parseFloat(changes.deliveredQuantity) : undefined,
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

      // Regular updates for instant_sales
      const response = await api
        .sales({ id: original.saleId })
        .items({ itemId: original.id })
        .patch({
          quantity: changes.quantity ? parseFloat(changes.quantity) : undefined,
          unitPrice: changes.unitPrice ? parseFloat(changes.unitPrice) : undefined,
          unitPriceQuoted: changes.unitPriceQuoted ? parseFloat(changes.unitPriceQuoted) : undefined,
          unitPriceFinal: changes.unitPriceFinal ? parseFloat(changes.unitPriceFinal) : undefined,
          subtotal: changes.subtotal ? parseFloat(changes.subtotal) : undefined,
          isModified: changes.isModified,
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
      const { original } = transaction.mutations[0] as { original: SaleItem };

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
