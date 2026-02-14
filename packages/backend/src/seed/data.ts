export const TEST_USER = {
  email: "demo@avileo.com",
  password: "demo123456",
  name: "Usuario Demo",
};

export const TEST_BUSINESS = {
  name: "Pollos El Dorado",
  ruc: "12345678901",
  address: "Av. Principal 123, Lima",
  phone: "999-888-777",
  email: "ventas@polloseldorado.com",
  modoOperacion: "inventario_propio" as const,
  controlKilos: true,
  usarDistribucion: true,
  permitirVentaSinStock: false,
};

export const PRODUCTS = [
  {
    name: "Pollo Vivo Entero",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "18.50",
    isActive: true,
  },
  {
    name: "Pollo Pelado",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "22.00",
    isActive: true,
  },
  {
    name: "Pollo en Piezas (pechuga)",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "24.50",
    isActive: true,
  },
  {
    name: "Pollo en Piezas (pierna)",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "23.00",
    isActive: true,
  },
  {
    name: "Pollo en Piezas (ala)",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "19.00",
    isActive: true,
  },
  {
    name: "Huevo Blanco",
    type: "huevo" as const,
    unit: "unidad" as const,
    basePrice: "0.80",
    isActive: true,
  },
  {
    name: "Huevo Rojo",
    type: "huevo" as const,
    unit: "unidad" as const,
    basePrice: "0.85",
    isActive: true,
  },
  {
    name: "Bandeja de Huevos (30un)",
    type: "huevo" as const,
    unit: "unidad" as const,
    basePrice: "22.00",
    isActive: true,
  },
  {
    name: "Mollejas",
    type: "otro" as const,
    unit: "kg" as const,
    basePrice: "28.00",
    isActive: true,
  },
  {
    name: "Patitas de Pollo",
    type: "otro" as const,
    unit: "kg" as const,
    basePrice: "12.00",
    isActive: true,
  },
];

export const CUSTOMERS = [
  { name: "Maria Garcia", dni: "45678912", phone: "999111222", address: "Jr. Las Flores 456", notes: "Cliente frecuente" },
  { name: "Juan Perez", dni: "12345678", phone: "999333444", address: "Av. Los Pinos 789", notes: "" },
  { name: "Carmen Lopez", dni: "87654321", phone: "999555666", address: "Calle San Jose 234", notes: "Paga los fines de semana" },
  { name: "Roberto Sanchez", dni: "23456789", phone: "999777888", address: "Av. Principal 567", notes: "" },
  { name: "Ana Torres", dni: "98765432", phone: "999000111", address: "Jr. Huallaga 890", notes: "Prefiere pollo pelado" },
  { name: "Pedro Ramirez", dni: "34567890", phone: "999222333", address: "Calle Comercio 123", notes: "" },
  { name: "Luisa Mendoza", dni: "56789012", phone: "999444555", address: "Av. Los Laureles 345", notes: "Compra al por mayor" },
  { name: "Carlos Diaz", dni: "67890123", phone: "999666777", address: "Jr. Progreso 678", notes: "" },
  { name: "Diana Flores", dni: "78901234", phone: "999888999", address: "Calle Union 901", notes: "Paga con Yape" },
  { name: "Miguel Castillo", dni: "89012345", phone: "999111333", address: "Av. Los Rosales 234", notes: "" },
  { name: "Rosa Quispe", dni: "90123456", phone: "999555777", address: "Jr. Ayacucho 567", notes: "Cliente nuevo" },
  { name: "Jorge Vargas", dni: "01234567", phone: "999999000", address: "Calle Lima 890", notes: "" },
  { name: "Sofia Rojas", dni: "11223344", phone: "999222444", address: "Av. Grau 123", notes: "Prefiere entrega a domicilio" },
  { name: "Andres Chavez", dni: "22334455", phone: "999666888", address: "Jr. Junin 456", notes: "" },
  { name: "Elena Paredes", dni: "33445566", phone: "999000222", address: "Calle Arequipa 789", notes: "Fidelizada" },
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

export const SALES: SaleData[] = [
  {
    customerIndex: 0,
    saleType: "contado",
    totalAmount: 185.00,
    amountPaid: 185.00,
    tara: 0.5,
    netWeight: 10,
    items: [{ productIndex: 0, quantity: 10, unitPrice: 18.50 }],
    daysAgo: 0,
  },
  {
    customerIndex: 1,
    saleType: "credito",
    totalAmount: 220.00,
    amountPaid: 100.00,
    tara: 0,
    netWeight: 10,
    items: [{ productIndex: 1, quantity: 10, unitPrice: 22.00 }],
    daysAgo: 0,
  },
  {
    customerIndex: 2,
    saleType: "contado",
    totalAmount: 48.50,
    amountPaid: 48.50,
    items: [{ productIndex: 5, quantity: 50, unitPrice: 0.80 }],
    daysAgo: 1,
  },
  {
    customerIndex: 3,
    saleType: "contado",
    totalAmount: 245.00,
    amountPaid: 245.00,
    tara: 0.3,
    netWeight: 10,
    items: [{ productIndex: 2, quantity: 10, unitPrice: 24.50 }],
    daysAgo: 1,
  },
  {
    customerIndex: 4,
    saleType: "credito",
    totalAmount: 138.00,
    amountPaid: 50.00,
    items: [
      { productIndex: 0, quantity: 5, unitPrice: 18.50 },
      { productIndex: 5, quantity: 30, unitPrice: 0.80 },
    ],
    daysAgo: 1,
  },
  {
    customerIndex: 5,
    saleType: "contado",
    totalAmount: 92.00,
    amountPaid: 92.00,
    tara: 0.2,
    netWeight: 5,
    items: [{ productIndex: 3, quantity: 4, unitPrice: 23.00 }],
    daysAgo: 2,
  },
  {
    customerIndex: 6,
    saleType: "contado",
    totalAmount: 660.00,
    amountPaid: 660.00,
    tara: 1,
    netWeight: 30,
    items: [{ productIndex: 0, quantity: 30, unitPrice: 18.50 }],
    daysAgo: 2,
  },
  {
    customerIndex: 7,
    saleType: "credito",
    totalAmount: 95.00,
    amountPaid: 0,
    items: [
      { productIndex: 5, quantity: 60, unitPrice: 0.80 },
      { productIndex: 9, quantity: 3, unitPrice: 12.00 },
    ],
    daysAgo: 3,
  },
  {
    customerIndex: 8,
    saleType: "contado",
    totalAmount: 22.00,
    amountPaid: 22.00,
    items: [{ productIndex: 7, quantity: 1, unitPrice: 22.00 }],
    daysAgo: 3,
  },
  {
    customerIndex: 9,
    saleType: "credito",
    totalAmount: 185.50,
    amountPaid: 85.50,
    tara: 0.4,
    netWeight: 10,
    items: [{ productIndex: 0, quantity: 10, unitPrice: 18.50 }],
    daysAgo: 4,
  },
  {
    customerIndex: 10,
    saleType: "contado",
    totalAmount: 140.00,
    amountPaid: 140.00,
    tara: 0,
    netWeight: 6.5,
    items: [
      { productIndex: 2, quantity: 4, unitPrice: 24.50 },
      { productIndex: 4, quantity: 2, unitPrice: 19.00 },
    ],
    daysAgo: 4,
  },
  {
    customerIndex: 11,
    saleType: "contado",
    totalAmount: 42.50,
    amountPaid: 42.50,
    items: [
      { productIndex: 5, quantity: 30, unitPrice: 0.80 },
      { productIndex: 9, quantity: 2, unitPrice: 12.00 },
      { productIndex: 8, quantity: 0.5, unitPrice: 28.00 },
    ],
    daysAgo: 5,
  },
  {
    customerIndex: 12,
    saleType: "credito",
    totalAmount: 264.00,
    amountPaid: 100.00,
    tara: 0.5,
    netWeight: 12,
    items: [{ productIndex: 1, quantity: 12, unitPrice: 22.00 }],
    daysAgo: 5,
  },
  {
    customerIndex: 13,
    saleType: "contado",
    totalAmount: 88.00,
    amountPaid: 88.00,
    items: [{ productIndex: 1, quantity: 4, unitPrice: 22.00 }],
    daysAgo: 6,
  },
  {
    customerIndex: 14,
    saleType: "contado",
    totalAmount: 176.00,
    amountPaid: 176.00,
    tara: 0.3,
    netWeight: 8,
    items: [{ productIndex: 1, quantity: 8, unitPrice: 22.00 }],
    daysAgo: 6,
  },
  {
    customerIndex: 0,
    saleType: "contado",
    totalAmount: 51.00,
    amountPaid: 51.00,
    items: [{ productIndex: 6, quantity: 60, unitPrice: 0.85 }],
    daysAgo: 7,
  },
  {
    customerIndex: 2,
    saleType: "credito",
    totalAmount: 230.00,
    amountPaid: 150.00,
    tara: 0.2,
    netWeight: 10,
    items: [{ productIndex: 1, quantity: 10, unitPrice: 23.00 }],
    daysAgo: 7,
  },
  {
    customerIndex: 4,
    saleType: "contado",
    totalAmount: 117.00,
    amountPaid: 117.00,
    items: [
      { productIndex: 0, quantity: 4, unitPrice: 18.50 },
      { productIndex: 5, quantity: 50, unitPrice: 0.80 },
    ],
    daysAgo: 8,
  },
  {
    customerIndex: 6,
    saleType: "contado",
    totalAmount: 444.00,
    amountPaid: 444.00,
    tara: 0.8,
    netWeight: 20,
    items: [{ productIndex: 0, quantity: 20, unitPrice: 18.50 }],
    daysAgo: 8,
  },
  {
    customerIndex: 8,
    saleType: "contado",
    totalAmount: 17.00,
    amountPaid: 17.00,
    items: [
      { productIndex: 5, quantity: 10, unitPrice: 0.80 },
      { productIndex: 9, quantity: 0.5, unitPrice: 12.00 },
    ],
    daysAgo: 9,
  },
  {
    customerIndex: 10,
    saleType: "credito",
    totalAmount: 187.50,
    amountPaid: 87.50,
    items: [
      { productIndex: 2, quantity: 5, unitPrice: 24.50 },
      { productIndex: 6, quantity: 50, unitPrice: 0.85 },
    ],
    daysAgo: 9,
  },
  {
    customerIndex: 12,
    saleType: "contado",
    totalAmount: 198.00,
    amountPaid: 198.00,
    tara: 0.4,
    netWeight: 9,
    items: [{ productIndex: 1, quantity: 9, unitPrice: 22.00 }],
    daysAgo: 10,
  },
  {
    customerIndex: 1,
    saleType: "contado",
    totalAmount: 74.00,
    amountPaid: 74.00,
    items: [
      { productIndex: 1, quantity: 2, unitPrice: 22.00 },
      { productIndex: 7, quantity: 1, unitPrice: 22.00 },
    ],
    daysAgo: 10,
  },
  {
    customerIndex: 3,
    saleType: "credito",
    totalAmount: 342.00,
    amountPaid: 200.00,
    items: [
      { productIndex: 2, quantity: 8, unitPrice: 24.50 },
      { productIndex: 4, quantity: 6, unitPrice: 19.00 },
    ],
    daysAgo: 11,
  },
  {
    customerIndex: 5,
    saleType: "contado",
    totalAmount: 23.00,
    amountPaid: 23.00,
    items: [{ productIndex: 4, quantity: 1, unitPrice: 23.00 }],
    daysAgo: 11,
  },
];

export interface AbonoData {
  customerIndex: number;
  amount: number;
  paymentMethod: "efectivo" | "yape" | "plin" | "transferencia";
  notes: string;
  daysAgo: number;
}

export const ABONOS: AbonoData[] = [
  { customerIndex: 1, amount: 50.00, paymentMethod: "efectivo", notes: "Abono parcial", daysAgo: 0 },
  { customerIndex: 4, amount: 50.00, paymentMethod: "yape", notes: "Pago de deuda", daysAgo: 0 },
  { customerIndex: 7, amount: 45.00, paymentMethod: "efectivo", notes: "Abono", daysAgo: 1 },
  { customerIndex: 9, amount: 50.00, paymentMethod: "plin", notes: "Pago parcial", daysAgo: 2 },
  { customerIndex: 2, amount: 80.00, paymentMethod: "efectivo", notes: "Abono de deuda", daysAgo: 2 },
  { customerIndex: 10, amount: 50.00, paymentMethod: "transferencia", notes: "Deposito", daysAgo: 3 },
  { customerIndex: 12, amount: 100.00, paymentMethod: "efectivo", notes: "Abono", daysAgo: 4 },
  { customerIndex: 14, amount: 30.00, paymentMethod: "yape", notes: "Pago", daysAgo: 5 },
  { customerIndex: 3, amount: 142.00, paymentMethod: "efectivo", notes: "Liquidacion", daysAgo: 6 },
];

export interface DistribucionData {
  puntoVenta: string;
  kilosAsignados: number;
  kilosVendidos: number;
  montoRecaudado: number;
  fecha: string; // YYYY-MM-DD
  estado: "activo" | "cerrado" | "en_ruta";
}

export const DISTRIBUCIONES: DistribucionData[] = [
  {
    puntoVenta: "Carro A",
    kilosAsignados: 50,
    kilosVendidos: 45.5,
    montoRecaudado: 841.75,
    fecha: new Date(Date.now() - 0 * 86400000).toISOString().split("T")[0],
    estado: "activo",
  },
  {
    puntoVenta: "Casa Principal",
    kilosAsignados: 30,
    kilosVendidos: 28,
    montoRecaudado: 616.00,
    fecha: new Date(Date.now() - 0 * 86400000).toISOString().split("T")[0],
    estado: "activo",
  },
  {
    puntoVenta: "Carro A",
    kilosAsignados: 45,
    kilosVendidos: 42,
    montoRecaudado: 777.00,
    fecha: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    estado: "cerrado",
  },
  {
    puntoVenta: "Mercado Central",
    kilosAsignados: 40,
    kilosVendidos: 38.5,
    montoRecaudado: 847.00,
    fecha: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    estado: "cerrado",
  },
  {
    puntoVenta: "Carro A",
    kilosAsignados: 55,
    kilosVendidos: 52,
    montoRecaudado: 962.00,
    fecha: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    estado: "cerrado",
  },
];
