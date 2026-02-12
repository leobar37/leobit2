# Fase 3: Core Offline con Electric SQL + TanStack DB

> Infraestructura offline-first: Electric SQL para sync real-time, TanStack DB para estado reactivo, persistencia IndexedDB via PGlite

**Versión:** 2.0 - Electric SQL Integration  
**Última actualización:** 12 de febrero de 2026

---

## 🎯 Objetivo

Construir la base para que la app funcione **100% offline** con sincronización automática:
- Sync bidireccional en tiempo real con Electric SQL
- Estado reactivo local con TanStack DB
- Persistencia automática via PGlite (PostgreSQL en el navegador)
- Detección de conexión y manejo de operaciones pendientes

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA ELECTRIC SQL                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   POSTGRESQL (Neon)                                                  │
│        ↑                                                            │
│   Electric Service (Cloud o Self-hosted)                            │
│        ↓  HTTP/2 - Shapes (real-time sync)                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  REACT APP (Frontend)                                       │   │
│   │  ├─ TanStack DB (colecciones reactivas)                    │   │
│   │  ├─ useLiveQuery (sub-milisegundo reactivity)              │   │
│   │  └─ Mutations optimistic (instant feedback)                │   │
│   │                                                             │   │
│   │  ┌─────────────────────────────────────────────────────┐    │   │
│   │  │  PGlite (PostgreSQL embebido en WASM)              │    │   │
│   │  │  ├─ Persistencia automática en IndexedDB           │    │   │
│   │  │  ├─ Live queries reactivos                         │    │   │
│   │  │  └─ Capacidad: ~50-100 MB                          │    │   │
│   │  └─────────────────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│   ┌──────────────────────────▼─────────────────────────────────┐    │
│   │  FLUJO DE ESCRITURA (Tu API Elysia)                        │    │
│   │                                                             │    │
│   │  UI → TanStack DB (optimistic) → POST /api/ventas        │    │
│   │         ↓                                                   │    │
│   │  PostgreSQL ← Electric sync → Otros clientes               │    │
│   │                                                             │    │
│   │  Nota: Las escrituras SIEMPRE pasan por tu API             │    │
│   │        Electric solo sincroniza LECTURAS                   │    │
│   └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Diferencia vs Arquitectura Anterior

| Aspecto | Antes (TanStack DB standalone) | Ahora (Electric SQL + TanStack DB) |
|---------|-------------------------------|-----------------------------------|
| **Sync automático** | Manual (API calls) | ✅ Automático via Electric |
| **Real-time updates** | Polling | ✅ WebSocket streaming |
| **Base de datos local** | IndexedDB simple | ✅ PGlite (PostgreSQL completo) |
| **Conflict resolution** | Custom | ✅ Incluido en Electric |
| **Escrituras** | Directo a API | ✅ Via API Elysia (sin cambios) |

---

## 📦 Stack Tecnológico

### Dependencias a Instalar

```bash
# Core Electric + TanStack
bun add @electric-sql/react @tanstack/react-db

# PGlite (PostgreSQL en el navegador)
bun add @electric-sql/pglite

# TanStack DB Collections para Electric
bun add @tanstack/electric-db-collection

# Para queries reactivas (opcional pero recomendado)
bun add @electric-sql/live-queries
```

### Servicios Requeridos

| Servicio | Opción A (Cloud) | Opción B (Self-hosted) |
|----------|------------------|------------------------|
| **Electric Service** | Electric Cloud (dashboard.electric-sql.cloud) | Docker local |
| **PostgreSQL** | Neon (ya tenemos) | Docker local |

**Recomendación:** Empezar con Electric Cloud para desarrollo rápido.

---

## 🚀 Fases de Implementación

### FASE 0: Setup Electric SQL (1-2 días)

#### Paso 1: Crear Cuenta y Configurar Shapes

```bash
# Instalar CLI de Electric (opcional pero útil)
npm install -g @electric-sql/cli

# O usar directamente desde dashboard web
# https://dashboard.electric-sql.cloud
```

#### Paso 2: Definir Shapes en Electric

**Shapes** = Vistas filtradas que Electric mantiene sincronizadas.

```typescript
// Shapes a configurar en dashboard.electric-sql.cloud

// Shape 1: Clientes del negocio actual
{
  table: "customers",
  where: "business_id = :businessId",
  columns: ["id", "name", "dni", "phone", "address", "business_id"]
}

// Shape 2: Productos activos (solo lectura)
{
  table: "products",
  where: "is_active = true",
  columns: ["id", "name", "type", "unit", "base_price"]
}

// Shape 3: Abonos del negocio
{
  table: "abonos",
  where: "business_id = :businessId",
  columns: ["id", "client_id", "amount", "payment_method", "created_at"]
}

// Shape 4: Ventas del día (para historial offline)
{
  table: "sales",
  where: "business_id = :businessId AND sale_date > NOW() - INTERVAL '7 days'",
  columns: ["id", "client_id", "total_amount", "sale_type", "created_at"]
}
```

#### Paso 3: Configurar Backend (Sin cambios al API)

Tu API Elysia **NO NECESITA CAMBIOS**. Electric se conecta directamente a PostgreSQL.

```typescript
// Tu API sigue igual - Electric synca automáticamente
// POST /api/customers → Tu API → PostgreSQL → Electric sync → Clientes

export const customerRoutes = new Elysia({ prefix: "/customers" })
  .post("/", async ({ body }) => {
    // Guardas en PostgreSQL
    const customer = await db.insert(customers).values(body).returning();
    
    // Electric detecta el cambio y synca automáticamente
    return { success: true, data: customer };
  });
```

#### Paso 4: Variables de Entorno

```bash
# packages/app/.env
VITE_ELECTRIC_URL=https://api.electric-sql.cloud/v1/shape
VITE_ELECTRIC_SOURCE_ID=tu-source-id
VITE_ELECTRIC_TOKEN=tu-token-de-api

# Tu API existente (sin cambios)
VITE_API_URL=http://localhost:3000
```

---

### FASE 1: Colecciones TanStack DB (2 días)

#### Estructura de Archivos

```
packages/app/app/
├── lib/
│   └── db/
│       ├── client.ts              # Cliente Electric + PGlite
│       ├── collections.ts         # Definición de colecciones
│       ├── schema.ts              # Schemas Zod
│       └── sync.ts                # Configuración de sync
├── hooks/
│   ├── use-customers.ts           # Live queries de clientes
│   ├── use-products.ts            # Live queries de productos
│   ├── use-payments.ts            # Live queries de abonos
│   └── use-sync-status.ts         # Estado de sincronización
└── components/
    └── sync/
        └── sync-status.tsx        # Indicador 🟢🟡🔴
```

#### Definición de Colecciones

```typescript
// packages/app/app/lib/db/collections.ts
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { z } from "zod";

// Schema de Cliente
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  businessId: z.string(),
});

// Colección de Clientes con Electric
export const customerCollection = createCollection(
  electricCollectionOptions({
    id: "customers",
    schema: customerSchema,
    shapeOptions: {
      url: import.meta.env.VITE_ELECTRIC_URL,
      params: {
        table: "customers",
        // Electric filtra por business_id automáticamente
      },
    },
    // Las escrituras van por TU API
    onInsert: async ({ transaction }) => {
      const response = await api.customers.post(
        transaction.mutations[0].modified
      );
      return { txid: response.data?.id };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];
      const response = await api.customers({ id: original.id }).put(changes);
      return { txid: response.data?.id };
    },
  })
);

// Colección de Productos (solo lectura via Electric)
export const productCollection = createCollection(
  electricCollectionOptions({
    id: "products",
    schema: productSchema,
    shapeOptions: {
      url: import.meta.env.VITE_ELECTRIC_URL,
      params: { table: "products" },
    },
    // Sin onInsert/onUpdate porque vendedores solo leen
  })
);
```

#### Hooks con Live Queries

```typescript
// packages/app/app/hooks/use-customers.ts
import { useLiveQuery } from "@tanstack/react-db";
import { customerCollection } from "~/lib/db/collections";
import { eq, like } from "@tanstack/db";

export function useCustomers(search?: string) {
  return useLiveQuery((q) =>
    q
      .from({ customer: customerCollection })
      .where(({ customer }) =>
        search ? like(customer.name, `%${search}%`) : eq(customer.id, customer.id)
      )
      .orderBy(({ customer }) => customer.name, "asc")
  );
}

export function useCustomer(id: string) {
  return useLiveQuery((q) =>
    q
      .from({ customer: customerCollection })
      .where(({ customer }) => eq(customer.id, id))
  );
}
```

---

### FASE 2: UI Clientes Offline-First (2-3 días)

#### Pantallas a Crear

```typescript
// routes/_protected.customers.tsx - Lista de clientes
// routes/_protected.customers.new.tsx - Nuevo cliente
// routes/_protected.customers.$id.tsx - Detalle de cliente
```

#### Características Offline

| Feature | Implementación | User Experience |
|---------|---------------|-----------------|
| **Lista de clientes** | Live query de colección | Se actualiza automáticamente cuando synca |
| **Búsqueda** | Filtra colección local | Instantáneo, no espera servidor |
| **Nuevo cliente** | Optimistic insert + API call | Aparece inmediatamente en la lista |
| **Indicador offline** | Componente `SyncStatus` | 🟢 Synced / 🟡 Pendiente / 🔴 Offline |

#### Componente SyncStatus

```tsx
// packages/app/app/components/sync/sync-status.tsx
export function SyncStatus() {
  const { status, pendingCount } = useSyncStatus();
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
      status === "synced" && "bg-green-100 text-green-700",
      status === "pending" && "bg-yellow-100 text-yellow-700",
      status === "offline" && "bg-red-100 text-red-700"
    )}>
      {status === "synced" && <CheckCircle className="w-3 h-3" />}
      {status === "pending" && <Clock className="w-3 h-3" />}
      {status === "offline" && <WifiOff className="w-3 h-3" />}
      
      {status === "synced" && "Sincronizado"}
      {status === "pending" && `${pendingCount} pendientes`}
      {status === "offline" && "Sin conexión"}
    </div>
  );
}
```

---

### FASE 3: Catálogo Productos + Abonos (2 días)

#### Productos - Solo Lectura

```typescript
// routes/_protected.products.tsx
export default function ProductsPage() {
  const { data: products } = useProducts();
  
  // Filtros locales (sin llamadas al servidor)
  const [filter, setFilter] = useState<"all" | "pollo" | "huevo" | "otro">("all");
  
  const filteredProducts = products?.filter(
    (p) => filter === "all" || p.type === filter
  );
  
  return (
    <div>
      <SyncStatus />
      <ProductFilter value={filter} onChange={setFilter} />
      <ProductGrid products={filteredProducts} />
    </div>
  );
}
```

#### Abonos - Registro de Pagos

```typescript
// routes/_protected.abonos.new.tsx
export default function NewAbonoPage() {
  const { data: customers } = useCustomers();
  const createPayment = useCreatePayment();
  
  const onSubmit = async (data: CreatePaymentInput) => {
    // Optimistic: Se guarda local inmediatamente
    await createPayment.mutateAsync(data);
    
    // Intenta sync si hay internet
    // Si no hay, queda en cola automáticamente
    
    navigate("/clientes");
  };
  
  return (
    <div>
      <SyncStatus />
      <PaymentForm 
        customers={customers}
        onSubmit={onSubmit}
      />
    </div>
  );
}
```

---

### FASE 4: Nueva Venta Completa (3 días)

#### Flujo de Venta con Electric

```
┌─────────────────────────────────────────────────────┐
│ NUEVA VENTA - Flujo Offline-First                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Seleccionar Cliente                             │
│     ├─ Buscar en colección local (instantáneo)     │
│     ├─ Si no existe: Crear nuevo (optimistic)      │
│     └─ Opción: "Venta sin cliente"                 │
│                                                     │
│  2. Agregar Productos                               │
│     ├─ Catálogo cargado de colección products      │
│     ├─ Calculadora integrada (Tara, Kilos, Precio) │
│     └─ Múltiples ítems                             │
│                                                     │
│  3. Tipo de Pago                                    │
│     ├─ Contado: Total completo                     │
│     └─ Crédito: Monto pagado (parcial)             │
│                                                     │
│  4. Confirmar                                       │
│     ├─ Guarda en TanStack DB (optimistic)          │
│     ├─ POST /api/sales (tu API Elysia)             │
│     ├─ Si online: Sync inmediato                   │
│     └─ Si offline: Cola de operaciones             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Tests y Validación

### Test Manual

1. **Abrir app**
   - [ ] Verificar en DevTools > Network: Electric WebSocket conectado
   - [ ] Verificar en DevTools > Application > IndexedDB: PGlite database

2. **Crear cliente offline**
   - [ ] Desconectar WiFi
   - [ ] Crear cliente
   - [ ] Verificar: Aparece inmediatamente en lista (optimistic)
   - [ ] Verificar: SyncStatus muestra "1 pendiente"

3. **Volver online**
   - [ ] Conectar WiFi
   - [ ] Verificar: Sync automático (1-2 segundos)
   - [ ] Verificar: Status cambia a "Sincronizado"
   - [ ] Verificar: Cliente aparece en PostgreSQL (pgAdmin/Neon)

4. **Sync real-time**
   - [ ] Abrir app en 2 navegadores (A y B)
   - [ ] Crear cliente en A
   - [ ] Verificar: Aparece automáticamente en B (sin refresh)

---

## 📋 Checklist de Implementación

### Fase 0: Setup Electric
- [ ] Crear cuenta Electric Cloud
- [ ] Conectar a PostgreSQL Neon
- [ ] Definir Shapes (customers, products, abonos, sales)
- [ ] Instalar dependencias (@electric-sql/react, @tanstack/react-db)
- [ ] Configurar variables de entorno

### Fase 1: Colecciones
- [ ] Crear `lib/db/client.ts` (conexión PGlite)
- [ ] Crear `lib/db/collections.ts` (3 colecciones)
- [ ] Crear hooks useLiveQuery para cada colección
- [ ] Crear componente SyncStatus

### Fase 2: UI Clientes
- [ ] Lista de clientes con búsqueda
- [ ] Formulario nuevo cliente (optimistic)
- [ ] Formulario editar cliente
- [ ] Detalle de cliente con historial

### Fase 3: Productos + Abonos
- [ ] Grid de productos con filtros
- [ ] Formulario de abono
- [ ] Cálculo de deuda en tiempo real

### Fase 4: Ventas
- [ ] Pantalla nueva venta
- [ ] Calculadora integrada
- [ ] Carrito de productos
- [ ] Confirmación y guardado

---

## 🔧 Troubleshooting

### Error: "Failed to connect to Electric"

**Causa:** Token inválido o shape no configurado  
**Solución:** Verificar `VITE_ELECTRIC_TOKEN` y que el shape exista en dashboard

### Error: "Shape not found"

**Causa:** La tabla no existe en PostgreSQL o no está publicada  
**Solución:**
```sql
-- En PostgreSQL
CREATE PUBLICATION electric_publication FOR TABLE customers, products, abonos, sales;
```

### Datos no aparecen en tiempo real

**Causa:** WebSocket bloqueado por firewall  
**Solución:** Verificar que el puerto 443 esté abierto (Electric usa HTTPS/WSS)

---

## 📚 Recursos

- [Documentación Electric SQL](https://electric-sql.com/docs)
- [TanStack DB + Electric Guide](https://electric-sql.com/docs/integrations/tanstack)
- [PGlite Documentation](https://pglite.dev/docs/)
- [Ejemplo Starter](https://github.com/electric-sql/electric/tree/main/examples/tanstack-db-web-starter)

---

*Plan actualizado para usar Electric SQL con TanStack DB para sync real-time y offline-first.*
