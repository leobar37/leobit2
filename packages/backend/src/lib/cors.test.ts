import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { getCorsConfig, mergeExposeHeaders } from "./cors";

describe("mergeExposeHeaders", () => {
  it("keeps Better Auth exposed headers while appending default CORS headers", () => {
    expect(
      mergeExposeHeaders(
        "set-auth-token",
        "set-auth-token"
      )
    ).toBe("set-auth-token");
  });

  it("deduplicates header names regardless of casing", () => {
    expect(
      mergeExposeHeaders(
        "Set-Auth-Token, x-custom-header",
        "set-auth-token, X-Custom-Header"
      )
    ).toBe("Set-Auth-Token, x-custom-header");
  });
});

describe("app CORS behavior", () => {
  it("does not clobber auth expose headers during onAfterHandle", async () => {
    const corsConfig = getCorsConfig();

    const testApp = new Elysia()
      .onAfterHandle(({ set }) => {
        const existingExposeHeaders =
          set.headers["access-control-expose-headers"] ??
          set.headers["Access-Control-Expose-Headers"];
        set.headers["access-control-expose-headers"] = mergeExposeHeaders(
          existingExposeHeaders,
          corsConfig.exposeHeaders
        );
      })
      .get("/auth-proxy", ({ set }) => {
        set.headers["access-control-expose-headers"] = "set-auth-token";
        set.headers["set-auth-token"] = "signed-token";
        return { success: true };
      });

    const response = await testApp.handle(
      new Request("http://localhost/auth-proxy", {
        headers: {
          Origin: "http://localhost:5173",
        },
      })
    );

    expect(response.headers.get("set-auth-token")).toBe("signed-token");
    expect(response.headers.get("access-control-expose-headers")).toBe(
      "set-auth-token"
    );
  });
});
