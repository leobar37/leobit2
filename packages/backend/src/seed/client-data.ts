// Datos reales de cliente@avileo.com exportados desde producción
// Este seed recrea exactamente el estado de la cuenta para poder resetear a este estado

import exportedData from "../../scripts/exported/cliente@avileo.com-data.json";

// User y Business config
export const CLIENT_USER = {
  email: "cliente@avileo.com",
  password: "Cliente112345",
  name: "Cliente Demo",
};

export const CLIENT_BUSINESS = {
  name: "Pollos La Granja",
  ruc: "20456789012",
  address: "Av. Principal 456, Lima",
  phone: "999-777-555",
  email: "contacto@polloslagranja.com",
  usarDistribucion: false,
};

// Extraer productos únicos de las ventas
const productMap = new Map();
const variantMap = new Map();

for (const sale of exportedData.sales) {
  for (const item of sale.items) {
    // Agrupar por productId
    if (!productMap.has(item.productId)) {
      productMap.set(item.productId, {
        id: item.productId,
        name: item.productName,
        // Determinar tipo basado en nombre
        type: item.productName.toLowerCase() === "pollo" ? "pollo" :
              item.productName.toLowerCase() === "huevo" ? "huevo" : "otro",
        // Determinar unidad basada en variante
        unit: item.productName.toLowerCase() === "huevo" ? "unidad" : "kg",
        isActive: true,
      });
    }
    
    // Agrupar variantes por variantId
    if (!variantMap.has(item.variantId)) {
      variantMap.set(item.variantId, {
        id: item.variantId,
        productId: item.productId,
        name: item.variantName,
        sku: `${item.productName.substring(0, 3).toUpperCase()}-${item.variantName.substring(0, 3).toUpperCase()}`,
        unitQuantity: 1,
        price: parseFloat(item.unitPrice),
      });
    }
  }
}

// Exportar productos y variantes con IDs preservados
export const PRODUCTS = Array.from(productMap.values());

// Agrupar variantes por producto para mantener estructura
export const PRODUCT_VARIANTS = PRODUCTS.map(product => {
  return Array.from(variantMap.values())
    .filter(v => v.productId === product.id)
    .map(({ id, name, sku, unitQuantity, price }) => ({ id, name, sku, unitQuantity, price }));
});

// Exportar datos reales directamente del JSON
export const CUSTOMERS = exportedData.customers;
export const SALES = exportedData.sales;
export const ABONOS = exportedData.abonos;

// Metadata útil
export const EXPORT_METADATA = {
  exportedAt: exportedData.metadata.exportedAt,
  originalUserId: exportedData.metadata.userId,
  originalBusinessId: exportedData.metadata.businessId,
};

export const CATEGORIES = [
  { name: "Pollo", color: "#f97316" },
  { name: "Huevo", color: "#eab308" },
  { name: "Otro", color: "#6b7280" },
];

// Sin proveedores, distribuciones ni compras para este seed
export const SUPPLIERS: never[] = [];
export const DISTRIBUCIONES: never[] = [];
export const PURCHASES: never[] = [];

// Tags vacíos (no hay en el export original)
export const TAGS: never[] = [];
export const CUSTOMER_TAGS: never[] = [];
export const CLOSINGS: never[] = [];
