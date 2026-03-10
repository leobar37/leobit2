import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { fileSchema } from "../schema";
import { createShapeOptions } from "./utils";

export const fileCollection = createCollection(
  electricCollectionOptions({
    id: "files",
    schema: fileSchema,
    getKey: (file) => file.id,
    shapeOptions: createShapeOptions("files"),
    onInsert: async () => {
      throw new Error("File uploads must use upload queue, not collection insert");
    },
    onUpdate: async () => {
      throw new Error("File updates not supported");
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      const response = await fetch(`/api/files/${original.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete file");
      }
    },
  })
);
