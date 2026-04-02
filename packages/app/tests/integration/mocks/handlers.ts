/**
 * MSW Handlers for Integration Tests
 *
 * Complete API mocking for testing hooks and features in isolation.
 */

import { http, HttpResponse } from "msw";

// ============================================================================
// Test Data
// ============================================================================

export const mockCustomers = [
  {
    id: "cust-1",
    name: "Juan Perez",
    dni: "12345678",
    phone: "+51 999 888 777",
    address: "Av. Principal 123",
    notes: null,
    businessId: "biz-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    syncStatus: "synced",
  },
  {
    id: "cust-2",
    name: "Maria Garcia",
    dni: "87654321",
    phone: "+51 999 777 666",
    address: "Calle Secundaria 456",
    notes: null,
    businessId: "biz-1",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    syncStatus: "synced",
  },
];

export const mockProducts = [
  {
    id: "prod-1",
    name: "Pollo Entero",
    type: "pollo",
    unit: "kg",
    basePrice: "12.50",
    isActive: true,
    businessId: "biz-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-2",
    name: "Pollo Trozado",
    type: "pollo",
    unit: "kg",
    basePrice: "14.00",
    isActive: true,
    businessId: "biz-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const mockVariants = [
  {
    id: "var-1-1",
    productId: "prod-1",
    name: "Entero 2kg",
    sku: "POL-ENT-2KG",
    unitQuantity: "1",
    price: "25.00",
    isActive: true,
    inventory: { quantity: "100" },
  },
  {
    id: "var-2-1",
    productId: "prod-2",
    name: "Trozado Premium",
    sku: "POL-TRO-PRE",
    unitQuantity: "1",
    price: "28.00",
    isActive: true,
    inventory: { quantity: "50" },
  },
];

export let mockSales: Array<{
  id: string;
  businessId: string;
  customerId: string | null;
  sellerId: string;
  saleType: "contado" | "credito";
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  items: Array<{
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  createdAt: string;
}> = [];

// ============================================================================
// Handlers
// ============================================================================

export const integrationHandlers = [
  // Auth
  http.get("/api/auth/session", () => {
    return HttpResponse.json({
      data: {
        user: {
          id: "user-1",
          email: "demo@avileo.com",
          name: "Usuario Demo",
        },
      },
    });
  }),

  // Business
  http.get("/api/business", () => {
    return HttpResponse.json({
      data: {
        id: "biz-1",
        name: "Avileo Demo",
        modoOperacion: "libre",
        controlKilos: true,
      },
    });
  }),

  // Customers
  http.get("/api/customers", () => {
    return HttpResponse.json({ data: mockCustomers });
  }),

  http.post("/api/customers", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      dni?: string;
      phone?: string;
    };
    const newCustomer = {
      id: `cust-${Date.now()}`,
      ...body,
      businessId: "biz-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "synced",
    };
    mockCustomers.push(newCustomer);
    return HttpResponse.json({ data: newCustomer });
  }),

  // Products
  http.get("/api/products", () => {
    return HttpResponse.json({ data: mockProducts });
  }),

  // Variants
  http.get("/api/products/:productId/variants", ({ params }) => {
    const variants = mockVariants.filter((v) => v.productId === params.productId);
    return HttpResponse.json({ data: variants });
  }),

  http.get("/api/variants", () => {
    return HttpResponse.json({ data: mockVariants });
  }),

  // Sales
  http.get("/api/sales", () => {
    return HttpResponse.json({ data: mockSales });
  }),

  http.post("/api/sales", async ({ request }) => {
    const body = (await request.json()) as {
      customerId?: string;
      saleType: "contado" | "credito";
      totalAmount: number;
      amountPaid: number;
      items: Array<{
        productId: string;
        productName: string;
        variantId: string;
        variantName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }>;
    };

    const newSale = {
      id: `sale-${Date.now()}`,
      businessId: "biz-1",
      customerId: body.customerId || null,
      sellerId: "seller-1",
      saleType: body.saleType,
      totalAmount: body.totalAmount.toFixed(2),
      amountPaid: body.amountPaid.toFixed(2),
      balanceDue: (body.totalAmount - body.amountPaid).toFixed(2),
      items: body.items,
      createdAt: new Date().toISOString(),
    };

    mockSales.push(newSale);
    return HttpResponse.json({ data: newSale });
  }),

  // Inventory
  http.get("/api/inventory", () => {
    return HttpResponse.json({
      data: mockProducts.map((p) => ({
        productId: p.id,
        productName: p.name,
        quantity: "100",
        unit: p.unit,
      })),
    });
  }),
];

// Reset function for tests
export function resetIntegrationMocks() {
  mockSales = [];
  // Reset customers to initial state
  mockCustomers.length = 0;
  mockCustomers.push(
    {
      id: "cust-1",
      name: "Juan Perez",
      dni: "12345678",
      phone: "+51 999 888 777",
      address: "Av. Principal 123",
      notes: null,
      businessId: "biz-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      syncStatus: "synced",
    },
    {
      id: "cust-2",
      name: "Maria Garcia",
      dni: "87654321",
      phone: "+51 999 777 666",
      address: "Calle Secundaria 456",
      notes: null,
      businessId: "biz-1",
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      syncStatus: "synced",
    }
  );
}
