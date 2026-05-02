import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const mediaRoutes = new Elysia({ prefix: "/media" })
  .use(contextPlugin)
  .use(servicesPlugin)

  /**
   * POST /media/resolve
   * Batch resolve file and asset IDs to metadata with URLs.
   */
  .post(
    "/resolve",
    async ({ fileService, assetService, ctx, body }) => {
      const requestCtx = ctx as RequestContext;

      const fileIds = [...new Set(body.files ?? [])];
      const assetIds = [...new Set(body.assets ?? [])];

      const files: Record<string, { id: string; kind: "file"; filename: string; mimeType: string; sizeBytes: number; url: string }> = {};
      const assets: Record<string, { id: string; kind: "asset"; filename: string; mimeType: string; sizeBytes: number; url: string }> = {};

      if (fileIds.length > 0) {
        const fileRecords = await fileService.resolveBatch(requestCtx, fileIds);
        for (const [id, record] of fileRecords.entries()) {
          files[id] = { ...record, kind: "file" };
        }
      }

      if (assetIds.length > 0) {
        const assetRecords = await assetService.resolveBatch(requestCtx, assetIds);
        for (const [id, record] of assetRecords.entries()) {
          assets[id] = { ...record, kind: "asset" };
        }
      }

      return { success: true, data: { files, assets } };
    },
    {
      body: t.Object({
        files: t.Optional(t.Array(t.String())),
        assets: t.Optional(t.Array(t.String())),
      }),
    }
  );
