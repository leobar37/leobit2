import { Elysia } from "elysia";
import { auth } from "../lib/auth";
import { getCorsConfig, getCorsOrigin } from "../lib/cors";

const corsConfig = getCorsConfig();

export const authRoutes = new Elysia()
  .onRequest(({ request, set }) => {
    if (request.method === "OPTIONS") {
      const requestOrigin = request.headers.get("origin");
      set.status = 204;
      set.headers["access-control-allow-origin"] = getCorsOrigin(requestOrigin);
      set.headers["access-control-allow-credentials"] = corsConfig.credentials;
      set.headers["access-control-allow-methods"] = corsConfig.methods;
      set.headers["access-control-allow-headers"] = corsConfig.headers;
      set.headers["access-control-max-age"] = corsConfig.maxAge;
    }
  })
  .all("/*", async ({ request, set }) => {
    console.log(`[AUTH] Starting handler for ${request.method} ${request.url}`);
    try {
      console.log(`[AUTH] Calling auth.handler...`);
      const startTime = Date.now();
      
      const response = await auth.handler(request);
      
      const duration = Date.now() - startTime;
      console.log(`[AUTH] auth.handler completed in ${duration}ms, status: ${response.status}`);

      set.status = response.status;

      const newHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        newHeaders[key] = value;
      });
      const requestOrigin = request.headers.get("origin");
      newHeaders["access-control-allow-origin"] = getCorsOrigin(requestOrigin);
      newHeaders["access-control-allow-credentials"] = corsConfig.credentials;

      set.headers = newHeaders;

      if (!response.body) {
        console.log(`[AUTH] No response body`);
        return null;
      }

      console.log(`[AUTH] Reading response body...`);
      const bodyText = await response.text();
      console.log(`[AUTH] Response body: ${bodyText.substring(0, 200)}...`);
      
      try {
        return JSON.parse(bodyText);
      } catch {
        return bodyText;
      }
    } catch (error) {
      console.error(`[AUTH ERROR]`, error);
      set.status = 500;
      return {
        success: false,
        error: {
          code: "AUTH_HANDLER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  });
