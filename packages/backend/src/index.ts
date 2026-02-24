import { Elysia } from "elysia";
import { errorPlugin } from "./plugins/error-handler";
import { authHandler } from "./api/auth";
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
  .mount(authHandler)
  .get("/", () => ({
    message: "Avileo Backend API",
    version: "1.0.0",
    status: "running",
  }))
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }))
  .listen({
    port: Number(process.env.PORT) || 3000,
    hostname: "0.0.0.0",
  });

console.log(
  `🦊 Avileo backend running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
