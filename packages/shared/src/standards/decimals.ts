/**
 * Estándares de decimales para el proyecto Avileo
 * Centraliza la cantidad de decimales por campo/entidad
 * Usado por frontend y backend
 */

export const DECIMALS = {
  // Entidades - items
  saleItem: {
    quantity: 3,
    unitPrice: 2,
    subtotal: 2,
    orderedQuantity: 3,
    deliveredQuantity: 3,
    unitPriceQuoted: 2,
    unitPriceFinal: 2,
    costPriceSnapshot: 2,
    originalQuantity: 3,
  },
  purchaseItem: {
    quantity: 3,
    unitCost: 2,
    totalCost: 2,
  },
  distribucionItem: {
    cantidadAsignada: 3,
    cantidadVendida: 3,
  },

  // Entidades - ventas/compras
  sale: {
    totalAmount: 2,
    amountPaid: 2,
    balanceDue: 2,
    tara: 3,
    netWeight: 3,
    refundAmount: 2,
  },
  purchase: {
    totalAmount: 2,
  },
  distribucion: {
    montoRecaudado: 2,
  },
  abono: {
    amount: 2,
  },

  // Entidades - productos
  product: {
    basePrice: 2,
    costPrice: 2,
  },
  productVariant: {
    unitQuantity: 3,
    price: 2,
    costPrice: 2,
    lowStockThreshold: 3,
    criticalStockThreshold: 3,
  },

  // Campos globales
  weight: 3,
  currency: 2,
  kilos: 1,
  percentage: 0,
} as const;

export type DecimalConfig = typeof DECIMALS;
