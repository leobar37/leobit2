/**
 * Test Data for E2E Tests
 *
 * This file contains test data that matches the seeder data.
 */

// Demo user credentials from seeder
export const DEMO_USER = {
  email: "demo@avileo.com",
  password: "demo123456",
  name: "Usuario Demo",
};

// Sample customers from seeder (15 customers total)
export const TEST_CUSTOMERS = [
  { id: "cust-1", name: "Juan Perez", dni: "12345678", phone: "+51 999 888 777" },
  { id: "cust-2", name: "Maria Garcia", dni: "87654321", phone: "+51 999 777 666" },
  { id: "cust-3", name: "Carlos Rodriguez", dni: "45678912", phone: "+51 999 666 555" },
  { id: "cust-4", name: "Ana Lopez", dni: "78912345", phone: "+51 999 555 444" },
  { id: "cust-5", name: "Luis Martinez", dni: "32165498", phone: "+51 999 444 333" },
];

// Sample products from seeder (4 products with variants)
export const TEST_PRODUCTS = [
  {
    id: "prod-1",
    name: "Pollo Entero",
    unit: "kg" as const,
    variants: [
      { id: "var-1-1", name: "Entero 2kg", sku: "POL-ENT-2KG", price: 25.0 },
      { id: "var-1-2", name: "Entero 2.5kg", sku: "POL-ENT-25KG", price: 30.0 },
    ],
  },
  {
    id: "prod-2",
    name: "Pollo Trozado",
    unit: "kg" as const,
    variants: [
      { id: "var-2-1", name: "Trozado Premium", sku: "POL-TRO-PRE", price: 28.0 },
      { id: "var-2-2", name: "Trozado Standard", sku: "POL-TRO-STD", price: 24.0 },
    ],
  },
  {
    id: "prod-3",
    name: "Filete de Pechuga",
    unit: "kg" as const,
    variants: [
      { id: "var-3-1", name: "Pechuga Premium", sku: "FIL-PCH-PRE", price: 32.0 },
      { id: "var-3-2", name: "Pechuga Standard", sku: "FIL-PCH-STD", price: 28.0 },
    ],
  },
  {
    id: "prod-4",
    name: "Alitas",
    unit: "unidad" as const,
    variants: [
      { id: "var-4-1", name: "Pack 10 unidades", sku: "ALI-PCK-10", price: 15.0, unitQuantity: 10 },
      { id: "var-4-2", name: "Pack 20 unidades", sku: "ALI-PCK-20", price: 28.0, unitQuantity: 20 },
    ],
  },
];

// Test orders from seed data
export const TEST_ORDERS = {
  // Draft order - for testing confirmation
  DRAFT: {
    customer: "Maria Garcia",
    status: "draft",
    paymentIntent: "contado",
    items: [{ product: "Huevos", variant: "Unidad", quantity: 5 }],
    totalAmount: 4.0,
  },
  // Confirmed order with today's date - ready to deliver
  CONFIRMED_TODAY: {
    customer: "Juan Perez",
    status: "confirmed",
    paymentIntent: "credito",
    items: [{ product: "Menudencias", variant: "Mollejas", quantity: 2 }],
    totalAmount: 28.0,
  },
  // Confirmed order with future date - cannot deliver yet
  CONFIRMED_FUTURE: {
    customer: "Maria Garcia",
    status: "confirmed",
    paymentIntent: "contado",
    items: [{ product: "Huevos", variant: "Maple (30un)", quantity: 2 }],
    totalAmount: 42.0,
  },
};

// Test scenarios data
export const TEST_SCENARIOS = {
  // Cash sale with single product
  CASH_SALE: {
    productIndex: 0, // Pollo Entero
    variantIndex: 0, // Entero 2kg
    totalAmount: 100,
    pricePerKg: 10,
    kilos: "10.5",
    tara: "0.5",
    expectedNetWeight: 10.0,
  },

  // Credit sale (debe_todo)
  CREDIT_SALE: {
    customerIndex: 0, // Juan Perez
    productIndex: 1, // Pollo Trozado
    variantIndex: 0, // Trozado Premium
    totalAmount: 200,
    pricePerKg: 20,
    kilos: "10.5",
    tara: "0.5",
    expectedBalanceDue: 200,
  },

  // Partial payment sale (a_cuenta)
  PARTIAL_PAYMENT_SALE: {
    customerIndex: 1, // Maria Garcia
    productIndex: 0, // Pollo Entero
    variantIndex: 1, // Entero 2.5kg
    totalAmount: 300,
    pricePerKg: 15,
    kilos: "20.5",
    tara: "0.5",
    initialPayment: 50,
    expectedBalanceDue: 250,
  },

  // Multiple products sale
  MULTIPLE_PRODUCTS_SALE: {
    items: [
      {
        productIndex: 0, // Pollo Entero
        variantIndex: 0,
        totalAmount: 100,
        pricePerKg: 10,
        kilos: "10.5",
        tara: "0.5",
      },
      {
        productIndex: 1, // Pollo Trozado
        variantIndex: 0,
        totalAmount: 150,
        pricePerKg: 15,
        kilos: "10.5",
        tara: "0.5",
      },
    ],
    expectedTotal: 250,
  },

  // Unit-based product sale (packs)
  UNIT_SALE: {
    productIndex: 3, // Alitas
    variantIndex: 0, // Pack 10 unidades
    packs: 2,
    units: 5,
    expectedTotal: 30, // 2 packs * 15 + 5 units * 1.5
  },
};
