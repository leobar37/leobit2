import { Elysia } from "elysia";
import { serve } from "inngest/bun";
import { errorPlugin } from "./plugins/error-handler";
import { authRoutes } from "./api/auth";
import { inngest } from "./lib/inngest";
import { whatsAppFunctions } from "./inngest/whatsapp-functions";
import { profileRoutes } from "./api/profile";
import { businessRoutes } from "./api/businesses";
import { invitationRoutes, publicInvitationRoutes } from "./api/invitations";

import { customerRoutes } from "./api/customers";
import { customerGroupRoutes } from "./api/customer-groups";
import { visitaRoutes } from "./api/visitas";
import { productRoutes } from "./api/products";
import { paymentRoutes } from "./api/payments";
import { distribucionRoutes } from "./api/distribuciones";
import { saleRoutes } from "./api/sales";
import { publicSaleRoutes } from "./api/public-sales";
import { publicPaymentRoutes } from "./api/public-payments";

import { reportRoutes } from "./api/reports";
import { assetRoutes } from "./api/assets";
import { fileRoutes } from "./api/files";
import { variantRoutes } from "./api/products";
import { supplierRoutes } from "./api/suppliers";
import { purchaseRoutes } from "./api/purchases";
import { productUnitsRoutes } from "./api/product-units";
import { ocrRoutes } from "./api/ocr";
import { whatsappTemplateRoutes } from "./api/whatsapp/templates";
import { whatsAppSettingsRoutes } from "./api/whatsapp/settings";
import { whatsAppMessageRoutes } from "./api/whatsapp/messages";
import { tagRoutes } from "./api/tags";
import { productCategoryRoutes } from "./api/product-categories";
import { puntoVentaRoutes } from "./api/puntos-venta";
import { mediaRoutes } from "./api/media";
import { getCorsConfig, getCorsOrigin, mergeExposeHeaders } from "./lib/cors";

const corsConfig = getCorsConfig();

const inngestHandler = serve({
  client: inngest,
  functions: whatsAppFunctions,
});

/**
 * Elysia app instance configured with all routes and plugins.
 * Use this for testing - it does NOT start the server.
 */
export const app = new Elysia()
  .use(errorPlugin)
  .options("/*", ({ request, set }) => {
    const requestOrigin = request.headers.get("origin");
    set.status = 204;
    set.headers["access-control-allow-origin"] = getCorsOrigin(requestOrigin);
    set.headers["access-control-allow-credentials"] = corsConfig.credentials;
    set.headers["access-control-allow-methods"] = corsConfig.methods;
    set.headers["access-control-allow-headers"] = corsConfig.headers;
    set.headers["access-control-expose-headers"] = corsConfig.exposeHeaders;
    set.headers["access-control-max-age"] = corsConfig.maxAge;
    return null;
  })
  .onAfterHandle(({ request, set }) => {
    const requestOrigin = request.headers.get("origin");
    set.headers["access-control-allow-origin"] = getCorsOrigin(requestOrigin);
    set.headers["access-control-allow-credentials"] = corsConfig.credentials;
    const existingExposeHeaders =
      (set.headers["access-control-expose-headers"] ??
      set.headers["Access-Control-Expose-Headers"]) as string | undefined;
    set.headers["access-control-expose-headers"] = mergeExposeHeaders(
      existingExposeHeaders,
      corsConfig.exposeHeaders
    );
  })
  .use(profileRoutes)
  .use(businessRoutes)
  .use(invitationRoutes)
  .use(publicInvitationRoutes)
  .use(customerRoutes)
  .use(customerGroupRoutes)
  .use(visitaRoutes)
  .use(productRoutes)
  .use(paymentRoutes)
  .use(distribucionRoutes)
  .use(saleRoutes)
  .use(publicSaleRoutes)
  .use(publicPaymentRoutes)
  .use(reportRoutes)
  .use(assetRoutes)
  .use(fileRoutes)
  .use(variantRoutes)
  .use(supplierRoutes)
  .use(purchaseRoutes)
  .use(productUnitsRoutes)
  .use(ocrRoutes)
  .use(whatsappTemplateRoutes)
  .use(whatsAppSettingsRoutes)
  .use(whatsAppMessageRoutes)
  .use(tagRoutes)
  .use(productCategoryRoutes)
  .use(puntoVentaRoutes)
  .use(mediaRoutes)
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
  .get("/api/inngest", async ({ request }) => inngestHandler(request))
  .post("/api/inngest", async ({ request }) => inngestHandler(request));

export type App = typeof app;
