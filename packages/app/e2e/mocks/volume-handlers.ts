/**
 * Volume MSW Handlers for E2E Tests
 *
 * These handlers provide paginated mocking for volume testing with 1000+ records.
 * Supports FR-015: Volume Testing and FR-016: Performance Testing
 */

import { http, HttpResponse } from "msw";
import { generateCustomers, type Customer } from "./factories/customer.factory";
import { generateProducts, generateProductVariant, type Product, type ProductVariant } from "./factories/product.factory";
import { generateSales, type Sale } from "./factories/sale.factory";
import { generateOrders, type Order } from "./factories/order.factory";

// ============================================================================
// Volume Data Store
// ============================================================================

interface VolumeData {
  customers: Customer[];
  products: Product[];
  variants: ProductVariant[];
  sales: Sale[];
  orders: Order[];
}

let volumeData: VolumeData = {
  customers: [],
  products: [],
  variants: [],
  sales: [],
  orders: [],
};

// ============================================================================
// Initialization Functions
// ============================================================================

export function initializeVolumeData(options: {
  customers?: number;
  products?: number;
  sales?: number;
  orders?: number;
} = {}) {
  const {
    customers = 100,
    products = 20,
    sales = 200,
    orders = 50,
  } = options;

  volumeData.customers = generateCustomers(customers);
  volumeData.products = generateProducts(products);

  // Generate variants from products
  volumeData.variants = [];
  for (const product of volumeData.products) {
    if (product.hasVariants && product.variants) {
      volumeData.variants.push(...product.variants);
    } else {
      // Generate default variants for products without variants
      const variant1 = generateProductVariant(product.id, 0, parseFloat(product.basePrice));
      const variant2 = generateProductVariant(product.id, 1, parseFloat(product.basePrice) * 1.5);
      volumeData.variants.push(variant1, variant2);
    }
  }

  volumeData.sales = generateSales(sales, { businessId: "biz-demo" });
  volumeData.orders = generateOrders(orders, { businessId: "biz-demo" });
}

export function resetVolumeData() {
  volumeData = {
    customers: [],
    products: [],
    variants: [],
    sales: [],
    orders: [],
  };
}

// ============================================================================
// Paginated Response Helper
// ============================================================================

interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

function createPaginatedResponse<T>(data: T[], limit: number, offset: number) {
  const paginated = data.slice(offset, offset + limit);
  const meta: PaginationMeta = {
    total: data.length,
    limit,
    offset,
    hasMore: offset + limit < data.length,
  };

  return HttpResponse.json({
    success: true,
    data: paginated,
    meta,
  });
}

// ============================================================================
// MSW Handlers
// ============================================================================

export const volumeHandlers = [
  // ======================================================================
  // Customers API - Paginated
  // ======================================================================
  http.get("/api/customers", ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const search = url.searchParams.get("search");

    let customers = [...volumeData.customers];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.dni?.includes(search) ||
          c.phone?.includes(search)
      );
    }

    return createPaginatedResponse(customers, limit, offset);
  }),

  // ======================================================================
  // Products API - Paginated
  // ======================================================================
  http.get("/api/products", ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const type = url.searchParams.get("type");

    let products = [...volumeData.products];

    // Apply type filter
    if (type) {
      products = products.filter((p) => p.type === type);
    }

    return createPaginatedResponse(products, limit, offset);
  }),

  // ======================================================================
  // Product Variants API - Paginated
  // ======================================================================
  http.get("/api/variants", ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const productId = url.searchParams.get("productId");

    let variants = [...volumeData.variants];

    // Filter by product if provided
    if (productId) {
      variants = variants.filter((v) => v.productId === productId);
    }

    return createPaginatedResponse(variants, limit, offset);
  }),

  // ======================================================================
  // Sales API - Paginated with Filters
  // ======================================================================
  http.get("/api/sales", ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const saleType = url.searchParams.get("saleType");
    const status = url.searchParams.get("status");

    let sales = [...volumeData.sales];

    // Apply date filters
    if (startDate) {
      sales = sales.filter((s) => s.saleDate >= startDate);
    }
    if (endDate) {
      sales = sales.filter((s) => s.saleDate <= endDate);
    }

    // Apply saleType filter
    if (saleType) {
      sales = sales.filter((s) => s.saleType === saleType);
    }

    // Apply status filter
    if (status) {
      sales = sales.filter((s) => s.status === status);
    }

    // Sort by saleDate descending (most recent first)
    sales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

    return createPaginatedResponse(sales, limit, offset);
  }),

  // ======================================================================
  // Orders API - Paginated with Filters
  // ======================================================================
  http.get("/api/orders", ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const status = url.searchParams.get("status");
    const paymentStatus = url.searchParams.get("paymentStatus");

    let orders = [...volumeData.orders];

    // Apply status filter
    if (status) {
      orders = orders.filter((o) => o.status === status);
    }

    // Apply paymentStatus filter
    if (paymentStatus) {
      orders = orders.filter((o) => o.paymentStatus === paymentStatus);
    }

    // Sort by deliveryDate descending
    orders.sort(
      (a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
    );

    return createPaginatedResponse(orders, limit, offset);
  }),

  // ======================================================================
  // Business Users API - Static for volume tests
  // ======================================================================
  http.get("/api/business-users/me", () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: "biz-user-volume",
        userId: "user-volume",
        businessId: "biz-demo",
        role: "ADMIN_NEGOCIO",
        salesPoint: "Punto de Venta Volumen",
      },
    });
  }),

  // ======================================================================
  // Business API - Static for volume tests
  // ======================================================================
  http.get("/api/business", () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: "biz-demo",
        name: "Avileo Volumen Demo",
        ruc: "12345678901",
        address: "Av. Volumen 123",
        phone: "+51 999 888 777",
        email: "volumen@avileo.com",
        modoOperacion: "libre",
        controlKilos: true,
        usarDistribucion: false,
        permitirVentaSinStock: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    });
  }),

  // ======================================================================
  // Auth API - Simplified for volume tests
  // ======================================================================
  http.post("/api/auth/sign-in/email", async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    return HttpResponse.json({
      user: {
        id: "user-volume",
        email: body.email ?? "volumen@avileo.com",
        name: "Usuario Volumen",
        role: "ADMIN_NEGOCIO",
      },
      session: {
        id: "session-volume",
        userId: "user-volume",
        token: "mock-jwt-token-volume",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  }),

  http.get("/api/auth/session", () => {
    return HttpResponse.json({
      user: {
        id: "user-volume",
        email: "volumen@avileo.com",
        name: "Usuario Volumen",
        role: "ADMIN_NEGOCIO",
      },
      session: {
        id: "session-volume",
        userId: "user-volume",
        token: "mock-jwt-token-volume",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  }),

  // ======================================================================
  // Sync API - Minimal implementation for volume tests
  // ======================================================================
  http.post("/api/sync/batch", async ({ request }) => {
    const body = await request.json() as {
      operations: Array<{
        idempotencyKey: string;
        entityType: string;
        entityId: string;
        operation: "create" | "update" | "delete";
        payload: Record<string, unknown>;
        localVersion: number;
        localTimestamp: string;
        syncGroupId?: string;
      }>;
    };

    const results = body.operations.map((op) => ({
      idempotencyKey: op.idempotencyKey,
      success: true,
    }));

    return HttpResponse.json({
      success: true,
      data: { results },
    });
  }),

  http.get("/api/sync/changes", ({ request }) => {
    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const entityTypes = url.searchParams.get("entityTypes")?.split(",").filter(Boolean) || [];

    return HttpResponse.json({
      success: true,
      data: {
        changes: [],
        nextSince: since || new Date().toISOString(),
        hasMore: false,
        serverTimestamp: new Date().toISOString(),
      },
    });
  }),

  http.get("/api/sync/conflicts", () => {
    return HttpResponse.json({
      success: true,
      data: {
        conflicts: [],
        pendingCount: 0,
        pagination: { limit: 50, offset: 0, hasMore: false },
      },
    });
  }),
];

// Alias export for compatibility with index.ts barrel export pattern
export const handlers = volumeHandlers;

// ============================================================================
// Utility Functions for Tests
// ============================================================================

export function getVolumeData(): VolumeData {
  return volumeData;
}

export function getVolumeCustomers(): Customer[] {
  return volumeData.customers;
}

export function getVolumeProducts(): Product[] {
  return volumeData.products;
}

export function getVolumeVariants(): ProductVariant[] {
  return volumeData.variants;
}

export function getVolumeSales(): Sale[] {
  return volumeData.sales;
}

export function getVolumeOrders(): Order[] {
  return volumeData.orders;
}
