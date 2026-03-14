import { Elysia } from "elysia";
import type { RequestContext } from "../context/request-context";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import { ALLOWED_TABLES } from "../services/business/electric.service";

export const electricRoutes = new Elysia({ prefix: "/electric" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get("/", async ({ request, set, ctx, electricService }) => {
    const requestCtx = ctx as RequestContext;
    const incomingUrl = new URL(request.url);
    const table = incomingUrl.searchParams.get("table");

    // Always set default electric headers for all responses
    const defaultHeaders = {
      "electric-offset": "0_0",
      "electric-schema": "",
      "electric-handle": "",
    };

    if (!table) {
      set.status = 400;
      // Set headers even for error responses
      for (const [header, value] of Object.entries(defaultHeaders)) {
        set.headers[header] = value;
      }
      return {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing table parameter",
        },
      };
    }

    if (!ALLOWED_TABLES.has(table)) {
      set.status = 400;
      // Set headers even for error responses
      for (const [header, value] of Object.entries(defaultHeaders)) {
        set.headers[header] = value;
      }
      return {
        success: false,
        error: {
          code: "INVALID_TABLE",
          message: `Table '${table}' is not allowed. Allowed tables: ${[...ALLOWED_TABLES].join(", ")}`,
        },
      };
    }

    const result = await electricService.proxyShape(requestCtx, {
      table,
      searchParams: incomingUrl.searchParams,
      accept: request.headers.get("accept"),
    });

    set.status = result.status;

    // Merge service headers with defaults to ensure all required headers are present
    const mergedHeaders = { ...defaultHeaders, ...result.headers };
    for (const [header, value] of Object.entries(mergedHeaders)) {
      set.headers[header] = value;
    }

    return result.body;
  });
