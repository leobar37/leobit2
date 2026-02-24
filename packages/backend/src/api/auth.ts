import { Elysia } from "elysia";
import { auth } from "../lib/auth";

// Use .all() with parse:'none' to let Better Auth receive the raw Request body.
// Elysia's default body parsing would consume the stream before Better Auth can read it.
export const authRoutes = new Elysia()
  .all("/api/auth/*", async ({ request, set }) => {
    try {
      const response = await auth.handler(request);
      const responseBody = await response.text();
      set.status = response.status;
      response.headers.forEach((value, key) => {
        set.headers[key] = value;
      });
      return responseBody;
    } catch (error) {
      console.error("[Auth Handler Error]", error);
      set.status = 500;
      set.headers["content-type"] = "application/json";
      return JSON.stringify({
        success: false,
        error: {
          code: "AUTH_HANDLER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }, {
    parse: "none" as const,
  });
