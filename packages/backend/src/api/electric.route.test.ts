import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ElectricProxyResult } from "../services/business/electric.service";

const mockCtx = { businessId: "biz-1" };
const proxyShapeMock = vi.fn<(...args: unknown[]) => Promise<ElectricProxyResult>>();

vi.mock("../plugins/context", async () => {
  const { Elysia } = await import("elysia");

  return {
    contextPlugin: new Elysia({ name: "mock-context" }).decorate(() => ({
      ctx: mockCtx,
    })),
  };
});

vi.mock("../plugins/services", async () => {
  const { Elysia } = await import("elysia");

  return {
    servicesPlugin: new Elysia({ name: "mock-services" }).decorate(() => ({
      electricService: {
        proxyShape: proxyShapeMock,
      },
    })),
  };
});

const { electricRoutes } = await import("./electric");

describe("electricRoutes", () => {
  beforeEach(() => {
    proxyShapeMock.mockReset();
    mockCtx.businessId = "biz-1";
  });

  it("returns 400 when table is missing", async () => {
    const response = await electricRoutes.handle(
      new Request("http://localhost/electric")
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Missing table parameter",
      },
    });
  });

  it("delegates to ElectricService and preserves headers and body", async () => {
    proxyShapeMock.mockResolvedValue({
      status: 206,
      body: "shape-body",
      headers: {
        "content-type": "application/json",
        "electric-offset": "123",
      },
    });

    const response = await electricRoutes.handle(
      new Request("http://localhost/electric?table=sales&offset=-1", {
        headers: {
          accept: "application/json",
        },
      })
    );

    expect(proxyShapeMock).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({
        table: "sales",
        accept: "application/json",
      })
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("electric-offset")).toBe("123");
    await expect(response.text()).resolves.toBe("shape-body");
  });
});
