# Plan: Unificar providers de sync y eliminar duplicación

**Fecha:** 2026-04-23
**Estado:** Pendiente de aprobación
**Impacto:** `packages/drizzle-sync` (librería), `packages/app` (frontend)

---

## Problema

Existen **3 providers** donde debería haber **1**:

| Archivo | Rol | Estado |
|---------|-----|--------|
| `service-provider.tsx` | Sync state + domain services + adapter | Domain services **muertos** (`engine.getService()` falla porque `entities: []`). Sync state funciona pero re-implementa la librería. Lleno de `any`. |
| `services/context.tsx` | Domain services (contexto tipado) | **Solo este funciona** para domain. Usado por todos los hooks. |
| `_protected.tsx` | Monta ambos + pasa props redundantes | `businessId`, `businessUserId`, `authToken` se pasan al provider a pesar de que el engine ya los tiene. |

Además:
- Dos `useServices()` con el mismo nombre retornan objetos completamente diferentes
- `engine.getService("customers")` tira runtime error porque `entities: []` en `createAvileoSyncEngine`
- El test `use-sales.test.tsx` usa una API (`pg` como prop) que ya no existe

---

## Objetivo

Reducir a **1 provider** (`SyncProvider` de `@avileo/drizzle-sync/react`) + **cache genérico** `engine.use()` para instancias. Eliminar `service-provider.tsx` y `services/context.tsx`.

---

## Arquitectura objetivo

```
┌─────────────────────────────────────────┐
│  SyncClientEngine                       │
│  ├── use<T>(name, factory) ← NUEVO     │
│  │   Cache genérico de instancias.      │
│  │   Si existe → devuelve.              │
│  │   Si no → factory(), cachea, devuelve│
│  ├── has(name): boolean                 │
│  ├── get<T>(name): T | undefined        │
│  └── ... (API existente sin cambios)    │
└─────────────────────────────────────────┘
         │
         │  registerAppServices(engine)
         │  (llamado una vez en _protected.tsx)
         │
         ▼
┌─────────────────────────────────────────┐
│  SyncProvider (@avileo/drizzle-sync/react)│
│  Provee: SyncRuntimeContext + engine     │
└─────────────────────────────────────────┘
         │
    ┌────┴────────────────────────────┐
    │                                 │
    ▼                                 ▼
Hooks de domain                   Hooks de sync
useSyncEngine()                   useSyncState()
 .use("customers", () =>          useSyncStatus()
   new CustomerService(engine))   useSyncOperations()
 .use("sales", () => ...)         useHasPendingSync()
                                  useSyncEngine().getPullService()
```

---

## Paso 1: Agregar cache genérico a `SyncClientEngine` (librería)

**Archivo:** `packages/drizzle-sync/src/client/sync-client-engine.ts`

Agregar un `Map<string, unknown>` privado y 3 métodos públicos:

```typescript
private readonly instances: Map<string, unknown> = new Map();

use<T>(name: string, factory: () => T): T {
  if (this.instances.has(name)) {
    return this.instances.get(name) as T;
  }
  const instance = factory();
  this.instances.set(name, instance);
  return instance;
}

has(name: string): boolean {
  return this.instances.has(name);
}

get<T>(name): T | undefined {
  return this.instances.get(name) as T | undefined;
}
```

**No rompe nada.** No toca `services` Map existente, no toca `entities`, no toca el generador.

**Exportar tipos** en `packages/drizzle-sync/src/client/index.ts` si es necesario.

---

## Paso 2: Crear registro de app services

**Archivo nuevo:** `packages/app/app/lib/sync/register-services.ts`

Función pura que registra los 13 servicios de domain en el engine:

```typescript
import type { SyncClientEngine } from "@avileo/drizzle-sync/client";
import { CustomerService } from "../services/customer-service";
import { SaleService } from "../services/sale-service";
import { PaymentService } from "../services/payment-service";
import { PurchaseService } from "../services/purchase-service";
import { ProductService } from "../services/product-service";
import { InventoryService } from "../services/inventory-service";
import { TagService } from "../services/tag-service";
import { CustomerTagService } from "../services/customer-tag-service";
import { VisitaService } from "../services/visita-service";
import { CustomerGroupService } from "../services/customer-group-service";
import { DistribucionService } from "../services/distribucion-service";
import { SupplierService } from "../services/supplier-service";

export function registerAppServices(engine: SyncClientEngine): void {
  engine.use("customers", () => new CustomerService(engine));
  engine.use("sales", () => new SaleService(engine));
  engine.use("payments", () => new PaymentService(engine));
  engine.use("purchases", () => new PurchaseService(engine));
  engine.use("products", () => new ProductService(engine));
  engine.use("inventory", () => new InventoryService(engine));
  engine.use("tags", () => new TagService(engine));
  engine.use("customerTags", () => new CustomerTagService(engine));
  engine.use("visitas", () => new VisitaService(engine));
  engine.use("customerGroups", () => new CustomerGroupService(engine));
  engine.use("distribuciones", () => new DistribucionService(engine));
  engine.use("suppliers", () => new SupplierService(engine));
}
```

---

## Paso 3: Modificar `_protected.tsx`

**Archivo:** `packages/app/app/routes/_protected.tsx`

Cambios:

1. **Eliminar** `import { ServicesContext } from "~/lib/services/context"`
2. **Eliminar** `import { ServicesProvider } from "~/lib/sync/service-provider"`
3. **Agregar** `import { registerAppServices } from "~/lib/sync/register-services"`
4. **Eliminar** la creación manual de `services` object (`useMemo` con `new CustomerService(engine)`, etc.)
5. **Llamar** `registerAppServices(engine)` después de crear el engine
6. **Eliminar** `wrapWithEngine()` que monta `ServicesContext.Provider`
7. **Eliminar** todos los `<ServicesProvider ...>` mounts
8. **Mantener** solo `<SyncProvider>` de la librería (el que hoy se llama dentro de `LibrarySyncStateProvider` en `service-provider.tsx`)

### Provider tree resultante

```tsx
<EngineContext.Provider value={engine}>  {/* opcional, si useSyncEngine no alcanza */}
  <SyncProvider runtime={runtime} engine={engine}>
    {children}
  </SyncProvider>
</EngineContext.Provider>
```

**Nota:** `useSyncEngine()` de la librería ya consume `SyncRuntimeContext` que guarda `engine`. Si `SyncProvider` se monta correctamente con `engine` prop, `useSyncEngine()` funciona sin `EngineContext` adicional. Verificar esto durante la implementación.

### Eliminar props redundantes

Ya no se pasan `businessId`, `businessUserId`, `authToken` como props al provider. Todo se obtiene del engine:

```typescript
engine.getConfig().tenantId      // = businessId
engine.getConfig().userId         // = businessUserId
engine.getConfig().authToken      // = authToken
```

---

## Paso 4: Migrar hooks de domain (17 archivos + 1 componente)

Cada hook que hoy hace `const service = useCustomerService()` (de `~/lib/services/context`) cambia a:

```typescript
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { CustomerService } from "~/lib/services/customer-service";

export function useCustomers() {
  const engine = useSyncEngine();
  const customerService = engine.use("customers", () => new CustomerService(engine));
  // ... resto igual
}
```

`engine.use()` cachea la instancia — la factory solo se ejecuta una vez por engine.

### Archivos a modificar

**Hooks:**
- `hooks/use-customers.ts`
- `hooks/use-sales.ts`
- `hooks/use-sales-db.ts`
- `hooks/use-payments.ts`
- `hooks/use-products.ts`
- `hooks/use-product-variants.ts`
- `hooks/use-purchases.ts`
- `hooks/use-inventory.ts`
- `hooks/use-tags.ts`
- `hooks/use-visitas.ts`
- `hooks/use-grupos.ts`
- `hooks/use-suppliers.ts`
- `hooks/use-distribuciones.ts`
- `hooks/use-dashboard.ts`
- `hooks/use-accounts-receivable.ts`
- `hooks/use-customer-tags.ts`
- `hooks/use-customer-tags-with-details.ts`
- `hooks/use-customer-groups-with-details.ts`
- `hooks/use-customer-filters.ts`
- `hooks/use-bulk-assign-tags.ts`

**Componentes:**
- `components/purchases/purchase-form-context.tsx`

**Patrón de migración por archivo:**

```diff
- import { useCustomerService } from "~/lib/services/context";
+ import { useSyncEngine } from "@avileo/drizzle-sync/react";
+ import { CustomerService } from "~/lib/services/customer-service";

  export function useCustomers() {
-   const customerService = useCustomerService();
+   const engine = useSyncEngine();
+   const customerService = engine.use("customers", () => new CustomerService(engine));
    // ... resto sin cambios
  }
```

---

## Paso 5: Migrar consumidores de sync hooks (8 archivos)

### Mapeo de reemplazos

| Hook viejo (`service-provider.tsx`) | Hook nuevo (`@avileo/drizzle-sync/react`) |
|-------------------------------------|-------------------------------------------|
| `useSyncState()` | `useSyncState()` (mismo nombre, formato compatible — ya incluye `push` y `pull` anidados) |
| `useSyncStatus()` | `useSyncStatus()` (mismo nombre, mismos campos) |
| `useSyncService()` | `useSyncOperations()` (tipado, no `any`) |
| `usePullService()` | `useSyncEngine().getPullService()` |
| `useHasPendingSync()` | `useHasPendingSync()` (mismo nombre) |
| `useHasFailedSync()` | `useHasFailedSync()` |
| `useIsSyncStuck()` | `useIsSyncStuck()` |

### `SyncStateSnapshot` de la librería vs `SyncState` de service-provider

La librería YA incluye `push?: PushStateSnapshot` y `pull?: PullStateSnapshot` en `SyncStateSnapshot`. El runtime los pobla en `computeState()`:

```typescript
// create-sync-runtime.ts → computeState()
return {
  isSyncing, isOnline, isStuck, lastSyncTime,
  pendingCount, failedCount, conflictCount, deadLetterCount,
  push: { isProcessing, pendingCount, processingCount, syncingCount, ... },
  pull: { isPulling, lastPullTime, lastError, cursor, isStuck, ... },
};
```

Esto es compatible con `background-sync-badge.tsx` que usa `useSyncState().pull.isPulling` y `push.syncing > 0`.

### Diferencia de campos entre `SyncState` (app) y `SyncStateSnapshot` (librería)

| Campo app (`SyncState`) | Campo librería (`SyncStateSnapshot`) | Nota |
|--------------------------|--------------------------------------|------|
| `push.pending` | `push.pendingCount` | Diferente nombre |
| `push.processing` | `push.processingCount` | Diferente nombre |
| `push.syncing` | `push.syncingCount` | Diferente nombre |
| `push.completed` | `push.completedCount` | Diferente nombre |
| `push.failed` | `push.failedCount` | Diferente nombre |
| `push.conflict` | `push.conflictCount` | Diferente nombre |
| `push.deadLetter` | `push.deadLetterCount` | Diferente nombre |
| `push.total` | `push.totalCount` | Diferente nombre |
| `pull.isPulling` | `pull.isPulling` | Igual |
| `pull.isStuck` | `pull.isStuck` | Igual |
| `pull.lastPullTime` | `pull.lastPullTime` | Igual |

Los nombres de campos cambian de `snake` a `*Count`. Solo afecta a `background-sync-badge.tsx` que accede a `push.syncing` directamente.

### Archivos a modificar

**1. `hooks/use-sync-status.ts`**

```diff
- import { useSyncService } from "~/lib/sync/service-provider";
+ import { useSyncOperations } from "@avileo/drizzle-sync/react";

  export function useSyncStatus() {
-   const syncService = useSyncService();
+   const syncService = useSyncOperations();
    // ... resto sin cambios (API de syncService es idéntica)
  }
```

**2. `hooks/use-manual-sync.ts`**

```diff
- import { useSyncService, usePullService, useSyncState } from "~/lib/sync/service-provider";
+ import { useSyncOperations, useSyncState, useSyncEngine } from "@avileo/drizzle-sync/react";

  export function useManualSync() {
-   const syncService = useSyncService();
-   const pullService = usePullService();
-   const { isOnline, isSyncing: contextSyncing } = useSyncState();
+   const syncService = useSyncOperations();
+   const pullService = useSyncEngine().getPullService();
+   const { isOnline, isSyncing: contextSyncing } = useSyncState();
```

**3. `components/sync/sync-status-indicator.tsx`**

```diff
- import { useSyncState, useSyncStatus } from "~/lib/sync/service-provider";
+ import { useSyncState, useSyncStatus } from "@avileo/drizzle-sync/react";
```

**4. `components/sync/background-sync-badge.tsx`**

```diff
- import { useSyncState } from "~/lib/sync/service-provider";
+ import { useSyncState } from "@avileo/drizzle-sync/react";

  export function BackgroundSyncBadge() {
    const { pull, push } = useSyncState();
-   const isActive = pull.isPulling || push.syncing > 0;
+   const isActive = pull?.isPulling || (push?.syncingCount ?? 0) > 0;
```

Nota: `push` y `pull` son opcionales (`?`) en `SyncStateSnapshot`, por lo que se necesita optional chaining.

**5. `components/sync/sync-error-monitor.tsx`**

```diff
- import { useSyncStatus } from "~/lib/sync/service-provider";
+ import { useSyncStatus } from "@avileo/drizzle-sync/react";
```

**6. `components/sync/sync-debug-panel.tsx`**

```diff
- import { useSyncService } from "~/lib/sync/service-provider";
+ import { useSyncOperations } from "@avileo/drizzle-sync/react";

  export function SyncDebugPanel() {
-   const syncService = useSyncService();
+   const syncService = useSyncOperations();
    // ...
-   await (syncService as any)["processPending"]();
+   await syncService.processPending();
```

**7. `routes/_protected.config.sync.tsx`**

```diff
- import { useSyncService } from "~/lib/sync/service-provider";
+ import { useSyncOperations } from "@avileo/drizzle-sync/react";

  export default function SyncAdminPage() {
-   const syncService = useSyncService();
+   const syncService = useSyncOperations();
```

**8. `routes/_protected.distribuciones.nueva._index.tsx`**

```diff
- import { useHasPendingSync } from "~/lib/sync/service-provider";
+ import { useHasPendingSync } from "@avileo/drizzle-sync/react";
```

---

## Paso 6: Eliminar archivos muertos

### Archivos a eliminar

1. **`packages/app/app/lib/sync/service-provider.tsx`** — Todo su contenido es reemplazado por la librería + `register-services.ts`. Los hooks de domain que exportaba nadie los usa.

2. **`packages/app/app/lib/services/context.tsx`** — Los hooks que exporta son reemplazados por `useSyncEngine().use()`.

### Verificación previa a eliminar

```bash
grep -r "from.*service-provider" packages/app/ --include="*.ts" --include="*.tsx" | grep -v "service-provider.tsx"
grep -r "from.*services/context" packages/app/ --include="*.ts" --include="*.tsx" | grep -v "context.tsx"
```

Ambos deberían retornar **0 resultados** después de la migración.

---

## Paso 7: Arreglar test desactualizado

**Archivo:** `packages/app/app/hooks/use-sales.test.tsx`

El test importa `ServicesProvider` de `service-provider.tsx` y usa la API antigua (`pg` como prop). Se reescribe:

```typescript
// Opción 1: Mock directo del engine
const mockEngine = {
  use: vi.fn().mockReturnValue(mockSaleService),
  getConfig: vi.fn().mockReturnValue({ tenantId: "biz-1", userId: "seller-123" }),
  getPg: vi.fn().mockReturnValue(mockPg),
  getDb: vi.fn(),
  getSyncOperations: vi.fn().mockReturnValue({ enqueue: vi.fn() }),
};

// Opción 2: Montar SyncProvider de la librería con mock runtime
```

Decidir la estrategia durante la implementación. Lo importante es que el test no dependa de `service-provider.tsx`.

---

## Paso 8: Verificación

1. **Build:** `cd packages/app && bun run build` — debe pasar sin errores
2. **TypeCheck:** `cd packages/app && bun run typecheck` — debe pasar sin errores
3. **Tests:** `cd packages/app && bun test` — todos los tests deben pasar
4. **Runtime smoke test:** Abrir la app, navegar entre screens, verificar que sync state funciona

---

## Orden de ejecución

```
1. [lib]   Agregar use()/has()/get() a SyncClientEngine
2. [app]   Crear register-services.ts
3. [app]   Migrar _protected.tsx (eliminar providers viejos, montar SyncProvider de librería)
4. [app]   Migrar 8 consumidores de sync hooks (paso 5)
5. [app]   Migrar 17+ hooks de domain (paso 4)
6. [app]   Arreglar use-sales.test.tsx (paso 7)
7. [app]   Eliminar service-provider.tsx y services/context.tsx (paso 6)
8. [all]   Verificar build + typecheck + tests (paso 8)
```

Los pasos 4 y 5 pueden hacerse en paralelo o en cualquier orden ya que son independientes.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| `useSyncEngine()` falla fuera de `SyncProvider` | Bajo | Los componentes solo se renderizan dentro de `_protected.tsx` donde `SyncProvider` está montado |
| `SyncStateSnapshot.push/pull` es `undefined` en algún edge case | Medio | Optional chaining (`push?.syncingCount`) en `background-sync-badge.tsx` |
| Alguna import de `services/context` queda huérfana | Bajo | `grep` final antes de eliminar archivos |
| Test `use-sales.test.tsx` necesita más trabajo del esperado | Bajo | Es un test chico (94 líneas), se puede reescribir completamente |

---

## No tocados (out of scope)

- `createAvileoSyncEngine` (auto-generado) — no se modifica, `entities: []` sigue así
- Generador de código (`drizzle-sync`) — solo se agrega `use()`, no se toca templates
- `packages/app/app/lib/debug/console/service-helpers.ts` — usa `syncService` internamente, puede requerir adaptación menor
- Generated hooks (`packages/app/app/lib/sync/generated/hooks.ts`) — usan `useEngineService<T>()` de la librería, no afectados
