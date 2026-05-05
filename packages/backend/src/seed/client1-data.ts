// Datos para cliente1@gmail.com - Pollos, Azúcar, Huevos
// Productos típicos de una bodega/pollería pequeña

// User y Business config
export const CLIENT1_USER = {
  email: "cliente1@gmail.com",
  password: "Prueba@123",
  name: "Cliente Uno",
};

export const CLIENT1_BUSINESS = {
  name: "Pollería y Bodega Cliente 1",
  ruc: "20567890123",
  address: "Av. Los Pollos 123, Lima",
  phone: "999-111-222",
  email: "cliente1@gmail.com",
  usarDistribucion: false,
};

export const CATEGORIES = [
  { name: "Pollo", color: "#f97316" },
  { name: "Huevo", color: "#eab308" },
  { name: "Otro", color: "#6b7280" },
];

// Productos: Pollo, Azúcar, Huevos
// `type` is used as a category mapping hint during seeding
export const PRODUCTS = [
  {
    name: "Pollo",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "12.50",
    isActive: true,
  },
  {
    name: "Azúcar",
    type: "otro" as const,
    unit: "kg" as const,
    basePrice: "5.00",
    isActive: true,
  },
  {
    name: "Huevos",
    type: "huevo" as const,
    unit: "unidad" as const,
    basePrice: "0.80",
    isActive: true,
  },
];

// Variantes de productos
export const PRODUCT_VARIANTS = [
  // Pollo - solo por kg
  [
    { name: "Entero (kg)", sku: "POL-ENT", unitQuantity: 1, price: 12.5 },
  ],
  // Azúcar - solo 1kg
  [
    { name: "1kg", sku: "AZU-1KG", unitQuantity: 1, price: 5.0 },
  ],
  // Huevos - Java, Media Java, Casillero
  [
    { name: "Java (30un)", sku: "HUE-JAV", unitQuantity: 30, price: 25.0 },
    { name: "Media Java (15un)", sku: "HUE-MED", unitQuantity: 15, price: 13.0 },
    { name: "Casillero (180un)", sku: "HUE-CAS", unitQuantity: 180, price: 140.0 },
  ],
];

// Clientes de ejemplo
export const CUSTOMERS = [
  { name: "Ana María López", dni: "45678912", phone: "999111222", address: "Jr. Las Flores 456", notes: "Cliente frecuente" },
  { name: "Carlos Rodríguez", dni: "12345678", phone: "999333444", address: "Av. Los Pinos 789", notes: "" },
  { name: "María Elena Sánchez", dni: "87654321", phone: "999555666", address: "Calle Luna 321", notes: "Paga puntual" },
  { name: "Pedro Gómez", dni: "23456789", phone: "999777888", address: "Av. Sol 654", notes: "Cliente nuevo" },
];

// Sin ventas pre-seedeadas - el usuario las creará
export const SALES: never[] = [];

// Sin abonos pre-seedeados
export const ABONOS: never[] = [];

// Sin proveedores
export const SUPPLIERS: never[] = [];

// Sin compras
export const PURCHASES: never[] = [];

// Sin distribuciones
export const DISTRIBUCIONES: never[] = [];

// Tags básicos
export const TAGS = [
  { name: "VIP", color: "#f97316" },
  { name: "Frecuente", color: "#22c55e" },
  { name: "Deudor", color: "#ef4444" },
  { name: "Nuevo", color: "#3b82f6" },
];

// Relaciones customer-tags
export const CUSTOMER_TAGS = [
  { customerIndex: 0, tagIndex: 1 }, // Ana María -> Frecuente
  { customerIndex: 2, tagIndex: 0 }, // María Elena -> VIP
];

// Sin cierres pre-seedeados
export const CLOSINGS: never[] = [];
