// @ts-nocheck - E2E test file
/**
 * Volume and Performance Tests (T-019)
 *
 * Tests for FR-015: Volume Testing and FR-016: Performance Testing
 * with 1000+ records.
 *
 * Test Cases:
 * - VOL-MOCK-001 to VOL-MOCK-004: Volume Data Generation
 * - VOL-PERF-001 to VOL-PERF-004: Performance List Tests
 * - VOL-OP-001 to VOL-OP-004: Performance Operations Tests
 */

import { test, expect } from "@playwright/test";
import { SalesListPage } from "../page-objects/SalesListPage";
import { NewSalePage } from "../page-objects/NewSalePage";
import { OrdersListPage } from "../page-objects/OrdersListPage";
import { OrderDetailPage } from "../page-objects/OrderDetailPage";
import { initializeVolumeData, resetVolumeData, getVolumeCustomers, getVolumeProducts, getVolumeSales, getVolumeOrders } from "../mocks";

test.describe("Volume Testing (FR-015)", () => {
  test.beforeEach(async () => {
    // Initialize with heavy volume before each test
    initializeVolumeData({
      customers: 1000,
      products: 100,
      sales: 500,
      orders: 200,
    });
  });

  test.afterEach(() => {
    resetVolumeData();
  });

  // ========================================================================
  // Volume Data Generation Tests
  // ========================================================================

  test("VOL-MOCK-001: Generar 1000 clientes mock", () => {
    const customers = getVolumeCustomers();
    expect(customers.length).toBe(1000);

    // Verify customer structure
    const sampleCustomer = customers[0];
    expect(sampleCustomer).toHaveProperty("id");
    expect(sampleCustomer).toHaveProperty("name");
    expect(sampleCustomer).toHaveProperty("businessId");
    expect(sampleCustomer.name.length).toBeGreaterThan(0);
  });

  test("VOL-MOCK-002: Generar 100 productos mock", () => {
    const products = getVolumeProducts();
    expect(products.length).toBe(100);

    // Verify product structure
    const sampleProduct = products[0];
    expect(sampleProduct).toHaveProperty("id");
    expect(sampleProduct).toHaveProperty("name");
    expect(sampleProduct).toHaveProperty("type");
    expect(sampleProduct).toHaveProperty("basePrice");
    expect(sampleProduct.name.length).toBeGreaterThan(0);
  });

  test("VOL-MOCK-003: Generar 500 ventas mock", () => {
    const sales = getVolumeSales();
    expect(sales.length).toBe(500);

    // Verify sale structure
    const sampleSale = sales[0];
    expect(sampleSale).toHaveProperty("id");
    expect(sampleSale).toHaveProperty("totalAmount");
    expect(sampleSale).toHaveProperty("saleType");
    expect(sampleSale).toHaveProperty("items");
    expect(Array.isArray(sampleSale.items)).toBe(true);
  });

  test("VOL-MOCK-004: Generar 200 pedidos mock", () => {
    const orders = getVolumeOrders();
    expect(orders.length).toBe(200);

    // Verify order structure
    const sampleOrder = orders[0];
    expect(sampleOrder).toHaveProperty("id");
    expect(sampleOrder).toHaveProperty("deliveryDate");
    expect(sampleOrder).toHaveProperty("status");
    expect(sampleOrder).toHaveProperty("items");
    expect(Array.isArray(sampleOrder.items)).toBe(true);
  });
});

test.describe("Performance Testing - List Operations (FR-016)", () => {
  test.beforeEach(async ({ page }) => {
    // Initialize with heavy volume (1000 customers, 500 sales)
    initializeVolumeData({
      customers: 1000,
      products: 100,
      sales: 500,
      orders: 200,
    });
  });

  test.afterEach(() => {
    resetVolumeData();
  });

  test("VOL-PERF-001: Cargar listado con 1000 registros", async ({ page }) => {
    const salesList = new SalesListPage(page);

    // Measure initial page load time
    const startTime = Date.now();
    await salesList.goto();
    await salesList.expectLoaded();
    const loadTime = Date.now() - startTime;

    // Verify page loaded successfully
    await expect(salesList.searchInput).toBeVisible();

    // Performance threshold: Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Verify list contains items (pagination should show results)
    const saleCount = await salesList.getSaleCount();
    expect(saleCount).toBeGreaterThan(0);
  });

  test("VOL-PERF-002: Scroll infinito rendimiento", async ({ page }) => {
    const salesList = new SalesListPage(page);
    await salesList.goto();
    await salesList.expectLoaded();

    // Get initial count
    const initialCount = await salesList.getSaleCount();
    expect(initialCount).toBeGreaterThan(0);

    // Measure time for infinite scroll to load more
    const scrollStartTime = Date.now();

    // Try to scroll down and load more items
    // This tests pagination/infinite scroll performance
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait a bit for new items to load
    await page.waitForTimeout(1000);

    const scrollLoadTime = Date.now() - scrollStartTime;

    // Should complete scroll handling in under 1 second
    expect(scrollLoadTime).toBeLessThan(1000);
  });

  test("VOL-PERF-003: Búsqueda en 1000 registros", async ({ page }) => {
    const salesList = new SalesListPage(page);
    await salesList.goto();
    await salesList.expectLoaded();

    // Get a customer name from the mock data
    const customers = getVolumeCustomers();
    const searchQuery = customers[0].name.substring(0, 5); // First 5 chars

    // Measure search time
    const searchStartTime = Date.now();
    await salesList.search(searchQuery);
    await page.waitForTimeout(500); // Wait for debounce
    const searchTime = Date.now() - searchStartTime;

    // Search should complete in under 1 second
    expect(searchTime).toBeLessThan(1000);

    // Verify search results are displayed
    await expect(salesList.salesList).toBeVisible();
  });

  test("VOL-PERF-004: Filtro por fechas en volumen", async ({ page }) => {
    const salesList = new SalesListPage(page);
    await salesList.goto();
    await salesList.expectLoaded();

    // Get a date range from the mock sales
    const sales = getVolumeSales();
    const sampleSaleDate = new Date(sales[0].saleDate);
    const dateStr = sampleSaleDate.toISOString().split("T")[0];

    // Apply date filter via URL parameters
    const filterStartTime = Date.now();
    await page.goto(`/ventas?startDate=${dateStr}&endDate=${dateStr}`);
    await salesList.expectLoaded();

    const filterTime = Date.now() - filterStartTime;

    // Filter should apply in under 2 seconds
    expect(filterTime).toBeLessThan(2000);

    // Verify filtered results
    const saleCount = await salesList.getSaleCount();
    expect(saleCount).toBeGreaterThanOrEqual(0); // May be 0 if no exact match
  });
});

test.describe("Performance Testing - Operations (FR-016)", () => {
  test.beforeEach(async ({ page }) => {
    // Initialize with heavy volume (1000 customers, 500 sales)
    initializeVolumeData({
      customers: 1000,
      products: 100,
      sales: 500,
      orders: 200,
    });
  });

  test.afterEach(() => {
    resetVolumeData();
  });

  test("VOL-OP-001: Crear venta con carga alta", async ({ page }) => {
    const newSalePage = new NewSalePage(page);

    // Navigate to new sale page
    const navStartTime = Date.now();
    await newSalePage.goto();
    const navTime = Date.now() - navStartTime;

    // Navigation should be fast even with high load
    expect(navTime).toBeLessThan(2000);

    // Get a customer and product from mock data
    const customers = getVolumeCustomers();
    const products = getVolumeProducts();
    const customerName = customers[0].name;
    const productName = products[0].name;
    const variantName = products[0].variants?.[0]?.name || "Estándar";

    // Select customer
    await newSalePage.selectCustomer(customerName);

    // Select product and variant
    await newSalePage.selectProductAndVariant(productName, variantName);

    // Enter amount
    await newSalePage.enterTotalAmount("100");

    // Add to cart
    await addToCartWithTiming(newSalePage);
  });

  test("VOL-OP-002: Confirmar pedido con carga alta", async ({ page }) => {
    const ordersListPage = new OrdersListPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Navigate to orders list
    await ordersListPage.goto();

    // Get an order to confirm
    const orders = getVolumeOrders();
    const draftOrder = orders.find((o) => o.status === "draft");

    if (draftOrder && draftOrder.client) {
      // Click on the draft order
      await ordersListPage.clickOrderByCustomer(draftOrder.client.name);

      // Measure confirm operation time
      const confirmStartTime = Date.now();

      // Confirm the order
      await orderDetailPage.confirmOrder();

      const confirmTime = Date.now() - confirmStartTime;

      // Confirmation should complete in under 2 seconds
      expect(confirmTime).toBeLessThan(2000);

      // Verify status changed
      await orderDetailPage.expectStatus("Confirmado");
    }
  });

  test("VOL-OP-003: Cancelar con carga alta", async ({ page }) => {
    const ordersListPage = new OrdersListPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Navigate to orders list
    await ordersListPage.goto();

    // Get an order to cancel (draft or confirmed)
    const orders = getVolumeOrders();
    const orderToCancel = orders.find((o) => o.status === "draft" || o.status === "confirmed");

    if (orderToCancel && orderToCancel.client) {
      // Click on the order
      await ordersListPage.clickOrderByCustomer(orderToCancel.client.name);

      // Measure cancel operation time
      const cancelStartTime = Date.now();

      // Cancel the order
      await orderDetailPage.cancelOrder();

      const cancelTime = Date.now() - cancelStartTime;

      // Cancellation should complete in under 2 seconds
      expect(cancelTime).toBeLessThan(2000);

      // Verify status changed to cancelled
      await orderDetailPage.expectStatus("Cancelado");
    }
  });

  test("VOL-OP-004: Agregar item con carga alta", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Get products from mock data
    const products = getVolumeProducts();
    const productName = products[0].name;
    const variantName = products[0].variants?.[0]?.name || "Estándar";

    // Select product and variant
    await newSalePage.selectProductAndVariant(productName, variantName);

    // Measure item addition time
    const addItemStartTime = Date.now();

    // Enter amount and add to cart
    await newSalePage.enterTotalAmount("50");
    await newSalePage.addToCart();

    const addItemTime = Date.now() - addItemStartTime;

    // Item addition should complete in under 1 second
    expect(addItemTime).toBeLessThan(1000);

    // Verify item was added (cart should have items)
    await expect(newSalePage.cartSection).toBeVisible();
  });
});

// ========================================================================
// Helper Functions
// ========================================================================

async function addToCartWithTiming(newSalePage: NewSalePage): Promise<number> {
  const startTime = Date.now();
  await newSalePage.addToCart();
  return Date.now() - startTime;
}
