import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../errors";
import { db } from "../../lib/db";
import {
  ElectricService,
  mergeWhere,
  quoteSqlString,
} from "./electric.service";

const salesWhereMock = vi.fn();
const productsWhereMock = vi.fn();
const purchasesWhereMock = vi.fn();
const distribucionesWhereMock = vi.fn();
const dbSelectMock = vi.fn();

vi.mock("../../lib/db", () => ({
  db: {
    select: dbSelectMock,
  },
  sales: {
    id: "sales.id",
    businessId: "sales.businessId",
  },
  products: {
    id: "products.id",
    businessId: "products.businessId",
  },
  purchases: {
    id: "purchases.id",
    businessId: "purchases.businessId",
  },
  distribuciones: {
    id: "distribuciones.id",
    businessId: "distribuciones.businessId",
  },
}));

describe("ElectricService", () => {
  const service = new ElectricService();

  beforeEach(() => {
    dbSelectMock.mockReset();
    salesWhereMock.mockReset();
    productsWhereMock.mockReset();
    purchasesWhereMock.mockReset();
    distribucionesWhereMock.mockReset();
    vi.restoreAllMocks();
    process.env.ELECTRIC_URL = "https://electric.example/v1/shape";
    process.env.VITE_ELECTRIC_SOURCE_ID = "source-123";
    process.env.VITE_ELECTRIC_TOKEN = "token-123";
  });

  it("uses only the tenant filter for special tables without business_id", () => {
    expect(
      mergeWhere("business_id = 'wrong'", "purchase_id IN ('pur-1')", "purchase_items")
    ).toBe("purchase_id IN ('pur-1')");

    expect(
      mergeWhere(
        "business_id = 'wrong'",
        "distribucion_id IN ('dist-1')",
        "distribucion_items"
      )
    ).toBe("distribucion_id IN ('dist-1')");
  });

  it("combines the client and tenant filters for direct business tables", () => {
    expect(
      mergeWhere("status = 'active'", "business_id = 'biz-1'", "sales")
    ).toBe("(status = 'active') AND (business_id = 'biz-1')");
  });

  it("combines client and tenant filters for sale_items (now direct)", () => {
    expect(
      mergeWhere("status = 'active'", "business_id = 'biz-1'", "sale_items")
    ).toBe("(status = 'active') AND (business_id = 'biz-1')");
  });

  it("combines client and tenant filters for product_variants (now direct)", () => {
    expect(
      mergeWhere("status = 'active'", "business_id = 'biz-1'", "product_variants")
    ).toBe("(status = 'active') AND (business_id = 'biz-1')");
  });

  it("escapes single quotes in SQL string literals", () => {
    expect(quoteSqlString("biz'o")).toBe("'biz''o'");
  });

  it("builds direct tenant filters for tables with business_id", async () => {
    await expect(service.buildTenantWhere("sales", "biz-1")).resolves.toBe(
      "business_id = 'biz-1'"
    );
  });

  it("builds direct tenant filters for sale_items (has business_id)", async () => {
    await expect(service.buildTenantWhere("sale_items", "biz-1")).resolves.toBe(
      "business_id = 'biz-1'"
    );
  });

  it("builds direct tenant filters for product_variants (has business_id)", async () => {
    await expect(service.buildTenantWhere("product_variants", "biz-1")).resolves.toBe(
      "business_id = 'biz-1'"
    );
  });

  it("builds distribucion_items tenant filters from distribucion ids", async () => {
    dbSelectMock.mockReturnValue({
      from: () => ({
        where: distribucionesWhereMock.mockResolvedValue([
          { id: "dist-1" },
          { id: "dist-2" },
        ]),
      }),
    });

    await expect(
      service.buildTenantWhere("distribucion_items", "biz-1")
    ).resolves.toBe("distribucion_id IN ('dist-1', 'dist-2')");
  });

  it("builds purchase_items tenant filters from purchase ids", async () => {
    dbSelectMock.mockReturnValue({
      from: () => ({
        where: purchasesWhereMock.mockResolvedValue([
          { id: "pur-1" },
          { id: "pur-2" },
        ]),
      }),
    });

    await expect(
      service.buildTenantWhere("purchase_items", "biz-1")
    ).resolves.toBe("purchase_id IN ('pur-1', 'pur-2')");
  });

  it("throws when Electric source id is missing", async () => {
    delete process.env.VITE_ELECTRIC_SOURCE_ID;

    await expect(
      service.proxyShape(
        { businessId: "biz-1" } as never,
        {
          table: "sales",
          searchParams: new URLSearchParams([["table", "sales"]]),
        }
      )
    ).rejects.toMatchObject<AppError>({
      code: "MISSING_SOURCE_ID",
      message: "Missing Electric source ID",
    });
  });

  it("throws when Electric token is missing", async () => {
    delete process.env.VITE_ELECTRIC_TOKEN;

    await expect(
      service.proxyShape(
        { businessId: "biz-1" } as never,
        {
          table: "sales",
          searchParams: new URLSearchParams([
            ["table", "sales"],
            ["source_id", "source-123"],
          ]),
        }
      )
    ).rejects.toMatchObject<AppError>({
      code: "MISSING_SECRET",
      message: "Missing Electric token",
    });
  });

  it("proxies Electric responses with merged tenant filters and passthrough headers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("shape-body", {
        status: 206,
        headers: {
          "content-type": "application/json",
          "electric-offset": "123",
          "electric-handle": "handle-1",
        },
      })
    );

    const result = await service.proxyShape(
      { businessId: "biz-1" } as never,
      {
        table: "sales",
        searchParams: new URLSearchParams([
          ["table", "sales"],
          ["where", "status = 'active'"],
        ]),
        accept: "application/json",
      }
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const proxiedUrl = new URL(url);

    expect(proxiedUrl.searchParams.get("source_id")).toBe("source-123");
    expect(proxiedUrl.searchParams.get("where")).toBe(
      "(status = 'active') AND (business_id = 'biz-1')"
    );
    expect(init.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer token-123",
    });
    expect(result).toEqual({
      status: 206,
      body: "shape-body",
      headers: {
        "content-type": "application/json",
        "electric-offset": "123",
        "electric-handle": "handle-1",
      },
    });
  });

  it("overrides invalid client where clauses for distribucion_items", async () => {
    dbSelectMock.mockReturnValue({
      from: () => ({
        where: distribucionesWhereMock.mockResolvedValue([{ id: "dist-1" }]),
      }),
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("shape-body", {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      })
    );

    await service.proxyShape(
      { businessId: "biz-1" } as never,
      {
        table: "distribucion_items",
        searchParams: new URLSearchParams([
          ["table", "distribucion_items"],
          ["where", "business_id = 'wrong'"],
        ]),
      }
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    const proxiedUrl = new URL(url);

    expect(proxiedUrl.searchParams.get("where")).toBe(
      "distribucion_id IN ('dist-1')"
    );
  });

  it("overrides invalid client where clauses for purchase_items", async () => {
    dbSelectMock.mockReturnValue({
      from: () => ({
        where: purchasesWhereMock.mockResolvedValue([{ id: "pur-1" }]),
      }),
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("shape-body", {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      })
    );

    await service.proxyShape(
      { businessId: "biz-1" } as never,
      {
        table: "purchase_items",
        searchParams: new URLSearchParams([
          ["table", "purchase_items"],
          ["where", "business_id = 'wrong'"],
        ]),
      }
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    const proxiedUrl = new URL(url);

    expect(proxiedUrl.searchParams.get("where")).toBe(
      "purchase_id IN ('pur-1')"
    );
  });
});
