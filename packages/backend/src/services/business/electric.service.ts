import { eq } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { AppError } from "../../errors";
import { db, distribuciones, purchases, customers, tags, products, productVariants } from "../../lib/db";
import { createLogger } from "../../lib/logger";

/**
 * Electric Service Logger
 *
 * Log levels used:
 * - ERROR: Failed requests (4xx/5xx errors except 409)
 * - WARN:  409 Conflict (handle expired), must-refetch events
 * - INFO:  Initial sync completions
 * - DEBUG: All requests, filter building, normal operations
 *
 * To filter logs in development:
 *   LOG_LEVEL=debug bun run dev           # See everything
 *   LOG_LEVEL=warn bun run dev            # See only warnings/errors
 *   bun run dev 2>&1 | grep "Electric"    # Filter by module
 *   bun run dev 2>&1 | grep "409"         # Filter by error type
 */

const logger = createLogger("ElectricService");

const DEFAULT_ELECTRIC_URL = "https://api.electric-sql.cloud/v1/shape";

export const PASSTHROUGH_HEADERS = [
  "content-type",
  "cache-control",
  "electric-offset",
  "electric-handle",
  "electric-schema",
  "electric-cursor",
  "electric-up-to-date",
  "electric-control",
] as const;

const DIRECT_BUSINESS_TABLES = new Set([
  "customers",
  "sales",
  "products",
  "assets",
  "files",
  "suppliers",
  "purchases",
  "abonos",
  "closings",
  "product_variants",
  "sale_items",
  "tags",
  "distribuciones",
  "variant_inventory",
  "inventory",
]);

export const ALLOWED_TABLES = new Set([
  "customers",
  "sales",
  "products",
  "suppliers",
  "purchases",
  "abonos",
  "closings",
  "product_variants",
  "sale_items",
  "purchase_items",
  "distribuciones",
  "distribucion_items",
  "tags",
  "customer_tags",
  "inventory",
  "variant_inventory",
]);

const SPECIAL_FILTER_TABLES = new Set([
  "purchase_items",
  "distribucion_items",
  "customer_tags",
  "inventory",
  "variant_inventory",
]);

interface SpecialFilterConfig {
  parentTable: string;
  parentColumn: string;
  childColumn: string;
}

const SPECIAL_FILTER_CONFIG: Record<string, SpecialFilterConfig> = {
  purchase_items: {
    parentTable: "purchases",
    parentColumn: "id",
    childColumn: "purchase_id",
  },
  distribucion_items: {
    parentTable: "distribuciones",
    parentColumn: "id",
    childColumn: "distribucion_id",
  },
  customer_tags: {
    parentTable: "customers",
    parentColumn: "id",
    childColumn: "customer_id",
  },
  inventory: {
    parentTable: "products",
    parentColumn: "id",
    childColumn: "product_id",
  },
  variant_inventory: {
    parentTable: "product_variants",
    parentColumn: "id",
    childColumn: "variant_id",
  },
};

export interface ElectricProxyInput {
  table: string;
  searchParams: URLSearchParams;
  accept?: string | null;
}

export interface ElectricProxyResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

/**
 * Sanitize handle for logging - truncate very long handles
 */
function sanitizeHandle(handle: string | null): string | null {
  if (!handle) return null;
  if (handle.length > 50) {
    return `${handle.slice(0, 25)}...${handle.slice(-20)}`;
  }
  return handle;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
};

export function mergeWhere(
  existingWhere: string | null,
  tenantWhere: string | null,
  table: string
) {
  if (SPECIAL_FILTER_TABLES.has(table)) {
    return tenantWhere;
  }

  if (!tenantWhere) {
    return existingWhere;
  }

  if (!existingWhere) {
    return tenantWhere;
  }

  return `(${existingWhere}) AND (${tenantWhere})`;
}

export class ElectricService {
  async proxyShape(
    ctx: RequestContext,
    input: ElectricProxyInput
  ): Promise<ElectricProxyResult> {
    const startTime = Date.now();
    const tenantWhere = await this.buildTenantWhere(input.table, ctx.businessId);
    const electricUrl = this.buildElectricUrl(input.searchParams, input.table, tenantWhere);
    const electricToken = this.getElectricToken();

    // Extract key parameters for logging
    const table = input.table;
    const handle = input.searchParams.get("handle");
    const offset = input.searchParams.get("offset");
    const expiredHandle = input.searchParams.get("expired_handle");
    const hasWhere = input.searchParams.has("where");

    logger.debug({
      msg: "Electric proxy request started",
      table,
      handle: sanitizeHandle(handle),
      offset,
      expiredHandle: sanitizeHandle(expiredHandle),
      hasWhere,
      businessId: ctx.businessId,
    });

    // Retry logic for transient 502 errors
    const fetchWithRetry = async (): Promise<Response> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
          const response = await fetch(electricUrl.toString(), {
            method: "GET",
            headers: {
              Accept: input.accept || "*/*",
              Authorization: `Bearer ${electricToken}`,
            },
          });

          // Retry on 502 Bad Gateway
          if (response.status === 502 && attempt < RETRY_CONFIG.maxRetries) {
            const delay = Math.min(
              RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
              RETRY_CONFIG.maxDelayMs
            );
            logger.warn({
              msg: "Electric proxy returned 502 - retrying",
              table,
              attempt: attempt + 1,
              maxRetries: RETRY_CONFIG.maxRetries,
              delayMs: delay,
            });
            await sleep(delay);
            continue;
          }

          return response;
        } catch (error) {
          lastError = error as Error;
          if (attempt < RETRY_CONFIG.maxRetries) {
            const delay = Math.min(
              RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
              RETRY_CONFIG.maxDelayMs
            );
            logger.warn({
              msg: "Electric proxy request error - retrying",
              table,
              error: lastError.message,
              attempt: attempt + 1,
              delayMs: delay,
            });
            await sleep(delay);
          }
        }
      }

      throw lastError || new Error("Max retries exceeded");
    };

    const response = await fetchWithRetry();

    const body = await response.text();
    const duration = Date.now() - startTime;

    // Log based on response status and content
    // Note: 409 is now handled gracefully (transformed to 200 with must-refetch)
    if (response.status === 409) {
      // 409 Conflict is now handled - transform to success with must-refetch
      // Only log at debug level since it's expected behavior
      logger.debug({
        msg: "Electric returned 409 - will transform to must-refetch response",
        table,
        handle: sanitizeHandle(handle),
        offset,
        expiredHandle: sanitizeHandle(expiredHandle),
        status: response.status,
        duration,
      });
    } else if (response.status >= 400) {
      // Other errors (4xx, 5xx)
      logger.error({
        msg: "Electric proxy request failed",
        table,
        handle: sanitizeHandle(handle),
        offset,
        status: response.status,
        duration,
        bodyPreview: body.slice(0, 500),
      });
    } else if (body.includes("must-refetch")) {
      // Must refetch - Electric requesting full resync
      logger.warn({
        msg: "Electric requested must-refetch - full resync required",
        table,
        handle: sanitizeHandle(handle),
        offset,
        status: response.status,
        duration,
        electricHeaders: {
          handle: response.headers.get("electric-handle"),
          offset: response.headers.get("electric-offset"),
          upToDate: response.headers.get("electric-up-to-date"),
        },
      });
    } else if (response.status === 200 && !handle) {
      // Initial sync (no handle provided)
      logger.info({
        msg: "Electric initial sync completed",
        table,
        status: response.status,
        duration,
        hasUpToDate: body.includes('"up-to-date":true') || body.includes('"up-to-date": true'),
      });
    } else {
      // Normal incremental sync
      logger.debug({
        msg: "Electric proxy request completed",
        table,
        handle: sanitizeHandle(handle),
        offset,
        status: response.status,
        duration,
      });
    }

    // Transform 409 Conflict into success response with must-refetch control
    // This prevents browser console noise while maintaining functionality
    if (response.status === 409) {
      // Extract the handle from the response headers for the client to resubscribe
      const electricHandle = response.headers.get("electric-handle");
      const electricOffset = response.headers.get("electric-offset");

      logger.debug({
        msg: "Transforming 409 to 200 with must-refetch control header",
        table,
        newHandle: sanitizeHandle(electricHandle),
        newOffset: electricOffset,
      });

      // Parse the original body and inject control header for PGlite to detect
      let modifiedBody = body;
      try {
        const json = JSON.parse(body);
        // Inject control in the JSON response for PGlite's standard handling
        if (Array.isArray(json) && json.length > 0) {
          json[0].headers = json[0].headers || {};
          json[0].headers.control = "must-refetch";
          modifiedBody = JSON.stringify(json);
        }
      } catch {
        // Not JSON, keep original body
      }

      // Return 200 with electric-control header instead of 409
      // The client will see this as a successful response and handle the must-refetch
      return {
        status: 200,
        body: modifiedBody,
        headers: {
          ...this.extractPassthroughHeaders(response.headers),
          "electric-control": "must-refetch",
          ...(electricHandle ? { "electric-handle": electricHandle } : {}),
          ...(electricOffset ? { "electric-offset": electricOffset } : {}),
        },
      };
    }

    // For all other responses (including errors), always include electric headers
    // The client expects these headers even in error cases
    const passthroughHeaders = this.extractPassthroughHeaders(response.headers);
    
    // Ensure required headers are always present with fallback values
    const headers: Record<string, string> = {
      ...passthroughHeaders,
    };
    
    // Add required headers with fallback values if not present
    if (!headers["electric-offset"]) {
      // Use the offset from request if available, otherwise use fallback
      headers["electric-offset"] = offset || "0_0";
    }
    if (!headers["electric-schema"]) {
      headers["electric-schema"] = "";
    }
    if (!headers["electric-handle"]) {
      headers["electric-handle"] = handle || "";
    }

    return {
      status: response.status,
      body,
      headers,
    };
  }

  async buildTenantWhere(table: string, businessId: string) {
    if (DIRECT_BUSINESS_TABLES.has(table)) {
      const filter = `business_id = ${quoteSqlString(businessId)}`;
      logger.debug({
        msg: "Using direct business filter",
        table,
        businessId,
        filter,
      });
      return filter;
    }

    const config = SPECIAL_FILTER_CONFIG[table];
    if (config) {
      logger.debug({
        msg: "Building special filter",
        table,
        parentTable: config.parentTable,
        businessId,
      });
      return this.buildSpecialFilter(table, config, businessId);
    }

    logger.debug({
      msg: "No tenant filter for table",
      table,
    });
    return null;
  }

  private async buildSpecialFilter(
    table: string,
    config: SpecialFilterConfig,
    businessId: string
  ): Promise<string> {
    let rows: { id: unknown }[];

    switch (config.parentTable) {
      case "purchases": {
        rows = await db
          .select({ id: purchases.id })
          .from(purchases)
          .where(eq(purchases.businessId, businessId));
        break;
      }
      case "distribuciones": {
        rows = await db
          .select({ id: distribuciones.id })
          .from(distribuciones)
          .where(eq(distribuciones.businessId, businessId));
        break;
      }
      case "customers": {
        rows = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.businessId, businessId));
        break;
      }
      case "products": {
        rows = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.businessId, businessId));
        break;
      }
      case "product_variants": {
        rows = await db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(eq(productVariants.businessId, businessId));
        break;
      }
      default:
        throw new AppError(
          `Unknown parent table: ${config.parentTable}`,
          "INVALID_CONFIG",
          500
        );
    }

    if (rows.length === 0) {
      logger.debug({
        msg: "No parent rows found for special filter - returning empty filter",
        table,
        parentTable: config.parentTable,
        businessId,
      });
      return "1 = 0";
    }

    const filter = `${config.childColumn} IN (${rows.map((row) => quoteSqlString(String(row.id))).join(", ")})`;

    logger.debug({
      msg: "Built special filter",
      table,
      parentTable: config.parentTable,
      rowCount: rows.length,
      filterPreview: filter.slice(0, 100),
    });

    return filter;
  }

  private buildElectricUrl(
    searchParams: URLSearchParams,
    table: string,
    tenantWhere: string | null
  ) {
    const electricUrl = new URL(process.env.ELECTRIC_URL || DEFAULT_ELECTRIC_URL);

    for (const [key, value] of searchParams.entries()) {
      electricUrl.searchParams.set(key, value);
    }

    if (!electricUrl.searchParams.get("source_id")) {
      const sourceId = process.env.VITE_ELECTRIC_SOURCE_ID;

      if (!sourceId) {
        throw new AppError("Missing Electric source ID", "MISSING_SOURCE_ID", 500);
      }

      electricUrl.searchParams.set("source_id", sourceId);
    }

    const mergedWhere = mergeWhere(
      searchParams.get("where"),
      tenantWhere,
      table
    );

    if (mergedWhere) {
      electricUrl.searchParams.set("where", mergedWhere);
    }

    return electricUrl;
  }

  private getElectricToken() {
    const electricToken = process.env.VITE_ELECTRIC_TOKEN;

    if (!electricToken) {
      throw new AppError("Missing Electric token", "MISSING_SECRET", 500);
    }

    return electricToken;
  }

  private extractPassthroughHeaders(headers: Headers) {
    return Object.fromEntries(
      PASSTHROUGH_HEADERS.flatMap((header) => {
        const value = headers.get(header);
        return value ? [[header, value]] : [];
      })
    );
  }
}
