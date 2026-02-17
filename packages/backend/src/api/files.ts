import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { NotFoundError } from "../errors";

export const fileRoutes = new Elysia({ prefix: "/files" })
  .use(contextPlugin)
  .use(servicesPlugin)

  /**
   * GET /files/:id
   * Returns single file with URL
   */
  .get(
    "/:id",
    async ({ fileService, ctx, params }) => {
      const { file, url } = await fileService.getWithUrl(
        ctx as RequestContext,
        params.id
      );
      return { ...file, url };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * POST /files/upload
   * Upload file and return ID
   */
  .post(
    "/upload",
    async ({ fileService, ctx, body, set }) => {
      set.status = 201;
      const file = await fileService.upload(ctx as RequestContext, body.file);

      return {
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        createdAt: file.createdAt,
      };
    },
    {
      body: t.Object({
        file: t.File({
          maxSize: 5 * 1024 * 1024,
          type: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
        }),
      }),
    }
  )

  /**
   * DELETE /files/:id
   * Soft delete file
   */
  .delete(
    "/:id",
    async ({ fileService, ctx, params, set }) => {
      await fileService.delete(ctx as RequestContext, params.id);
      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
