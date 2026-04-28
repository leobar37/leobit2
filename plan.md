# Plan: Migración de Offline-First a Online-First

> Rama: `main` (después del backup `feature/offline-first-backup`)
> Fecha: 2026-04-27
> Objetivo: Simplificar la arquitectura eliminando PGlite + sync local, usando API REST directa vía Eden Treaty.

---

## 1. Estado Actual (Offline-First)

### Arquitectura

```
Frontend (React Router v7)
├── @avileo/drizzle-sync (engine local PGlite + sync)
│   ├── SyncClientEngine (PGlite WASM + Drizzle ORM)
│   ├── SyncWritePort (cola de operaciones sync)
│   └── FrameworkSyncProvider (React context)
├── Services (~lib/services/)
│   ├── BaseService (envuelve engine, batch, sync queue)
│   ├── SaleService, CustomerService, etc. (CRUD local + sync)
│   └── GeneratedServices (drizzle-sync generados)
├── Hooks (~hooks/)
│   └── useSales, useCustomers, etc. (useEngineService + TanStack Query)
└── Protected Layout (_protected.tsx)
    ├── Inicializa engine (PGlite + staged sync)
    ├── SyncProvider + ConflictResolver
    └── DevTools de sync
```

### Dependencias Clave a Eliminar/Modificar

| Dependencia | Uso Actual | Acción |
|-------------|-----------|--------|
| `@avileo/drizzle-sync` | Engine, sync queue, batch, React hooks | **Eliminar** |
| `@avileo/drizzle-sync/react` | `useSyncInit`, `useEngineService`, providers | **Eliminar** |
| `@avileo/drizzle-sync/client` | HTTP client para sync | **Eliminar** |
| `@avileo/drizzle-sync/pglite` | Validación de tablas PGlite | **Eliminar** |
| `pglite` / `@electric-sql/pglite` | Base de datos local WASM | **Eliminar** |
| `drizzle-orm/pglite` | Driver Drizzle para PGlite | Reemplazar por driver PostgreSQL estándar o eliminar |
| `syncStatus`, `syncAttempts`, `version` | Campos en entidades para sync | **Eliminar** de schemas y tipos |

---

## 2. Estado Objetivo (Online-First)

### Arquitectura

```
Frontend (React Router v7)
├── API Client (Eden Treaty) ──→ Backend ElysiaJS
├── TanStack Query (caching + optimistic updates)
├── Services (~lib/services/)  ← NUEVO: capa ligera sobre API
└── Hooks (~hooks/)            ← usan services + TanStack Query
```

### Principios

1. **Todas las escrituras van directo al backend** vía `api` (Eden Treaty).
2. **TanStack Query** maneja cache, invalidación, reintentos y estados de loading/error.
3. **No hay base de datos local.** Los datos viven en el servidor; el frontend solo los consume.
4. **Offline básico:** TanStack Query cachea datos y puede mostrar stale data mientras no hay conexión, pero no permite escrituras offline.
5. **Simplificación masiva:** Se eliminan ~2,500+ líneas de código relacionadas con sync, conflict resolution, engine initialization, y PGlite.

---

## 3. Cambios por Área

### 3.1 Services (`packages/app/app/lib/services/`)

#### 3.1.1 Eliminar `BaseService` y regenerar

- **Eliminar:** `base-service.ts` (298 líneas)
- **Eliminar:** Todos los imports de `@avileo/drizzle-sync/*`
- **Eliminar:** `SyncClientEngineLike`, `BatchContext`, `SyncWritePort`
- **Eliminar:** Métodos `queueSync`, `updateSyncStatus`, `incrementSyncVersion`
- **Eliminar:** Campos `syncStatus`, `syncAttempts`, `version` de interfaces

#### 3.1.2 Nuevo `BaseService` (online)

```typescript
// base-service.ts (nuevo)
export abstract class BaseService {
  // Solo helpers comunes: formatCurrency, generateId, etc.
  // Sin engine, sin db, sin sync
}
```

#### 3.1.3 Migrar `SaleService`

**Actual (offline):**
- Extends `BaseService`
- Usa `this.db` (PGlite Drizzle) para queries
- Usa `this.engine.batch()` para transacciones locales
- Usa `generatedSalesService.createInBatch()` con sync

**Nuevo (online):**
- Extends `BaseService` (nuevo, sin engine)
- Importa `api` desde `~/lib/api-client`
- Todos los métodos llaman endpoints REST directamente
- Usa `extractData()` para parsear respuestas

| Método | Endpoint Actual (Backend) | Acción |
|--------|---------------------------|--------|
| `findById(id)` | `GET /sales/:id` | `api.sales({ id }).get()` |
| `findPageByBusiness(query)` | `GET /sales?limit=&offset=&...` | `api.sales.get({ query })` |
| `createWithItems(sale, items)` | `POST /sales` | `api.sales.post(body)` |
| `confirm(id)` | `POST /sales/:id/confirm` | `api.sales({ id }).confirm.post()` |
| `confirmPreOrder(id, version)` | `POST /sales/:id/confirm` | `api.sales({ id }).confirm.post({ body: { baseVersion } })` |
| `deliver(id)` | `POST /sales/:id/deliver` | `api.sales({ id }).deliver.post()` |
| `finalizeDelivery(id, opts)` | **NUEVO ENDPOINT** | Requiere `PATCH /sales/:id` o nuevo endpoint |
| `cancel(id, reason)` | `POST /sales/:id/cancel` | `api.sales({ id }).cancel.post({ body: { reason } })` |
| `update(id, input)` | `PATCH /sales/:id` | `api.sales({ id }).patch.patch({ body: input })` |
| `delete(id)` | `DELETE /sales/:id` | `api.sales({ id }).delete.delete()` |
| `addItem(saleId, item)` | `POST /sales/:id/items` | `api.sales({ id }).items.post({ body: item })` |
| `updateItem(saleId, itemId, data)` | `PATCH /sales/:id/items/:itemId` | `api.sales({ id }).items({ itemId }).patch.patch()` |
| `removeItem(saleId, itemId)` | `DELETE /sales/:id/items/:itemId` | `api.sales({ id }).items({ itemId }).delete.delete()` |
| `recordPayment(saleId, amount, method)` | `POST /payments` | `api.payments.post({ body: { ... } })` |
| `getSalesStats(period)` | `GET /sales/today-stats` o reports | Usar endpoint de reportes |
| `getDebtorsSummary()` | `GET /reports/debtors` | Nuevo endpoint o query |
| `getSalesChart(period)` | `GET /reports/sales-chart` | Nuevo endpoint o query |

> **Nota:** El backend YA TIENE endpoints para la mayoría de operaciones. Verificar que `finalizeDelivery` esté expuesto o agregarlo.

#### 3.1.4 Migrar otros Services

Repetir el mismo patrón para:

- `customer-service.ts` → `api.customers.*`
- `product-service.ts` → `api.products.*`
- `distribucion-service.ts` → `api.distribuciones.*`
- `payment-service.ts` → `api.payments.*`
- `purchase-service.ts` → `api.purchases.*`
- `inventory-service.ts` → `api.inventory.*`
- `supplier-service.ts` → `api.suppliers.*`
- `visita-service.ts` → `api.visitas.*`
- `customer-tag-service.ts`, `customer-group-service.ts` → endpoints correspondientes

#### 3.1.5 Eliminar `generated/` de sync

**Eliminar todo el directorio:**
```
packages/app/app/lib/sync/generated/
├── schemas.ts
├── services.ts
├── schema.ts
├── schema-sql.ts
├── init.sql
├── applier.ts
├── engine.ts
├── file-fields.ts
├── query-keys.ts
├── sync-tables.ts
├── types.ts
└── hooks.ts
```

> Estos son generados por `@avileo/drizzle-sync` y no tienen sentido sin el engine local.

#### 3.1.6 Eliminar `service-overrides.ts`

- `service-overrides.ts` y `types.ts` en `~/lib/sync/` son específicos del sync framework.

---

### 3.2 Hooks (`packages/app/app/hooks/`)

#### 3.2.1 Eliminar `useEngineService`

**Actual:**
```typescript
const saleService = useEngineService<SaleService>("sales");
```

**Nuevo:**
```typescript
// Los hooks usan el service directamente (instancia singleton o funciones puras)
import { saleService } from "~/lib/services/sale-service";
// o simplemente llaman api directamente sin service
```

#### 3.2.2 Migrar `use-sales.ts`

**Actual:** `useSales`, `useSale`, `useCreateSale`, etc. usan `useEngineService` + `saleService.findPageByBusiness()`.

**Nuevo:**
```typescript
export function useSales(filters?: SaleFilters) {
  return useQuery({
    queryKey: ["sales", filters],
    queryFn: async () => {
      const { data, error } = await api.sales.get({ query: { ...filters, limit: 50 } });
      if (error) throw new Error(String(error.value));
      return extractData(data);
    },
  });
}
```

#### 3.2.3 Eliminar hooks específicos de sync

- `use-manual-sync.ts` → **Eliminar**
- `use-clear-sync-storage.ts` → **Eliminar**
- `use-offline-aware-mutation.ts` → Simplificar (solo detectar online/offline, no sync)
- `use-sales-db.ts` → **Eliminar** (consolidar en `use-sales.ts`)

#### 3.2.4 Tests de hooks

- `use-sales.test.tsx` → Reescribir sin mocks de `@avileo/drizzle-sync`
- `use-sales-db.test.tsx` → **Eliminar**

---

### 3.3 Layout Protegido (`_protected.tsx`)

#### 3.3.1 Eliminar SyncProviders y Engine Init

**Eliminar:**
- `FrameworkSyncProvider` de `@avileo/drizzle-sync/react`
- `SyncDevToolsProvider`
- `createSyncReactRuntime`
- `useSyncInit`
- `createAvileoSyncEngine`
- Todo el `ServicesProviderWrapper` con `useState<LocalEngineState>`
- Todo el código de inicialización de engine (`useEffect` que crea engine)
- `ConflictResolver` y `handleResolveConflict`
- `initDevTools`, `addServiceDebugHelpers`

**Nuevo `_protected.tsx` (simplificado):**
```typescript
export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { data: business, isLoading: isBusinessLoading } = useBusiness();

  // Sin engine, sin sync init, sin conflict resolver
  // Solo: auth check → business check → render Outlet
}
```

#### 3.3.2 Estados de Loading a Eliminar

- "Inicializando base de datos local..."
- "Error de sincronización" (schema error)
- `hasInitTimeout`
- Barra de "Modo offline - datos del negocio en cache" (conservar detección simple)

---

### 3.4 Componentes de Sync

#### 3.4.1 Eliminar/Deprecar

| Componente | Ubicación | Acción |
|------------|-----------|--------|
| `ConflictResolver` | `components/sync/conflict-resolver.tsx` | **Eliminar** |
| `SyncStatusIndicator` | `components/sync/sync-status.tsx` | **Eliminar** o simplificar a solo "online/offline" |
| `SyncDevTools` | `lib/debug/` | **Eliminar** |

---

### 3.5 Dependencias y Package.json

#### 3.5.1 Dependencias a Eliminar

```json
// packages/app/package.json
{
  "dependencies": {
    "@avileo/drizzle-sync": "workspace:*",        // ELIMINAR
    "@electric-sql/pglite": "^x.x.x",               // ELIMINAR
    "pglite": "^x.x.x",                             // ELIMINAR (si existe)
  }
}
```

#### 3.5.2 Dependencias a Mantener/Agregar

- `@elysiajs/eden` (ya existe, usar más intensivamente)
- `@tanstack/react-query` (ya existe, seguir usando)
- `jotai` (ya existe, UI state)

---

### 3.6 Backend (API Endpoints)

#### 3.6.1 Verificar/Completar Endpoints

El backend YA tiene la mayoría de endpoints necesarios. Verificar:

| Endpoint | Estado | Nota |
|----------|--------|------|
| `GET /sales` | ✅ Existe | Con query params limit/offset/filters |
| `GET /sales/:id` | ✅ Existe | Con items incluidos (verificar) |
| `POST /sales` | ✅ Existe | Crea venta con items |
| `PATCH /sales/:id` | ✅ Existe | Update general |
| `POST /sales/:id/confirm` | ✅ Existe | Confirm draft |
| `POST /sales/:id/deliver` | ✅ Existe | Deliver pre_order |
| `POST /sales/:id/cancel` | ✅ Existe | Cancel sale |
| `DELETE /sales/:id` | ✅ Existe | Delete draft |
| `POST /sales/:id/items` | ✅ Existe | Add item |
| `PATCH /sales/:id/items/:itemId` | ✅ Existe | Update item |
| `DELETE /sales/:id/items/:itemId` | ✅ Existe | Remove item |
| `POST /payments` | ✅ Existe | Record payment |
| `GET /sales/today-stats` | ✅ Existe | Dashboard stats |
| `GET /reports/*` | ⚠️ Verificar | Debtors, charts |

#### 3.6.2 Nuevos Endpoints Necesarios (si faltan)

- `POST /sales/:id/finalize-delivery` — para `finalizeDelivery()`
- `GET /reports/debtors-summary` — para `getDebtorsSummary()`
- `GET /reports/sales-chart` — para `getSalesChart()`

> **Decisión:** ¿Agregar endpoints al backend o calcular en frontend con datos paginados?
> **Recomendación:** Dashboard stats (today-stats) ya existe. Para debtors y charts, crear endpoints backend simples.

---

### 3.7 Esquemas y Tipos

#### 3.7.1 Eliminar campos de sync

De las interfaces en `sale-service.ts`, `customer-service.ts`, etc.:

```typescript
// ELIMINAR de todas las interfaces:
syncStatus: "pending" | "synced" | "error";
syncAttempts: number;
version: number;
```

#### 3.7.2 Tipos compartidos

Verificar si `@avileo/shared` tiene tipos con campos de sync. Si es así:
- Opción A: Modificar shared (afecta backend también)
- Opción B: Crear tipos frontend-only sin esos campos

> **Recomendación:** Opción A — los campos `syncStatus`, `syncAttempts` no tienen sentido en backend tampoco. El backend usa transacciones SQL directas.

---

### 3.8 Cache y Estado

#### 3.8.1 TanStack Query como fuente de verdad

| Concern | Offline-First | Online-First |
|---------|--------------|--------------|
| Fuente de verdad | PGlite local | PostgreSQL backend |
| Cache | TanStack Query + PGlite | TanStack Query solamente |
| Cache persistence | PersistQueryClientProvider (ya existe) | Mantener |
| Optimistic updates | En sync engine + TanStack Query | Solo TanStack Query |
| Invalidación | Manual por sync + auto por TQ | Auto por TQ + manual en mutations |

#### 3.8.2 Persistencia de Query Client

Ya existe en `packages/app/app/lib/query/persisted-query-keys.ts`. Mantener para que la app funcione con datos cacheados al recargar sin conexión (solo lectura).

---

## 4. Orden de Implementación (Fases)

### Fase 1: Preparación (sin tocar UI)
1. **Auditar backend endpoints** — Listar todos los endpoints existentes y mapear a service methods.
2. **Crear nuevo `BaseService`** — Versión mínima sin engine/sync.
3. **Crear `ApiService` helper** — Wrapper sobre `api` con `extractData` y manejo de errores.

### Fase 2: Migrar Services Core (1 por 1)
1. **SaleService** — El más grande (1468 líneas). Migrar método por método.
2. **CustomerService**
3. **ProductService**
4. **PaymentService**
5. **Resto de services**

### Fase 3: Migrar Hooks
1. Reescribir `use-sales.ts` (sin `useEngineService`)
2. Reescribir `use-customers.ts`
3. Reescribir `use-products.ts`
4. Eliminar/consolidar `use-*-db.ts` files

### Fase 4: Limpiar Layout y Sync
1. Simplificar `_protected.tsx`
2. Eliminar `ConflictResolver`
3. Eliminar `SyncDevToolsProvider`
4. Eliminar `useSyncInit`, `useManualSync`

### Fase 5: Limpiar Dependencias y Código Muerto
1. Eliminar `@avileo/drizzle-sync` de `package.json`
2. Eliminar directorio `~/lib/sync/generated/`
3. Eliminar `~/lib/sync/service-overrides.ts`
4. Eliminar `~/lib/sync/types.ts`
5. Eliminar `~/lib/debug/sync-devtools.ts`
6. Eliminar campos `syncStatus`, `syncAttempts`, `version` de tipos

### Fase 6: Testing y Verificación
1. Reescribir tests de hooks (sin mocks de drizzle-sync)
2. Verificar todos los flujos: crear venta, agregar items, confirmar, cancelar, etc.
3. Probar online/offline básico (TanStack Query cache)

---

## 5. Decisiones Pendientes

### 5.1 ¿Eliminar completamente `@avileo/drizzle-sync` o mantenerlo desactivado?

**Opción A (Recomendada):** Eliminar completamente. Reduce bundle size, complejidad, y tiempo de build.

**Opción B:** Mantener como dependencia opcional. No recomendado — código muerto acumula deuda técnica.

### 5.2 ¿Qué hacer con `BaseService.generateId()`?

Actualmente usa `crypto.randomUUID()`. En el backend los IDs también son `cuid2` vía `@paralleldrive/cuid2`.

**Decisión:** Generar IDs en el frontend con `crypto.randomUUID()` para drafts, pero dejar que el backend genere IDs finales para operaciones confirmadas. O usar `cuid2` en frontend también.

### 5.3 ¿Drafts persistentes?

En offline-first, los drafts viven en PGlite local. En online-first:

**Opción A:** Crear drafts como `POST /sales` con `status: "draft"` directo en backend. Si no hay conexión, el draft se pierde.

**Opción B:** Mantener una pequeña capa de storage local (localStorage/IndexedDB) SOLO para drafts no enviados. Más complejo.

**Recomendación:** Opción A. La app está pensada para vendedores con conexión 4G/WiFi. Si pierden conexión momentáneamente, pueden reintentar.

### 5.4 ¿Mantener `sale-service.test.ts`?

El test actual prueba lógica de PGlite. Reescribir para probar contra mocks de `api` (msw o mock de `api-client`).

---

## 6. Estimación de Impacto

| Área | Archivos | Líneas aprox. | Complejidad |
|------|----------|---------------|-------------|
| Services | ~15 archivos | ~8,000 | Alta |
| Hooks | ~20 archivos | ~3,000 | Media |
| Layout/Providers | 3-5 archivos | ~800 | Media |
| Components sync | 2-3 archivos | ~400 | Baja |
| Backend endpoints | 2-3 archivos | ~200 | Baja |
| Tipos/Schemas | Shared package | ~100 | Baja |
| Tests | ~10 archivos | ~1,000 | Media |
| **Total** | **~55 archivos** | **~13,500** | **Alta** |

> Nota: La mayoría de cambios son **eliminación** de código, no creación. El neto probablemente sea -5,000 líneas.

---

## 7. Rollback Plan

Si algo falla gravemente:

```bash
# La rama offline-first-backup tiene TODO el código original
git checkout feature/offline-first-backup
# O cherry-pick archivos específicos desde backup
```

---

## 8. Notas Técnicas

### 8.1 Eden Treaty + Autenticación

El `api-client.ts` ya configura headers `Authorization` y `x-business-id`. No requiere cambios.

### 8.2 Manejo de Errores

En online-first, los errores de red deben mostrarse al usuario:
- Timeout: "El servidor no responde. Intenta de nuevo."
- 401: Redirigir a login
- 409 (conflict): Mostrar mensaje y recargar datos
- 400: Mostrar mensaje de validación

### 8.3 Optimistic Updates

Mantener el patrón actual con `queryClient.setQueryData` + `invalidateQueries` en `onSuccess`.

### 8.4 Paginación

Ya existe `findPageByBusiness`. En online-first, usar server-side pagination con TanStack Query `useInfiniteQuery` o `keepPreviousData`.

---

## 9. Checklist de Finalización

- [ ] Ningún import de `@avileo/drizzle-sync` en el frontend
- [ ] Ningún import de `pglite` o `@electric-sql/pglite`
- [ ] `_protected.tsx` no inicializa engine ni muestra pantallas de sync
- [ ] `useSales`, `useCustomers`, etc. usan `api` directamente
- [ ] `SaleService` no extiende `BaseService` con engine
- [ ] Todos los tests pasan
- [ ] Bundle size reducido (verificar con `bun run build`)
- [ ] Flujo completo de venta funciona: crear → agregar items → confirmar
- [ ] Login/logout funciona sin errores de sync
- [ ] App carga rápido (sin init de PGlite)

---

*Documento creado para guiar la migración. Actualizar según avance.*
