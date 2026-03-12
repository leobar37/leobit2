import { Elysia } from "elysia";
import { eq, inArray } from "drizzle-orm";
import type { RequestContext } from "../context/request-context";
import { contextPlugin } from "../plugins/context";
import { db, productVariants, products, saleItems, sales } from "../lib/db";

const ELECTRIC_URL =
  process.env.ELECTRIC_URL || "https://api.electric-sql.cloud/v1/shape";

const PASSTHROUGH_HEADERS = [
  "content-type",
  "cache-control",
  "electric-offset",
  "electric-handle",
  "electric-schema",
  "electric-cursor",
  "electric-up-to-date",
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
]);

function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function buildTenantWhere(table: string, businessId: string) {
  if (DIRECT_BUSINESS_TABLES.has(table)) {
    return `business_id = ${quoteSqlString(businessId)}`;
  }

  if (table === "sale_items") {
    const rows = await db
      .select({ id: sales.id })
      .from(sales)
      .where(eq(sales.businessId, businessId));

    if (rows.length === 0) {
      return "1 = 0";
    }

    return `sale_id IN (${rows.map((row) => quoteSqlString(row.id)).join(", ")})`;
  }

  if (table === "product_variants") {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.businessId, businessId));

    if (rows.length === 0) {
      return "1 = 0";
    }

    return `product_id IN (${rows.map((row) => quoteSqlString(row.id)).join(", ")})`;
  }

  return null;
}

function mergeWhere(existingWhere: string | null, tenantWhere: string | null) {
  if (!tenantWhere) {
    return existingWhere;
  }

  if (!existingWhere) {
    return tenantWhere;
  }

  return `(${existingWhere}) AND (${tenantWhere})`;
}

export const electricRoutes = new Elysia({ prefix: "/electric" })
  .use(contextPlugin)
  .get("/", async ({ request, set, ctx }) => {
    const requestCtx = ctx as RequestContext;
    const incomingUrl = new URL(request.url);
    const table = incomingUrl.searchParams.get("table");

    if (!table) {
      set.status = 400;
      return {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing table parameter",
        },
      };
    }

    const tenantWhere = await buildTenantWhere(table, requestCtx.businessId);
    const electricUrl = new URL(ELECTRIC_URL);

    for (const [key, value] of incomingUrl.searchParams.entries()) {
      electricUrl.searchParams.set(key, value);
    }

    if (!electricUrl.searchParams.get("source_id")) {
      const sourceId = process.env.VITE_ELECTRIC_SOURCE_ID;

      if (!sourceId) {
        set.status = 500;
        return {
          success: false,
          error: {
            code: "MISSING_SOURCE_ID",
            message: "Missing Electric source ID",
          },
        };
      }

      electricUrl.searchParams.set("source_id", sourceId);
    }

    const mergedWhere = mergeWhere(
      incomingUrl.searchParams.get("where"),
      tenantWhere
    );

    if (mergedWhere) {
      electricUrl.searchParams.set("where", mergedWhere);
    }

    const electricToken = process.env.VITE_ELECTRIC_TOKEN;

    if (!electricToken) {
      set.status = 500;
      return {
        success: false,
        error: {
          code: "MISSING_SECRET",
          message: "Missing Electric token",
        },
      };
    }

    console.log("[Electric Proxy] Forwarding request to:", electricUrl.toString().split('?')[0]);
    
    const response = await fetch(electricUrl.toString(), {
      method: "GET",
      headers: {
        Accept: request.headers.get("accept") || "*/*",
        Authorization: `Bearer ${electricToken}`,
      },
    });

    const body = await response.text();

    if (body.includes("must-refetch")) {
      console.warn("[Electric Proxy] Electric requested must-refetch", {
        table,
        status: response.status,
        handle: incomingUrl.searchParams.get("handle"),
        offset: incomingUrl.searchParams.get("offset"),
      });
    }

    set.status = response.status;

    for (const header of PASSTHROUGH_HEADERS) {
      const value = response.headers.get(header);

      if (value) {
        set.headers[header] = value;
      }
    }

    return new Response(body, {
      status: response.status,
      headers: Object.fromEntries(
        PASSTHROUGH_HEADERS.flatMap((header) => {
          const value = response.headers.get(header);
          return value ? [[header, value]] : [];
        })
      ),
    });
  });
