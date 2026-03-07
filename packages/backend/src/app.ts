import { Elysia } from "elysia";
import { serve } from "inngest/bun";
import { errorPlugin } from "./plugins/error-handler";
import { authRoutes } from "./api/auth";
import { inngest } from "./lib/inngest";
import { whatsAppFunctions } from "./inngest/whatsapp-functions";
import { profileRoutes } from "./api/profile";
import { businessRoutes } from "./api/businesses";
import { invitationRoutes, publicInvitationRoutes } from "./api/invitations";
import { publicOrderRoutes } from "./api/public-orders";
import { publicPedidoRoutes } from "./api/public-pedidos";
import { customerRoutes } from "./api/customers";
import { productRoutes } from "./api/products";
import { paymentRoutes } from "./api/payments";
import { inventoryRoutes } from "./api/inventory";
import { distribucionRoutes } from "./api/distribuciones";
import { saleRoutes } from "./api/sales";
import { orderRoutes } from "./api/orders";
import { closingRoutes } from "./api/closings";
import { reportRoutes } from "./api/reports";
import { syncRoutes } from "./api/sync";
import { assetRoutes } from "./api/assets";
import { fileRoutes } from "./api/files";
import { variantRoutes } from "./api/products";
import { supplierRoutes } from "./api/suppliers";
import { purchaseRoutes } from "./api/purchases";
import { productUnitsRoutes } from "./api/product-units";
import { paymentMethodConfigRoutes } from "./api/businesses/payment-methods";
import { ocrRoutes } from "./api/ocr";
import { whatsappTemplateRoutes } from "./api/whatsapp/templates";
import { whatsAppSettingsRoutes } from "./api/whatsapp/settings";
import { whatsAppMessageRoutes } from "./api/whatsapp/messages";
import { tagRoutes } from "./api/tags";
import { getCorsConfig, getCorsOrigin } from "./lib/cors";

const corsConfig = getCorsConfig();

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
  .use(publicOrderRoutes)
  .use(publicPedidoRoutes)
  .use(customerRoutes)
  .use(productRoutes)
  .use(paymentRoutes)
  .use(inventoryRoutes)
  .use(distribucionRoutes)
  .use(saleRoutes)
  .use(orderRoutes)
  .use(closingRoutes)
  .use(reportRoutes)
  .use(syncRoutes)
  .use(assetRoutes)
  .use(fileRoutes)
  .use(variantRoutes)
  .use(supplierRoutes)
  .use(purchaseRoutes)
  .use(productUnitsRoutes)
  .use(paymentMethodConfigRoutes)
  .use(ocrRoutes)
  .use(whatsappTemplateRoutes)
  .use(whatsAppSettingsRoutes)
  .use(whatsAppMessageRoutes)
  .use(tagRoutes)
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
  .use(
    "/api/inngest",
    serve({
      client: inngest,
      functions: whatsAppFunctions,
    })
  );

export type App = typeof app;
