import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const cocheraReportRoutes = new Elysia({ prefix: "/cochera/reports" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ cocheraReportService, ctx, query }) => {
      const period = (query.period as "today" | "week" | "month") || "today";
      const report = await cocheraReportService.getReport(ctx as RequestContext, period);
      return {
        success: true,
        data: report,
      };
    },
    {
      query: t.Object({
        period: t.Optional(t.Union([
          t.Literal("today"),
          t.Literal("week"),
          t.Literal("month"),
        ])),
      }),
    }
  )
  .get(
    "/export",
    async ({ cocheraReportService, ctx, query, set }) => {
      const period = (query.period as "today" | "week" | "month") || "today";
      const { csv, filename } = await cocheraReportService.exportCSV(
        ctx as RequestContext,
        period
      );
      set.headers["Content-Type"] = "text/csv; charset=utf-8";
      set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
      return csv;
    },
    {
      query: t.Object({
        period: t.Optional(t.Union([
          t.Literal("today"),
          t.Literal("week"),
          t.Literal("month"),
        ])),
      }),
    }
  );
