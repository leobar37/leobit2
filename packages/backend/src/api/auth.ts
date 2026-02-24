import { Elysia } from "elysia";
import { auth } from "../lib/auth";

// Use .all() with parse:'none' instead of .mount() to avoid
// Bun/Elysia body stream hang (elysia#1747).
// parse:'none' (string) tells Elysia to skip body parsing,
// so Better Auth receives the raw unconsumed Request body.
export const authRoutes = new Elysia()
  .all("/api/auth/*", async ({ request }) => {
    try {
      // Debug: check if body stream is readable
      console.log("[Auth] Method:", request.method, "URL:", request.url);
      console.log("[Auth] Body locked?", request.body?.locked);
      console.log("[Auth] bodyUsed?", request.bodyUsed);

      // Read the body ourselves first to verify the stream is intact
      if (request.method !== "GET" && request.method !== "HEAD") {
        const bodyText = await request.text();
        console.log("[Auth] Body read OK, length:", bodyText.length, "content:", bodyText.substring(0, 200));

        // Create a new Request with the body text (not a stream)
        const newRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: bodyText,
        });
        const response = await auth.handler(newRequest);
        return response;
      }

      return await auth.handler(request);
    } catch (error) {
      console.error("[Auth Handler Error]", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "AUTH_HANDLER_ERROR",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }
  }, {
    parse: "none" as const,
  });
