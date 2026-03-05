// Datos para seed de cuenta de cliente (Pollos La Granja)
// NO sobreescribe cuentas existentes - agrega nueva cuenta

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
  modoOperacion: "inventario_propio" as const,
  controlKilos: true,
  usarDistribucion: false,
  permitirVentaSinStock: false,
};

// Productos: Pollo, Huevo, Arroz, Aceituna
export const PRODUCTS = [
  {
    name: "Pollo",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "8.00",
    isActive: true,
  },
  {
    name: "Huevo",
    type: "huevo" as const,
    unit: "unidad" as const,
    basePrice: "0.80",
    isActive: true,
  },
  {
    name: "Arroz",
    type: "otro" as const,
    unit: "kg" as const,
    basePrice: "5.00",
    isActive: true,
  },
  {
    name: "Aceituna",
    type: "otro" as const,
    unit: "kg" as const,
    basePrice: "12.00",
    isActive: true,
  },
];

export const PRODUCT_VARIANTS = [
  // Pollo
  [
    { name: "Entero", sku: "POL-ENT", unitQuantity: 1, price: 8.0 },
    { name: "Pechuga", sku: "POL-PEC", unitQuantity: 1, price: 12.0 },
    { name: "Alas", sku: "POL-ALA", unitQuantity: 1, price: 7.0 },
    { name: "Piernas", sku: "POL-PIE", unitQuantity: 1, price: 7.0 },
  ],
  // Huevo
  [
    { name: "Casillero (30un)", sku: "HUE-CAS", unitQuantity: 30, price: 24.0 },
    { name: "Medio Casillero (15un)", sku: "HUE-MED", unitQuantity: 15, price: 12.0 },
  ],
  // Arroz
  [
    { name: "1kg", sku: "ARR-001", unitQuantity: 1, price: 5.0 },
    { name: "5kg", sku: "ARR-005", unitQuantity: 5, price: 24.0 },
    { name: "25kg", sku: "ARR-025", unitQuantity: 25, price: 110.0 },
  ],
  // Aceituna
  [
    { name: "1kg", sku: "ACE-001", unitQuantity: 1, price: 12.0 },
    { name: "500g", sku: "ACE-500", unitQuantity: 0.5, price: 6.5 },
    { name: "Lata (400g)", sku: "ACE-LAT", unitQuantity: 0.4, price: 5.0 },
  ],
];

// Sin clientes, proveedores ni ventas para cuenta demo
export const CUSTOMERS: never[] = [];
export const SUPPLIERS: never[] = [];
export const SALES: never[] = [];
export const ABONOS: never[] = [];
export const DISTRIBUCIONES: never[] = [];
export const PURCHASES: never[] = [];
export const ORDERS: never[] = [];
