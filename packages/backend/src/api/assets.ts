import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";


export const assetRoutes = new Elysia({ prefix: "/assets" })
  .use(contextPlugin)
  .use(servicesPlugin)

  /**
   * GET /assets
   * Returns all assets with URLs for gallery
   */
  .get(
    "/",
    async ({ assetService, ctx }) => {
      const assets = await assetService.getAllWithUrls(ctx as RequestContext);
      return assets;
    }
  )

  /**
   * GET /assets/:id
   * Returns single asset with URL
   */
  .get(
    "/:id",
    async ({ assetService, ctx, params }) => {
      const { asset, url } = await assetService.getWithUrl(
        ctx as RequestContext,
        params.id
      );
      return { ...asset, url };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * POST /assets/upload
   * Upload asset and return ID (frontend stores ID, not URL)
   */
  .post(
    "/upload",
    async ({ assetService, ctx, body, set }) => {
      set.status = 201;
      const asset = await assetService.upload(ctx as RequestContext, body.file);

      return {
        id: asset.id,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        createdAt: asset.createdAt,
      };
    },
    {
      body: t.Object({
        file: t.File({
          maxSize: 5 * 1024 * 1024,
          type: [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/quicktime",
          ],
        }),
      }),
    }
  )

  /**
   * DELETE /assets/:id
   * Soft delete asset
   */
  .delete(
    "/:id",
    async ({ assetService, ctx, params, set }) => {
      await assetService.delete(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
