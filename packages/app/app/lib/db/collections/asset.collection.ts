import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { assetSchema } from "../schema";
import { createShapeOptions } from "./utils";

// @ts-ignore - electricCollectionOptions types are not fully aligned
export const assetCollection = createCollection(
  // @ts-ignore
  electricCollectionOptions({
    id: "assets",
    schema: assetSchema,
    getKey: (asset) => asset.id,
    shapeOptions: createShapeOptions("assets"),
    syncMode: "eager",
    startSync: true,
    onInsert: async () => {
      throw new Error("Asset uploads must use upload queue, not collection insert");
    },
    onUpdate: async () => {
      throw new Error("Asset updates not supported");
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      const response = await fetch(`/api/assets/${original.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }
    },
  })
);
