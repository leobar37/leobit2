import { Elysia } from "elysia";
import { auth } from "../lib/auth";

// Use .all() with parse:'none' instead of .mount() to avoid
// Bun/Elysia body stream hang (elysia#1747).
// parse:'none' (string) tells Elysia to skip body parsing,
// so Better Auth receives the raw unconsumed Request body.
export const authRoutes = new Elysia()
  .all("/api/auth/*", async ({ request }) => {
    try {
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
