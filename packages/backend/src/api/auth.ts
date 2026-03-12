import { Elysia } from "elysia";
import { auth } from "../lib/auth";

const isAuthDebugEnabled = process.env.NODE_ENV !== "production";

function debugAuthRoute(message: string, payload?: unknown) {
  if (!isAuthDebugEnabled) return;

  if (payload === undefined) {
    console.log(`[AuthRoute] ${message}`);
    return;
  }

  console.log(`[AuthRoute] ${message}`, payload);
}

// Use .all() with parse:'none' to let Better Auth receive the raw Request body.
// Elysia's default body parsing would consume the stream before Better Auth can read it.
export const authRoutes = new Elysia()
  .all("/api/auth/*", async ({ request, set }) => {
    try {
      debugAuthRoute("Incoming auth request", {
        method: request.method,
        pathname: new URL(request.url).pathname,
        origin: request.headers.get("origin"),
        hasAuthorization: Boolean(request.headers.get("authorization")),
        authorizationPreview: request.headers.get("authorization")?.slice(0, 24) ?? null,
      });

      const response = await auth.handler(request);
      const responseBody = await response.text();

      debugAuthRoute("Auth handler response", {
        method: request.method,
        pathname: new URL(request.url).pathname,
        status: response.status,
        hasSetAuthToken: response.headers.has("set-auth-token"),
        exposeHeaders: response.headers.get("access-control-expose-headers"),
      });

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
