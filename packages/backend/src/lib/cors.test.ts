import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { getCorsConfig, mergeExposeHeaders } from "./cors";

describe("mergeExposeHeaders", () => {
  it("keeps Better Auth exposed headers while appending default CORS headers", () => {
    expect(
      mergeExposeHeaders(
        "set-auth-token",
        "electric-offset, electric-handle, electric-schema, electric-cursor, electric-up-to-date"
      )
    ).toBe(
      "set-auth-token, electric-offset, electric-handle, electric-schema, electric-cursor, electric-up-to-date"
    );
  });

  it("deduplicates header names regardless of casing", () => {
    expect(
      mergeExposeHeaders(
        "Set-Auth-Token, electric-offset",
        "set-auth-token, Electric-Offset, electric-handle"
      )
    ).toBe("Set-Auth-Token, electric-offset, electric-handle");
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
      "set-auth-token, electric-offset, electric-handle, electric-schema, electric-cursor, electric-up-to-date"
    );
  });
});
