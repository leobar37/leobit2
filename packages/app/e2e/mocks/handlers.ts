/**
 * Enhanced API Mock Handlers for E2E Tests
 *
 * These handlers provide complete mocking for the sales flow.
 * They match the actual API responses used by the Avileo app.
 */

import { http, HttpResponse } from "msw";

// ============================================================================
// Types matching backend schema
// ============================================================================

interface Customer {
  id: string;
  name: string;
  dni: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  businessId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: "pending" | "synced" | "error";
}

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  unitQuantity: string;
  price: string;
  isActive: boolean;
  inventory?: {
    quantity: string;
  };
}

interface Product {
  id: string;
  name: string;
  type: "pollo" | "carne" | "otros";
  unit: "kg" | "unidad";
  basePrice: string;
  isActive: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

interface SaleItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Sale {
  id: string;
  businessId: string;
  customerId: string | null;
  sellerId: string;
  saleType: "contado" | "credito";
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara: string;
  netWeight: string | null;
  syncStatus: "pending" | "synced" | "error";
  saleDate: string;
  createdAt: string;
  items: SaleItem[];
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface BusinessUser {
  id: string;
  userId: string;
  businessId: string;
  role: string;
  salesPoint: string;
}

// ============================================================================
// Test Data - Matches seeder data
// ============================================================================

const TEST_USER: User = {
  id: "user-demo",
  email: "demo@avileo.com",
  name: "Usuario Demo",
  role: "ADMIN_NEGOCIO",
};

const BUSINESS_USER: BusinessUser = {
  id: "biz-user-1",
  userId: "user-demo",
  businessId: "biz-1",
  role: "ADMIN_NEGOCIO",
  salesPoint: "Oficina Principal",
};

let customers: Customer[] = [
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
  {
    id: "cust-3",
    name: "Carlos Rodriguez",
    dni: "45678912",
    phone: "+51 999 666 555",
    address: "Jr. Comercio 789",
    notes: null,
    businessId: "biz-1",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
    syncStatus: "synced",
  },
  {
    id: "cust-4",
    name: "Ana Lopez",
    dni: "78912345",
    phone: "+51 999 555 444",
    address: "Av. Los Pinos 321",
    notes: null,
    businessId: "biz-1",
    createdAt: "2024-01-04T00:00:00Z",
    updatedAt: "2024-01-04T00:00:00Z",
    syncStatus: "synced",
  },
  {
    id: "cust-5",
    name: "Luis Martinez",
    dni: "32165498",
    phone: "+51 999 444 333",
    address: "Calle Las Flores 654",
    notes: null,
    businessId: "biz-1",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-05T00:00:00Z",
    syncStatus: "synced",
  },
];

const products: Product[] = [
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
  {
    id: "prod-3",
    name: "Filete de Pechuga",
    type: "pollo",
    unit: "kg",
    basePrice: "18.00",
    isActive: true,
    businessId: "biz-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "prod-4",
    name: "Alitas",
    type: "pollo",
    unit: "unidad",
    basePrice: "15.00",
    isActive: true,
    businessId: "biz-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const productVariants: ProductVariant[] = [
  // Pollo Entero variants
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
    id: "var-1-2",
    productId: "prod-1",
    name: "Entero 2.5kg",
    sku: "POL-ENT-25KG",
    unitQuantity: "1",
    price: "30.00",
    isActive: true,
    inventory: { quantity: "80" },
  },
  // Pollo Trozado variants
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
  {
    id: "var-2-2",
    productId: "prod-2",
    name: "Trozado Standard",
    sku: "POL-TRO-STD",
    unitQuantity: "1",
    price: "24.00",
    isActive: true,
    inventory: { quantity: "60" },
  },
  // Filete de Pechuga variants
  {
    id: "var-3-1",
    productId: "prod-3",
    name: "Pechuga Premium",
    sku: "FIL-PCH-PRE",
    unitQuantity: "1",
    price: "32.00",
    isActive: true,
    inventory: { quantity: "40" },
  },
  {
    id: "var-3-2",
    productId: "prod-3",
    name: "Pechuga Standard",
    sku: "FIL-PCH-STD",
    unitQuantity: "1",
    price: "28.00",
    isActive: true,
    inventory: { quantity: "45" },
  },
  // Alitas variants (unit-based)
  {
    id: "var-4-1",
    productId: "prod-4",
    name: "Pack 10 unidades",
    sku: "ALI-PCK-10",
    unitQuantity: "10",
    price: "15.00",
    isActive: true,
    inventory: { quantity: "200" },
  },
  {
    id: "var-4-2",
    productId: "prod-4",
    name: "Pack 20 unidades",
    sku: "ALI-PCK-20",
    unitQuantity: "20",
    price: "28.00",
    isActive: true,
    inventory: { quantity: "150" },
  },
];

let sales: Sale[] = [];

// ============================================================================
// API Handlers
// ============================================================================

export const handlers = [
  // ==========================================================================
  // Auth API
  // ==========================================================================
  http.post("/api/auth/sign-in/email", async () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: TEST_USER,
        session: {
          id: "session-1",
          userId: TEST_USER.id,
          token: "mock-jwt-token",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });
  }),

  http.get("/api/auth/session", () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: TEST_USER,
        session: {
          id: "session-1",
          userId: TEST_USER.id,
          token: "mock-jwt-token",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });
  }),

  // ==========================================================================
  // Business Users API
  // ==========================================================================
  http.get("/api/business-users/me", () => {
    return HttpResponse.json({
      success: true,
      data: BUSINESS_USER,
    });
  }),

  // ==========================================================================
  // Business API
  // ==========================================================================
  http.get("/api/business", () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: "biz-1",
        name: "Pollos Pro Demo",
        ruc: "12345678901",
        address: "Av. Principal 123",
        phone: "+51 999 888 777",
        email: "demo@avileo.com",
        modoOperacion: "libre",
        controlKilos: true,
        usarDistribucion: false,
        permitirVentaSinStock: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    });
  }),

  // ==========================================================================
  // Customers API
  // ==========================================================================
  http.get("/api/customers", () => {
    return HttpResponse.json({
      success: true,
      data: customers,
    });
  }),

  http.get("/api/customers/:id", ({ params }) => {
    const customer = customers.find((c) => c.id === params.id);
    if (!customer) {
      return HttpResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: customer,
    });
  }),

  http.post("/api/customers", async ({ request }) => {
    const body = (await request.json()) as Partial<Customer>;
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: body.name || "New Customer",
      dni: body.dni || null,
      phone: body.phone || null,
      address: body.address || null,
      notes: body.notes || null,
      businessId: "biz-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "synced",
    };
    customers.push(newCustomer);
    return HttpResponse.json({
      success: true,
      data: newCustomer,
    });
  }),

  // ==========================================================================
  // Products API
  // ==========================================================================
  http.get("/api/products", () => {
    return HttpResponse.json({
      success: true,
      data: products,
    });
  }),

  http.get("/api/products/:id", ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    if (!product) {
      return HttpResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: product,
    });
  }),

  // ==========================================================================
  // Product Variants API
  // ==========================================================================
  http.get("/api/products/:productId/variants", ({ params }) => {
    const variants = productVariants.filter((v) => v.productId === params.productId);
    return HttpResponse.json({
      success: true,
      data: variants,
    });
  }),

  http.get("/api/variants", () => {
    return HttpResponse.json({
      success: true,
      data: productVariants,
    });
  }),

  // ==========================================================================
  // Sales API
  // ==========================================================================
  http.get("/api/sales", () => {
    return HttpResponse.json({
      success: true,
      data: sales,
    });
  }),

  http.get("/api/sales/today-stats", () => {
    const todaySales = sales.filter((s) => {
      const saleDate = new Date(s.saleDate).toDateString();
      const today = new Date().toDateString();
      return saleDate === today;
    });

    const totalSales = todaySales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
    const totalTransactions = todaySales.length;

    return HttpResponse.json({
      success: true,
      data: {
        totalSales,
        totalTransactions,
        averageTicket: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      },
    });
  }),

  http.get("/api/sales/:id", ({ params }) => {
    const sale = sales.find((s) => s.id === params.id);
    if (!sale) {
      return HttpResponse.json(
        { success: false, error: "Sale not found" },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: sale,
    });
  }),

  http.post("/api/sales", async ({ request }) => {
    const body = (await request.json()) as {
      customerId?: string;
      saleType: "contado" | "credito";
      totalAmount: number;
      amountPaid: number;
      tara?: number;
      netWeight?: number;
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

    const balanceDue = body.totalAmount - body.amountPaid;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      businessId: "biz-1",
      customerId: body.customerId || null,
      sellerId: BUSINESS_USER.id,
      saleType: body.saleType,
      totalAmount: body.totalAmount.toFixed(2),
      amountPaid: body.amountPaid.toFixed(2),
      balanceDue: balanceDue.toFixed(2),
      tara: (body.tara || 0).toFixed(3),
      netWeight: body.netWeight ? body.netWeight.toFixed(3) : null,
      syncStatus: "synced",
      saleDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      items: body.items,
    };

    sales.push(newSale);

    return HttpResponse.json({
      success: true,
      data: newSale,
    });
  }),

  // ==========================================================================
  // Inventory API
  // ==========================================================================
  http.get("/api/inventory", () => {
    const inventory = products.map((p) => ({
      productId: p.id,
      productName: p.name,
      quantity: "100",
      unit: p.unit,
    }));

    return HttpResponse.json({
      success: true,
      data: inventory,
    });
  }),

  // ==========================================================================
  // Health check
  // ==========================================================================
  http.get("/api/health", () => {
    return HttpResponse.json({
      success: true,
      data: { status: "ok", timestamp: new Date().toISOString() },
    });
  }),
];

// ============================================================================
// Utility functions for tests
// ============================================================================

export function resetE2EData() {
  // Reset sales but keep customers and products
  sales = [];
}

export function getSales(): Sale[] {
  return sales;
}

export function addE2ESale(sale: Sale) {
  sales.push(sale);
}

export function getCustomers(): Customer[] {
  return customers;
}

export function getProducts(): Product[] {
  return products;
}

export function getProductVariants(): ProductVariant[] {
  return productVariants;
}
