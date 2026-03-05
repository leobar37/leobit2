import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";

export const reportRoutes = new Elysia({ prefix: "/reports" })
  .use(contextPlugin)
  .use(servicesPlugin)
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
  );
