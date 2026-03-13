# Seed Data Reference

Datos pre-creados por el seed E2E para testing.

## Credenciales de Acceso

| Campo | Valor |
|-------|-------|
| **Email** | `e2e@avileo.com` |
| **Password** | `e2e123456` |
| **Nombre** | `Usuario E2E` |

## Negocio de Prueba

| Campo | Valor |
|-------|-------|
| **Nombre** | `Pollos E2E Test` |
| **RUC** | `12345678901` |
| **Modo Operación** | `venta_directa` |
| **Control Kilos** | `true` |
| **Usar Distribución** | `false` |
| **Permitir Venta Sin Stock** | `true` |

## Productos Pre-creados

### 1. Huevos

**Tipo:** `huevo`  
**Unidad:** `unidad`

| Variante | Precio | Cantidad Unidad |
|----------|--------|-----------------|
| Unidad | S/ 0.80 | 1 |
| Maple (30un) | S/ 22.00 | 30 |
| Cubeta (180un) | S/ 130.00 | 180 |

### 2. Menudencias

**Tipo:** `pollo`  
**Unidad:** `kg`

| Variante | Precio |
|----------|--------|
| Mollejas | S/ 15.00 |
| Patitas | S/ 12.00 |
| Alas | S/ 14.00 |

## Clientes Pre-creados

| Nombre | DNI | Teléfono | Dirección |
|--------|-----|----------|-----------|
| **Maria Garcia** | 87654321 | 999111222 | Av. Principal 123 |
| **Juan Perez** | 12345678 | 999333444 | Calle Secundaria 456 |

## Proveedores Pre-creados

| Nombre | Tipo | RUC |
|--------|------|-----|
| **Proveedor Varios** | generic | - |
| **Avícola El Buen Sabor** | avicola | 20123456789 |

## Configuración del Sistema

### Métodos de Pago
- Efectivo
- Transferencia
- Yape

### Inventario Inicial
- 100 unidades por cada producto/variante

### Stock
- Habilitado para venta sin stock asignado

## Datos para Tests Dinámicos

Algunos tests crean datos dinámicos usando timestamp:

```typescript
const timestamp = Date.now();
const productName = `Pollo Test ${timestamp}`;
const sku = `TEST-${timestamp}`;
const invoiceNumber = `F001-${timestamp}`;
```

Esto asegura nombres únicos y evita conflictos entre ejecuciones.

## Acceso al Seed

El seed se ejecuta automáticamente al correr los tests E2E:

```bash
# Script completo
bun run test:e2e

# Solo reset DB + seed
bun run db:reset
```

## Archivo de Datos

Los datos del seed están definidos en:

```
packages/backend/src/seed/
├── data.ts          # Datos E2E
├── client-data.ts   # Datos modo cliente
└── index.ts         # Lógica de seed
```

## Extender el Seed

Para agregar más datos al seed E2E:

1. Editar `packages/backend/src/seed/data.ts`
2. Agregar entrada al array correspondiente
3. Ejecutar `bun run db:reset` para probar

### Ejemplo: Agregar nuevo cliente

```typescript
// data.ts
export const CUSTOMERS = [
  // ... clientes existentes
  {
    name: "Nuevo Cliente",
    dni: "99999999",
    phone: "999888777",
    address: "Nueva Dirección",
    notes: "",
  },
];
```
