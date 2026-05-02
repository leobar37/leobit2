export const TEST_USER = {
  email: "e2e@avileo.com",
  password: "e2e123456",
  name: "Usuario E2E",
};

// Helper function to get local date in YYYY-MM-DD format
function getLocalDate(daysOffset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}
export const TEST_BUSINESS = {
  name: "Pollos E2E Test",
  ruc: "12345678901",
  address: "Av. Test 123, Lima",
  phone: "999-888-777",
  email: "test@e2e.com",
  modoOperacion: "inventario_propio" as const,
  controlKilos: true,
  usarDistribucion: true,
  permitirVentaSinStock: false,
};

export const CATEGORIES = [
  { name: "Pollo", color: "#f97316" },
  { name: "Huevo", color: "#eab308" },
  { name: "Otro", color: "#6b7280" },
];

// Productos para Peru: Pollo, Huevos, Menudencias
// `type` is used as a category mapping hint during seeding
export const PRODUCTS = [
  {
    name: "Pollo Entero",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "12.50",
    isActive: true,
  },
  {
    name: "Huevos",
    type: "huevo" as const,
    unit: "unidad" as const,
    basePrice: "0.80",
    isActive: true,
  },
  {
    name: "Menudencias",
    type: "otro" as const,
    unit: "kg" as const,
    basePrice: "15.00",
    isActive: true,
  },
];

export const PRODUCT_VARIANTS = [
  // Pollo Entero
  [
    { name: "Entero (kg)", sku: "POL-ENT", unitQuantity: 1, price: 12.5 },
    { name: "Medio Pollo", sku: "POL-MED", unitQuantity: 0.5, price: 6.5 },
    { name: "Cuarto Pollo", sku: "POL-CUA", unitQuantity: 0.25, price: 3.25 },
  ],
  // Huevos
  [
    { name: "Unidad", sku: "HUE-UNI", unitQuantity: 1, price: 0.8 },
    { name: "Maple (30un)", sku: "HUE-MAP", unitQuantity: 30, price: 21.0 },
    { name: "Cubeta (180un)", sku: "HUE-CUB", unitQuantity: 180, price: 120.0 },
  ],
  // Menudencias
  [
    { name: "Mollejas", sku: "MEN-MOL", unitQuantity: 0.5, price: 14.0 },
    { name: "Patitas", sku: "MEN-PAT", unitQuantity: 1, price: 12.0 },
    { name: "Alas", sku: "MEN-ALA", unitQuantity: 1, price: 19.0 },
  ],
];

// Solo 2 clientes para E2E: uno para venta crédito y otro para venta a cuenta
export const CUSTOMERS = [
  { name: "Maria Garcia", dni: "45678912", phone: "999111222", address: "Jr. Las Flores 456", notes: "Cliente frecuente" },
  { name: "Juan Perez", dni: "12345678", phone: "999333444", address: "Av. Los Pinos 789", notes: "" },
];

export interface SaleData {
  customerIndex: number;
  saleType: "contado" | "credito";
  totalAmount: number;
  amountPaid: number;
  tara?: number;
  netWeight?: number;
  items: Array<{
    productIndex: number;
    quantity: number;
    unitPrice: number;
  }>;
  daysAgo: number;
}

// No se seedean ventas para E2E - el test de venta las crea
export const SALES: SaleData[] = [];

export interface AbonoData {
  customerIndex: number;
  amount: number;
  paymentMethod: "efectivo" | "yape" | "plin" | "transferencia";
  notes: string;
  daysAgo: number;
}

// No se seedean abonos para E2E - el test de abono los crea
export const ABONOS: AbonoData[] = [];

export interface DistribucionData {
  puntoVenta: string;
  montoRecaudado: number;
  fecha: string; // YYYY-MM-DD
  estado: "activo" | "cerrado" | "en_ruta";
}

// Solo 1 proveedor para E2E
export const SUPPLIERS = [
  {
    name: "Avícola El Buen Sabor",
    type: "regular" as const,
    ruc: "20123456789",
    address: "Av. Principal 123, Lima",
    phone: "987654321",
    email: "ventas@avicola.com",
    notes: "Proveedor principal de pollo. Entrega diaria.",
  },
];

export interface PurchaseData {
  supplierIndex: number;
  purchaseDate: string;
  invoiceNumber: string;
  notes: string;
  items: Array<{
    productIndex: number;
    variantIndex: number;
    quantity: number;
    unitCost: number;
  }>;
}

// No se seedean compras para E2E - el test de compra las crea
export const PURCHASES: PurchaseData[] = [];

// No se seedean distribuciones para E2E
export const DISTRIBUCIONES: DistribucionData[] = [];

// Nota: Orders/Pedidos fueron unificados con sales en el schema.
// Usar transactionType: "pre_order" en la tabla sales para pedidos.

// Tags para segmentación de clientes
export interface TagData {
  name: string;
  color: string;
}

export const TAGS: TagData[] = [
  { name: "VIP", color: "#f97316" },
  { name: "Frecuente", color: "#22c55e" },
  { name: "Deudor", color: "#ef4444" },
  { name: "Nuevo", color: "#3b82f6" },
];

// Relaciones customer-tags (customerIndex -> tagIndex)
export interface CustomerTagData {
  customerIndex: number;
  tagIndex: number;
}

export const CUSTOMER_TAGS: CustomerTagData[] = [
  { customerIndex: 0, tagIndex: 0 }, // Maria Garcia -> VIP
  { customerIndex: 0, tagIndex: 1 }, // Maria Garcia -> Frecuente
  { customerIndex: 1, tagIndex: 1 }, // Juan Perez -> Frecuente
];

// Nota: La tabla closings fue eliminada. Los datos de cierre ahora están en distribuciones.
