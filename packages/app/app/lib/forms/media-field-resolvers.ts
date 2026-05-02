import type { FieldResolver, FieldResolverContext } from "./field-resolvers";
import { uploadMediaFile } from "~/lib/media/media-client";
import type { ResolvedMedia } from "~/lib/media/media-types";

export type MediaFieldValue =
  | string
  | { id: string; url?: string }
  | File
  | null
  | undefined;

function normalizeToId(value: MediaFieldValue): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) return value.id;
  return undefined;
}

function createMediaFieldResolver(
  kind: "file" | "asset",
  uploadEndpoint: "/files/upload" | "/assets/upload"
): FieldResolver<MediaFieldValue, string | null | undefined> {
  return {
    kind,
    async toServer(value, _context: FieldResolverContext) {
      if (value === null) return null;
      if (value === undefined) return undefined;

      // Already an ID string
      if (typeof value === "string") return value;

      // Object with id (already resolved)
      if (typeof value === "object" && "id" in value) return value.id;

      // File needs upload
      if (value instanceof File) {
        const result = await uploadMediaFile(uploadEndpoint, value);
        return result.id;
      }

      return undefined;
    },
  };
}

export function fileField(): FieldResolver<
  MediaFieldValue,
  string | null | undefined
> {
  return createMediaFieldResolver("file", "/files/upload");
}

export function assetField(): FieldResolver<
  MediaFieldValue,
  string | null | undefined
> {
  return createMediaFieldResolver("asset", "/assets/upload");
}
