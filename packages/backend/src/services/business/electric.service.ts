import { eq } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { AppError } from "../../errors";
import { db, distribuciones, purchases, customers, tags } from "../../lib/db";

const DEFAULT_ELECTRIC_URL = "https://api.electric-sql.cloud/v1/shape";

export const PASSTHROUGH_HEADERS = [
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
  "closings",
  "product_variants",
  "sale_items",
  "tags",
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
]);

const SPECIAL_FILTER_TABLES = new Set([
  "purchase_items",
  "distribucion_items",
  "customer_tags",
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
    const tenantWhere = await this.buildTenantWhere(input.table, ctx.businessId);
    const electricUrl = this.buildElectricUrl(input.searchParams, input.table, tenantWhere);
    const electricToken = this.getElectricToken();

    console.log(
      "[Electric Proxy] Forwarding request to:",
      electricUrl.toString().split("?")[0]
    );

    const response = await fetch(electricUrl.toString(), {
      method: "GET",
      headers: {
        Accept: input.accept || "*/*",
        Authorization: `Bearer ${electricToken}`,
      },
    });

    const body = await response.text();

    if (body.includes("must-refetch")) {
      console.warn("[Electric Proxy] Electric requested must-refetch", {
        table: input.table,
        status: response.status,
        handle: input.searchParams.get("handle"),
        offset: input.searchParams.get("offset"),
      });
    }

    return {
      status: response.status,
      body,
      headers: this.extractPassthroughHeaders(response.headers),
    };
  }

  async buildTenantWhere(table: string, businessId: string) {
    if (DIRECT_BUSINESS_TABLES.has(table)) {
      return `business_id = ${quoteSqlString(businessId)}`;
    }

    const config = SPECIAL_FILTER_CONFIG[table];
    if (config) {
      return this.buildSpecialFilter(table, config, businessId);
    }

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
      default:
        throw new AppError(
          `Unknown parent table: ${config.parentTable}`,
          "INVALID_CONFIG",
          500
        );
    }

    if (rows.length === 0) {
      return "1 = 0";
    }

    return `${config.childColumn} IN (${rows.map((row) => quoteSqlString(String(row.id))).join(", ")})`;
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
