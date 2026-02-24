import { Elysia } from "elysia";
import { sql } from "drizzle-orm";
import { errorPlugin } from "./plugins/error-handler";
import { db } from "./lib/db";
import { auth } from "./lib/auth";
import { authRoutes } from "./api/auth";
import { profileRoutes } from "./api/profile";
import { businessRoutes } from "./api/businesses";
import { invitationRoutes, publicInvitationRoutes } from "./api/invitations";
import { customerRoutes } from "./api/customers";
import { productRoutes } from "./api/products";
import { paymentRoutes } from "./api/payments";
import { inventoryRoutes } from "./api/inventory";
import { distribucionRoutes } from "./api/distribuciones";
import { saleRoutes } from "./api/sales";
import { closingRoutes } from "./api/closings";
import { reportRoutes } from "./api/reports";
import { syncRoutes } from "./api/sync";
import { assetRoutes } from "./api/assets";
import { fileRoutes } from "./api/files";
import { variantRoutes } from "./api/products";
import { supplierRoutes } from "./api/suppliers";
import { purchaseRoutes } from "./api/purchases";
import { paymentMethodConfigRoutes } from "./api/businesses/payment-methods";
import { getCorsConfig, getCorsOrigin } from "./lib/cors";

const corsConfig = getCorsConfig();

const app = new Elysia()
  .use(errorPlugin)
  .options("/*", ({ request, set }) => {
    const requestOrigin = request.headers.get("origin");
    set.status = 204;
    set.headers["access-control-allow-origin"] = getCorsOrigin(requestOrigin);
    set.headers["access-control-allow-credentials"] = corsConfig.credentials;
    set.headers["access-control-allow-methods"] = corsConfig.methods;
    set.headers["access-control-allow-headers"] = corsConfig.headers;
    set.headers["access-control-max-age"] = corsConfig.maxAge;
    return null;
  })
  .onAfterHandle(({ request, set }) => {
    const requestOrigin = request.headers.get("origin");
    set.headers["access-control-allow-origin"] = getCorsOrigin(requestOrigin);
    set.headers["access-control-allow-credentials"] = corsConfig.credentials;
  })
  .use(profileRoutes)
  .use(businessRoutes)
  .use(invitationRoutes)
  .use(publicInvitationRoutes)
  .use(customerRoutes)
  .use(productRoutes)
  .use(paymentRoutes)
  .use(inventoryRoutes)
  .use(distribucionRoutes)
  .use(saleRoutes)
  .use(closingRoutes)
  .use(reportRoutes)
  .use(syncRoutes)
  .use(assetRoutes)
  .use(fileRoutes)
  .use(variantRoutes)
  .use(supplierRoutes)
  .use(purchaseRoutes)
  .use(paymentMethodConfigRoutes)
  .use(authRoutes)
  .get("/", () => ({
    message: "Avileo Backend API",
    version: "1.0.0",
    status: "running",
  }))
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }))
  .get("/health/db", async ({ set }) => {
    const start = Date.now();
    try {
      const dbUrl = process.env.DATABASE_URL;
      console.log("[health/db] DATABASE_URL exists:", !!dbUrl, "length:", dbUrl?.length ?? 0);

      if (!dbUrl) {
        set.status = 500;
        return {
          status: "error",
          error: "DATABASE_URL is not set",
          env_keys: Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("DOPPLER") || k.includes("BETTER_AUTH")),
          timestamp: new Date().toISOString(),
        };
      }

      // Test raw DB connectivity with timeout
      const pingResult = await Promise.race([
        db.execute(sql`SELECT 1 as ping`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB ping timed out after 10s")), 10000)),
      ]);
      const pingMs = Date.now() - start;

      // Count users to verify schema access
      const userCount = await Promise.race([
        db.execute(sql`SELECT count(*) as count FROM "user"`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("User count query timed out after 10s")), 10000)),
      ]);
      const totalMs = Date.now() - start;

      return {
        status: "connected",
        ping: (pingResult as any).rows?.[0] ?? null,
        userCount: (userCount as any).rows?.[0] ?? null,
        latency: { pingMs, totalMs },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const ms = Date.now() - start;
      set.status = 500;
      return {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        latencyMs: ms,
        timestamp: new Date().toISOString(),
      };
    }
  })
  .get("/debug/auth-direct", async ({ set }) => {
    try {
      console.log("[Debug] Calling auth.api.signInEmail directly...");
      const start = Date.now();

      const result = await Promise.race([
        auth.api.signInEmail({
          body: {
            email: "demo@avileo.com",
            password: "demo123456",
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("auth.api.signInEmail timed out after 15s")), 15000)
        ),
      ]);

      const ms = Date.now() - start;
      console.log("[Debug] auth.api.signInEmail returned in", ms, "ms", result);

      return {
        status: "success",
        latencyMs: ms,
        result,
      };
    } catch (error) {
      console.error("[Debug] auth.api.signInEmail error:", error);
      set.status = 500;
      return {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })
  .listen({
    port: Number(process.env.PORT) || 3000,
    hostname: "0.0.0.0",
  });

console.log(
  `🦊 Avileo backend running at http://${app.server?.hostname}:${app.server?.port}`
);

// Startup diagnostics
console.log("[Startup] DATABASE_URL set:", !!process.env.DATABASE_URL, "length:", process.env.DATABASE_URL?.length ?? 0);
console.log("[Startup] BETTER_AUTH_BASE_URL:", process.env.BETTER_AUTH_BASE_URL ?? "NOT SET");

export type App = typeof app;
