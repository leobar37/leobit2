import { Elysia } from "elysia";
import { auth } from "../lib/auth";

// Use .all() with parse:'none' instead of .mount() to avoid
// Bun/Elysia body stream hang (elysia#1747).
// parse:'none' (string) tells Elysia to skip body parsing,
// so Better Auth receives the raw unconsumed Request body.
export const authRoutes = new Elysia()
  .all("/api/auth/*", async ({ request, set }) => {
    try {
      console.log("[Auth] Method:", request.method, "URL:", request.url);
      console.log("[Auth] bodyUsed:", request.bodyUsed, "body locked:", request.body?.locked);

      if (request.method !== "GET" && request.method !== "HEAD") {
        // Read body and create a fresh Request with string body
        // to avoid any body stream issues
        const bodyText = await request.text();
        console.log("[Auth] Body:", bodyText);
        const url = new URL(request.url);
        console.log("[Auth] Path:", url.pathname);

        // Test: can we create a Request and read its body in Bun?
        const testReq = new Request("http://localhost:3000/test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: bodyText,
        });
        console.log("[Auth] Test req bodyUsed:", testReq.bodyUsed);
        const testBody = await testReq.json();
        console.log("[Auth] Test body read OK:", JSON.stringify(testBody));

        // Now create the REAL request for Better Auth
        const authReq = new Request(request.url, {
          method: request.method,
          headers: new Headers(request.headers),
          body: bodyText,
        });
        console.log("[Auth] Created auth request, calling auth.handler...");

        // Add a timeout race to detect if auth.handler hangs
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("auth.handler timed out after 10s")), 10000)
        );
        const response = await Promise.race([
          auth.handler(authReq),
          timeoutPromise,
        ]);
        console.log("[Auth] auth.handler returned, status:", response.status);

        const responseBody = await response.text();
        set.status = response.status;
        response.headers.forEach((value, key) => {
          set.headers[key] = value;
        });
        return responseBody;
      }

      // GET requests
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
