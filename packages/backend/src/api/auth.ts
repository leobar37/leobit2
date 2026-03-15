import { Elysia } from "elysia";
import { auth } from "../lib/auth";

const isAuthDebugEnabled = process.env.NODE_ENV !== "production";

const AUTH_HANDLER_TIMEOUT_MS = 10000; // 10 second timeout

function debugAuthRoute(message: string, payload?: unknown) {
  if (!isAuthDebugEnabled) return;

  if (payload === undefined) {
    console.log(`[AuthRoute] ${message}`);
    return;
  }

  console.log(`[AuthRoute] ${message}`, payload);
}

/**
 * Wrap a promise with a timeout to prevent indefinite hangs
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
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

      const response = await withTimeout(
        auth.handler(request),
        AUTH_HANDLER_TIMEOUT_MS,
        "Auth handler"
      );

      // Also wrap response.text() with timeout since it can hang on slow responses
      const responseBody = await withTimeout(
        response.text(),
        5000,
        "Auth response body read"
      );

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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isTimeout = errorMessage.includes("timed out");

      console.error("[Auth Handler Error]", errorMessage);

      set.status = isTimeout ? 504 : 500;
      set.headers["content-type"] = "application/json";
      return JSON.stringify({
        success: false,
        error: {
          code: isTimeout ? "AUTH_TIMEOUT" : "AUTH_HANDLER_ERROR",
          message: errorMessage,
        },
      });
    }
  }, {
    parse: "none" as const,
  });
