import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const ocrRoutes = new Elysia({ prefix: "/ocr" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .post(
    "/recognize-weight",
    async ({ ocrService, ctx, body, set }) => {
      const context = ctx as RequestContext;

      try {
        const calcSettings = context.calculatorSettings;

        const result = await ocrService.recognizeWeight(body.imageBase64, {
          autoFillPrice: calcSettings?.calculators.sales.autoFillPrice ?? false,
          autoFillTara: !(calcSettings?.calculators.sales.hideTara ?? true),
        });

        return { success: true, data: result };
      } catch (error) {
        console.error("Error en OCR:", error);
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Error al procesar la imagen"
        };
      }
    },
    {
      body: t.Object({
        imageBase64: t.String({ minLength: 1 }),
      }),
    }
  );
