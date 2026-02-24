import { Elysia } from "elysia";
import { auth } from "../lib/auth";

// Use .all() with parse:'none' instead of .mount() to avoid
// Bun/Elysia body stream hang (elysia#1747).
// parse:'none' (string) tells Elysia to skip body parsing,
// so Better Auth receives the raw unconsumed Request body.
export const authRoutes = new Elysia()
  .all("/api/auth/*", async ({ request, set }) => {
    try {
      // Debug: check if body stream is readable
      console.log("[Auth] Method:", request.method, "URL:", request.url);

      let authRequest = request;

      // For POST/PUT/PATCH: read body and create new Request
      // to avoid body stream issues with Bun
      if (request.method !== "GET" && request.method !== "HEAD") {
        const bodyText = await request.text();
        console.log("[Auth] Body read OK, length:", bodyText.length);
        authRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: bodyText,
        });
      }

      console.log("[Auth] Calling auth.handler...");
      const response = await auth.handler(authRequest);
      console.log("[Auth] auth.handler returned, status:", response.status);

      // Extract response data and set via Elysia's set mechanism
      // instead of returning raw Response (which Elysia may not handle correctly in .all())
      const responseBody = await response.text();
      console.log("[Auth] Response body length:", responseBody.length);

      set.status = response.status;
      // Copy response headers
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
