import { Elysia } from "elysia";
import type { RequestContext } from "../context/request-context";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import { ALLOWED_TABLES } from "../services/business/electric.service";
import { createLogger } from "../lib/logger";

const logger = createLogger("ElectricRoute");

export const electricRoutes = new Elysia({ prefix: "/electric" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get("/", async ({ request, set, ctx, electricService }) => {
    const requestCtx = ctx as RequestContext;
    const incomingUrl = new URL(request.url);
    const table = incomingUrl.searchParams.get("table");
    const offset = incomingUrl.searchParams.get("offset");
    const handle = incomingUrl.searchParams.get("handle");

    // Log all electric requests for debugging
    logger.info({
      msg: "🔌 Electric proxy request",
      table,
      offset,
      handle: handle ? `${handle.slice(0, 20)}...` : null,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
      userAgent: request.headers.get("user-agent")?.slice(0, 50),
    });

    // Always set default electric headers for all responses
    const defaultHeaders = {
      "electric-offset": "0_0",
      "electric-schema": "",
      "electric-handle": "",
    };

    // CORS expose headers for all responses
    const exposeHeaders = [
      "electric-offset",
      "electric-handle",
      "electric-schema",
      "electric-cursor",
      "electric-up-to-date",
      "electric-control",
    ];
    set.headers["access-control-expose-headers"] = exposeHeaders.join(", ");

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

    try {
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
    } catch (error) {
      logger.error({
        msg: "Electric proxy error",
        table,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      set.status = 500;
      for (const [header, value] of Object.entries(defaultHeaders)) {
        set.headers[header] = value;
      }
      // Expose headers for error responses too
      set.headers["access-control-expose-headers"] = exposeHeaders.join(", ");
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      };
    }
  });