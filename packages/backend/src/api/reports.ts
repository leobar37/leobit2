import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { ReportService } from "../services/business/report.service";

export const reportRoutes = new Elysia({ prefix: "/reports" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .decorate(() => ({
    reportService: new ReportService(),
  }))
  .get(
    "/accounts-receivable",
    async ({ customerService, ctx, query }) => {
      const accounts = await customerService.getAccountsReceivable(ctx as RequestContext, {
        search: query.search,
        minBalance: query.minBalance ? parseFloat(query.minBalance) : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });
      return { success: true, data: accounts };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        minBalance: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/accounts-receivable/total",
    async ({ customerService, ctx }) => {
      const total = await customerService.getTotalAccountsReceivable(ctx as RequestContext);
      return { success: true, data: { total } };
    }
  )
  .get(
    "/missing-inventory",
    async ({ inventoryService, ctx, query }) => {
      const report = await inventoryService.getMissingInventoryReport(
        ctx as RequestContext,
        {
          startDate: query.startDate ? new Date(query.startDate) : undefined,
          endDate: query.endDate ? new Date(query.endDate) : undefined,
        }
      );
      return { success: true, data: report };
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  )
  // Dashboard metrics endpoints
  .get(
    "/sales-today",
    async ({ reportService, ctx }) => {
      const stats = await reportService.getSalesTodayStats(ctx as RequestContext);
      return { success: true, data: stats };
    }
  )
  .get(
    "/sales-stats",
    async ({ reportService, ctx, query }) => {
      const type = (query.type as "day" | "week" | "month" | "range") || "day";
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const stats = await reportService.getSalesStats(ctx as RequestContext, {
        type,
        startDate,
        endDate,
      });
      return { success: true, data: stats };
    },
    {
      query: t.Object({
        type: t.Optional(t.Union([
          t.Literal("day"),
          t.Literal("week"),
          t.Literal("month"),
          t.Literal("range"),
        ])),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/debtors-summary",
    async ({ reportService, ctx }) => {
      const summary = await reportService.getDebtorsSummary(ctx as RequestContext);
      return { success: true, data: summary };
    }
  )
  .get(
    "/sales-weekly",
    async ({ reportService, ctx }) => {
      const data = await reportService.getWeeklySales(ctx as RequestContext);
      return { success: true, data };
    }
  )
  .get(
    "/sales-chart",
    async ({ reportService, ctx, query }) => {
      const type = (query.type as "day" | "week" | "month" | "range") || "week";
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const data = await reportService.getSalesChart(ctx as RequestContext, {
        type,
        startDate,
        endDate,
      });
      return { success: true, data };
    },
    {
      query: t.Object({
        type: t.Optional(t.Union([
          t.Literal("day"),
          t.Literal("week"),
          t.Literal("month"),
          t.Literal("range"),
        ])),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  );
