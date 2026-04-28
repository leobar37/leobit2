# Plan Full-Stack: Eliminar Sync Engine — Backend Clean Schema + Hooks con Eden Treaty

> **Rama de trabajo:** `main`
> **Enfoque:** Primero se eliminan los campos/contratos de sincronización del backend y se corre la migración. Luego el frontend elimina toda lógica local y los hooks consumen `api` (Eden Treaty) directamente. No hay engine, no hay PGlite, no hay sync.
> **Alcance:** `packages/backend/`, `packages/shared/`, `packages/app/`

---

## TL;DR

Eliminar completamente la arquitectura offline-first del frontend:

| Capa | Estado Actual | Estado Objetivo |
|------|--------------|-----------------|
| **Datos** | PGlite local + sync engine | API REST vía Eden Treaty |
| **Services** | 15 clases extendiendo `BaseService` con engine | ❌ Eliminadas |
| **Hooks** | `useEngineService` + services locales | `useQuery`/`useMutation` + `api.*` |
| **Providers** | `FrameworkSyncProvider`, `SyncDevToolsProvider`, engine init | ❌ Eliminados |
| **UI Sync** | Badges de sync, conflict resolver, devtools | ❌ Eliminados |
| **Build** | WASM de PGlite, workers, PWA cache sync | Config limpia |

**Prerequisito crítico:** antes de migrar hooks del frontend, el backend debe dejar de exponer campos de sincronización (`syncStatus`, `syncAttempts`, y `version` solo si es sync-only) y debe correr la migración de base de datos correspondiente.

**Estimated effort:** Large (~30-40 tasks)  
**Parallel execution:** YES — por entidad  
**Critical path:** Backend schema cleanup + migration → Shared/API clean types → Helpers → Hooks simples → Hooks ventas → Layout cleanup → Deletion → Build

---

## Contexto

### Metis Review: Gaps Identificados

**Preguntas que debemos resolver antes:**
1. **Offline behavior:** La app ya no funcionará sin internet. Los vendedores no podrán crear ventas offline. ¿Aceptamos esto? → **SÍ**, es el objetivo de la migración.
2. **Backend API parity:** ¿Todos los endpoints existen? → El backend debe limpiarse primero; ventas se cubre con el plan backend y este plan agrega Wave 0 obligatorio para schema/entities/migrations.
3. **Inventory local:** `InventoryService` es local-only. ¿Hay endpoint backend? → Pendiente de verificación.

**Riesgos identificados:**
- `syncStatus`, `syncAttempts`, `version` en tipos/entidades → eliminar
- Componentes UI que muestran badges de sync → eliminar
- Tests que mockean `@avileo/drizzle-sync/react` → reescribir
- `root.tsx` suprime errores de PGlite → limpiar
- `vite.config.ts` configura workers/WASM para PGlite → limpiar

**Guardrails aplicados:**
- Ningún import de `@avileo/drizzle-sync` o `@electric-sql/pglite` debe quedar
- Ningún `useEngineService`, `useSyncEngine`, `SyncProvider`
- Ningún API response/DTO debe exponer `syncStatus` o `syncAttempts`
- `version` solo se elimina si es metadata de sync/conflict offline. Si se usa para optimistic locking real del backend, se conserva o se reemplaza por un contrato explícito.
- Todos los hooks usan `api` desde `~/lib/api-client`
- Hooks antes de eliminar services (para no romper build)

---

## Work Objectives

### Core Objective
Convertir el frontend de un cliente offline-first con base de datos local a un cliente online-first que consume API REST directamente.

### Concrete Deliverables
1. Backend Drizzle schemas sin campos de sincronización
2. Migración generada y aplicada para remover columnas sync-only
3. Backend repositories/services/API routes sin `syncStatus`/`syncAttempts` en contratos
4. Shared package y Eden Treaty types limpios
5. Helpers de API (`unwrapApiResponse`, query key factory)
6. Hooks reescritos para TODAS las entidades (customers, products, sales, payments, etc.)
7. Layout `_protected.tsx` sin engine ni sync providers
8. Código muerto eliminado (services, sync, generated, debug)
9. Build limpio (package.json, vite.config.ts sin PGlite)
10. Tests reescritos

### Definition of Done
```bash
# Backend clean schema check
grep -R "syncStatus\|syncAttempts\|sync_status\|sync_attempts" packages/backend/src packages/shared/src
# Expected: no matches, except intentional migration history if reviewed separately

# Backend migration/test
cd packages/backend && bun run db:generate
cd packages/backend && bun run db:migrate
cd packages/backend && bun test

# Cero imports de sync/PGlite
grep -R "@avileo/drizzle-sync\|@electric-sql/pglite\|useEngineService\|useSyncEngine\|SyncClientEngineLike" packages/app/app
# Expected: no matches

# Build exitoso
cd packages/app && bun run build

# Tests pasan
cd packages/app && bun test
```

---

## Verification Strategy

### Test Infrastructure
- **Framework:** Vitest (ya configurado)
- **Estrategia:** MSW para mockear API REST en tests de hooks
- **No se configura test infra nueva** — se usa lo existente

### QA Policy
Cada task incluye agent-executed QA. Los escenarios usan:
- **API:** `curl` contra endpoints del backend
- **Build:** `bun run build` y `bun run typecheck`
- **Tests:** `bun test` para verificar hooks

---

## Execution Strategy

### Wave 0: Backend Schema + API Cleanup (PREREQUISITO OBLIGATORIO)
- **Task B1:** Auditar todos los campos sync en backend/shared
- **Task B2:** Remover columnas sync-only de Drizzle schemas y limpiar repositories/services
- **Task B3:** Limpiar API DTOs/responses y endpoints sync-only
- **Task B4:** Generar/revisar/aplicar migración de base de datos
- **Task B5:** Rebuild shared/backend y verificar Eden Treaty types limpios

> **Gate:** No iniciar Wave 1 frontend hasta que B1-B5 pasen. Si `api.*` aún infiere `syncStatus`/`syncAttempts`, el backend no está limpio.

### Wave 1: Foundation (bloquea todo lo demás)
- **Task 1:** Crear `~/lib/api-utils.ts` con `unwrapApiResponse` helper
- **Task 2:** Crear `~/lib/query-keys.ts` con factory de query keys
- **Task 3:** Actualizar `~/lib/api-client.ts` si es necesario (revisar tipos)

### Wave 2: Hooks Simples (paralelizables entre sí)
- [x] **Task 4:** `use-customers.ts` — rewrite con `api.customers.*`
- [x] **Task 5:** `use-products.ts` — rewrite con `api.products.*`
- [x] **Task 6:** `use-tags.ts` — rewrite con `api.tags.*`
- [x] **Task 7:** `use-suppliers.ts` — rewrite con `api.suppliers.*`
- [x] **Task 8:** `use-visitas.ts` — rewrite con `api.visitas.*`

### Wave 3: Hooks Complejos (dependen de Wave 1)
- [x] **Task 9:** `use-sales.ts` — rewrite con `api.sales.*`
- [x] **Task 10:** `use-sales-db.ts` — ELIMINAR, consolidar en `use-sales.ts`
- [x] **Task 11:** `use-payments.ts` — rewrite con `api.payments.*`
- [x] **Task 12:** `use-distribuciones.ts` — rewrite con `api.distribuciones.*`
- [x] **Task 13:** `use-inventory.ts` — rewrite o verificar endpoint backend

### Wave 4: Dashboard + Analysis
- [x] **Task 14:** `use-dashboard.ts` — eliminar fallback local, usar `api.reports.*`
- [x] **Task 15:** `use-sale-analysis.ts` — eliminar fallback local, usar `api.reports.*`

### Wave 5: Layout + Providers
- **Task 16:** `_protected.tsx` — eliminar engine init, sync providers, devtools
- **Task 17:** `root.tsx` — eliminar supresión de errores PGlite

### Wave 6: Componentes Sync
- **Task 18:** Eliminar `components/sync/*` (conflict-resolver, sync-status, etc.)
- **Task 19:** Eliminar `components/layout/app-layout.tsx` referencias a sync
- **Task 20:** Eliminar `lib/debug/console/service-helpers.ts`
- **Task 21:** Eliminar `lib/debug/` completo si solo era para sync

### Wave 7: Eliminación de Services y Sync
- **Task 22:** Eliminar `lib/services/*` (todos los services)
- **Task 23:** Eliminar `lib/sync/generated/*` (código generado)
- **Task 24:** Eliminar `lib/sync/service-overrides.ts`
- **Task 25:** Eliminar `lib/sync/types.ts`, `schema-error.ts`
- **Task 26:** Eliminar `hooks/use-manual-sync.ts`
- **Task 27:** Eliminar `hooks/use-clear-sync-storage.ts`
- **Task 28:** Eliminar `hooks/use-offline-aware-mutation.ts` o simplificar

### Wave 8: Config y Dependencias
- **Task 29:** `package.json` — eliminar `@avileo/drizzle-sync`, `@electric-sql/pglite`
- **Task 30:** `vite.config.ts` — eliminar config de WASM/workers de PGlite
- **Task 31:** `tsconfig.json` — revisar paths si cambian

### Wave 9: Tests
- **Task 32:** Reescribir `hooks/use-sales.test.tsx`
- **Task 33:** Reescribir `hooks/use-sales-db.test.tsx` o eliminar
- **Task 34:** Reescribir tests de otros hooks afectados

### Wave Final: Verificación
- **Task F1:** `grep` por imports prohibidos → debe dar vacío
- **Task F2:** `bun run build` → debe pasar
- **Task F3:** `bun test` → debe pasar
- **Task F4:** Smoke test con Playwright: login → dashboard → ventas → crear venta

---

## TODOs

- [x] B1. **Backend Audit — identificar campos sync en schemas, repos y API**

  **What to do**:
  - Buscar referencias en backend/shared:
    - `syncStatus`, `sync_status`
    - `syncAttempts`, `sync_attempts`
    - `version` cuando sea usado exclusivamente para sync/conflict offline
    - `syncGroupId`, `sync_group_id`, `lastSyncedAt`, `last_synced_at` si existen
  - Crear mapa por entidad/tabla: customers, sales, sale_items, products, product_variants, tags, customer_tags, purchases, purchase_items, payments/abonos, distribuciones, visitas, suppliers, customer_groups, customer_group_members.
  - Clasificar `version`:
    - **DROP** si solo sirve para sync/conflict offline
    - **KEEP/RENAME** si sirve para optimistic locking del backend online (ej. endpoints públicos o edición concurrente real)

  **Must NOT do**:
  - No eliminar `createdAt`/`updatedAt`; no son campos de sync.
  - No borrar `version` sin confirmar si es contrato de negocio.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`fullstack-backend`, `avileo`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0
  - **Blocks**: B2, B3, B4, B5, y todo frontend
  - **Blocked By**: None

  **References**:
  - `packages/backend/src/db/schema/` — Drizzle table definitions
  - `packages/backend/src/services/repository/` — selects/inserts/updates que pueden tocar sync fields
  - `packages/backend/src/api/` — DTOs/responses expuestos vía Eden Treaty
  - `packages/shared/src/` — tipos compartidos que puede consumir frontend

  **Acceptance Criteria**:
  - [ ] Documento/listado interno de entidades con campos sync encontrados
  - [ ] Decisión explícita para `version`: DROP/KEEP por entidad
  - [ ] No quedan campos sin clasificar

  **QA Scenarios**:
  ```
  Scenario: Auditoría completa de campos sync
    Tool: Bash
    Steps:
      1. grep -R "syncStatus\|syncAttempts\|sync_status\|sync_attempts\|syncGroupId\|sync_group_id\|lastSyncedAt\|last_synced_at" packages/backend/src packages/shared/src
      2. grep -R "version" packages/backend/src/db/schema packages/backend/src/api packages/backend/src/services
    Expected Result: Cada match está clasificado como DROP o KEEP con justificación
    Evidence: .sisyphus/evidence/task-B1-backend-sync-audit.txt
  ```

  **Commit**: NO

---

- [x] B2. **Backend Schema/Repository Cleanup — remover campos sync-only**

  **What to do**:
  - Remover columnas sync-only de `packages/backend/src/db/schema/*.ts`.
  - Remover campos sync-only de inserts/updates/selects en repositories.
  - Remover validaciones/branches de services que dependan solo de sync offline.
  - Actualizar indexes que referencien columnas removidas.
  - Conservar multi-tenancy (`businessId`) y timestamps (`createdAt`, `updatedAt`).

  **Must NOT do**:
  - No romper optimistic locking legítimo si `version` se conserva.
  - No tocar Better Auth tables.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`fullstack-backend`, `bun-elysia`, `avileo`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: B1
  - **Blocks**: B3, B4, B5

  **References**:
  - `packages/backend/src/db/schema/index.ts` — schema exports
  - `packages/backend/src/db/schema/*.ts` — columns to clean
  - `packages/backend/src/services/repository/*.repository.ts` — persistence cleanup

  **Acceptance Criteria**:
  - [ ] No `syncStatus`/`syncAttempts` in backend active schema
  - [ ] Repositories no insert/update dropped fields
  - [ ] Backend TypeScript diagnostics clean for changed files

  **QA Scenarios**:
  ```
  Scenario: Backend active code no longer references removed sync columns
    Tool: Bash
    Steps:
      1. grep -R "syncStatus\|syncAttempts\|sync_status\|sync_attempts" packages/backend/src/db/schema packages/backend/src/services packages/backend/src/api packages/shared/src
    Expected Result: No matches in active code
    Evidence: .sisyphus/evidence/task-B2-sync-field-grep.txt
  ```

  **Commit**: YES
  - Message: `refactor(schema): remove sync-only fields from backend entities`

---

- [x] B3. **Backend API Contract Cleanup — responses sin campos sync**

  **What to do**:
  - Revisar API routes que retornan entidades con sync fields.
  - Remover `syncStatus`/`syncAttempts` de response DTOs.
  - Remover request body fields sync-only de POST/PATCH.
  - Revisar endpoints `/sync/*`: eliminar, desregistrar, o dejar fuera del frontend si aún existen por compatibilidad temporal.
  - Asegurar que Eden Treaty `App` no exponga sync fields para hooks nuevos.

  **Must NOT do**:
  - No usar frontend-side `Omit<>` como parche principal; el contrato debe estar limpio desde backend.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`bun-elysia`, `fullstack-backend`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (con B4 después de B2 si no toca mismas rutas)
  - **Blocked By**: B2
  - **Blocks**: B5 y Wave 1 frontend

  **References**:
  - `packages/backend/src/api/sales.ts` — sales route contract
  - `packages/backend/src/api/customers.ts` — customer contract
  - `packages/backend/src/api/public-sales.ts` — revisar uso de `version`
  - `packages/backend/src/app.ts` — mounted routes, revisar sync route

  **Acceptance Criteria**:
  - [ ] API responses principales no incluyen sync fields
  - [ ] Request schemas no aceptan sync-only fields
  - [ ] `version` solo existe si fue clasificado KEEP

  **QA Scenarios**:
  ```
  Scenario: API response limpia para ventas/clientes/productos
    Tool: Bash (curl)
    Steps:
      1. curl GET /sales con headers auth/business
      2. curl GET /customers con headers auth/business
      3. curl GET /products con headers auth/business
      4. Guardar JSON y buscar syncStatus/syncAttempts
    Expected Result: JSON no contiene syncStatus ni syncAttempts
    Evidence: .sisyphus/evidence/task-B3-api-clean-responses.json
  ```

  **Commit**: YES
  - Message: `refactor(api): remove sync fields from response contracts`

---

- [x] B4. **Database Migration — generar, revisar y aplicar**

  **What to do**:
  - Generar migración Drizzle:
    ```bash
    cd packages/backend && bun run db:generate
    ```
  - Revisar SQL generado: debe contener `DROP COLUMN` solo para campos clasificados DROP.
  - Aplicar migración en entorno local/dev:
    ```bash
    cd packages/backend && bun run db:migrate
    ```
  - Si se usa Neon/staging, documentar orden de despliegue: backend schema first, luego frontend.
  - Crear rollback documentado: re-add columns con defaults si la migración falla o revertir migration file antes de prod.

  **Must NOT do**:
  - No aplicar migración a producción sin revisar SQL.
  - No dropear `version` si B1 lo clasificó KEEP.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`fullstack-backend`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: B2, B3
  - **Blocks**: B5, frontend Wave 1

  **References**:
  - `packages/backend/package.json` — db scripts
  - `packages/backend/drizzle/` — migration output

  **Acceptance Criteria**:
  - [ ] Migration file generated and reviewed
  - [ ] Local/dev migration applied successfully
  - [ ] Backend tests pass against migrated DB
  - [ ] Rollback note included in commit/PR description

  **QA Scenarios**:
  ```
  Scenario: Migración elimina columnas sync-only
    Tool: Bash
    Steps:
      1. cd packages/backend && bun run db:generate
      2. Review generated SQL for expected DROP COLUMN list
      3. cd packages/backend && bun run db:migrate
      4. Run schema inspection or backend test suite
    Expected Result: Migration succeeds and no dropped columns are used by backend active code
    Evidence: .sisyphus/evidence/task-B4-migration-output.txt
  ```

  **Commit**: YES
  - Message: `chore(db): drop sync-only columns`

---

- [x] B5. **Backend/Shared Verification Gate — Eden Treaty types limpios**

  **What to do**:
  - Rebuild shared package if schema/types changed:
    ```bash
    cd packages/shared && bun run build
    ```
  - Run backend tests/build:
    ```bash
    cd packages/backend && bun test
    cd packages/backend && bun run build
    ```
  - Verify frontend can typecheck against clean `App` type without sync fields:
    ```bash
    cd packages/app && bun run typecheck
    ```
  - Only after this task passes may frontend Wave 1 begin.

  **Must NOT do**:
  - No proceed to frontend hooks if Eden Treaty responses still include `syncStatus`/`syncAttempts`.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`fullstack-backend`, `frontend`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: B4
  - **Blocks**: Tasks 1-34

  **Acceptance Criteria**:
  - [ ] `packages/shared` builds
  - [ ] `packages/backend` builds/tests
  - [ ] Eden Treaty `App` no requires/returns sync fields in active frontend contracts
  - [ ] Gate explicitly marked complete before frontend work

  **QA Scenarios**:
  ```
  Scenario: Full backend gate passes before frontend migration
    Tool: Bash
    Steps:
      1. cd packages/shared && bun run build
      2. cd packages/backend && bun test
      3. cd packages/backend && bun run build
      4. cd packages/app && bun run typecheck
    Expected Result: All commands pass; no sync field type errors
    Evidence: .sisyphus/evidence/task-B5-backend-gate.txt
  ```

  **Commit**: YES
  - Message: `chore(sync): verify clean backend API contracts`

---

- [x] 1. **API Helpers — `unwrapApiResponse` + `extractData` refactor**

  **What to do**:
  - Crear `packages/app/app/lib/api-utils.ts` con helper robusto para unwrap de respuestas Eden:
    ```typescript
    export async function unwrapApiResponse<T>(
      response: { data?: { success: boolean; data?: T; error?: string } | null; error?: { value: unknown } | null }
    ): Promise<T> {
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      if (!response.data?.success || !response.data.data) {
        throw new Error(response.data?.error || "Request failed");
      }
      return response.data.data;
    }
    ```
  - Revisar si `extractData` en `api-client.ts` ya hace esto (sí, líneas 28-43). Si es suficiente, usarlo. Si no, extenderlo.
  - Considerar crear `api.sales.get(...).then(extractData)` como patrón estándar.

  **Must NOT do**:
  - No duplicar `extractData` si ya existe en `api-client.ts`
  - No usar raw `fetch`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1 (foundation)
  - **Blocks**: Todos los hooks que usan API

  **References**:
  - `packages/app/app/lib/api-client.ts:28-43` — `extractData` existente

  **Acceptance Criteria**:
  - [ ] Helper exportado y usable
  - [ ] No hay duplicación con `extractData`

  **QA Scenarios**:
  ```
  Scenario: Helper funciona correctamente
    Tool: Bash (node REPL)
    Steps:
      1. Importar helper en un script temporal
      2. Probar con respuesta de éxito → devuelve data
      3. Probar con respuesta de error → lanza Error con mensaje correcto
    Expected Result: Ambos casos funcionan
  ```

  **Commit**: YES
  - Message: `feat(app): add API response helper utilities`

---

- [x] 2. **Query Key Factory**

  **What to do**:
  - Crear `packages/app/app/lib/query-keys.ts` con factory functions:
    ```typescript
    export const queryKeys = {
      sales: {
        all: ["sales"] as const,
        lists: (filters: Record<string, unknown>) => ["sales", "list", filters] as const,
        detail: (id: string) => ["sales", id] as const,
        byCustomer: (customerId: string) => ["sales", "customer", customerId] as const,
        byStatus: (status: string) => ["sales", "status", status] as const,
      },
      customers: {
        all: ["customers"] as const,
        detail: (id: string) => ["customers", id] as const,
      },
      products: {
        all: ["products"] as const,
        detail: (id: string) => ["products", id] as const,
      },
      dashboard: {
        stats: (period: PeriodParams) => ["dashboard", "stats", period] as const,
        debtors: ["dashboard", "debtors"] as const,
        chart: (period: PeriodParams) => ["dashboard", "chart", period] as const,
      },
    };
    ```

  **Must NOT do**:
  - No usar strings sueltos en hooks (siempre la factory)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1
  - **Blocks**: Todos los hooks con invalidateQueries

  **Commit**: YES

---

- [x] 3. **Revisar `api-client.ts` tipos**

  **What to do**:
  - Verificar que `treaty<App>` de `@avileo/backend` esté al día
  - Si el backend agregó endpoints nuevos (del plan backend), verificar que el tipo `App` los incluya
  - Asegurar que `credentials: "omit"` siga siendo correcto (Better Auth usa Bearer token)

  **Must NOT do**:
  - No modificar la configuración de auth (headers, tokens) a menos que sea necesario

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1

  **References**:
  - `packages/app/app/lib/api-client.ts`
  - `packages/backend/src/index.ts` — export de `App`

  **Commit**: NO (parte del commit de helpers)

---

- [x] 4. **Hook: `use-customers.ts`**

  **What to do**:
  - Reescribir para usar `api.customers.*` en lugar de `useEngineService`
  - `useCustomers()` → `api.customers.get()`
  - `useCustomer(id)` → `api.customers({ id }).get()`
  - `useCreateCustomer()` → `api.customers.post()` + invalidateQueries
  - `useUpdateCustomer()` → `api.customers({ id }).patch.patch()` + invalidateQueries
  - `useDeleteCustomer()` → `api.customers({ id }).delete.delete()` + invalidateQueries
  - Eliminar cualquier referencia a `syncStatus`, `version`, `syncAttempts`

  **Must NOT do**:
  - No mantener lógica de sync (queueSync, updateSyncStatus)
  - No usar `useEngineService`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2
  - **Blocked By**: Task 1, 2

  **References**:
  - `packages/app/app/hooks/use-customers.ts` (actual)
  - `packages/backend/src/api/customers.ts` — endpoints
  - `packages/app/app/lib/api-client.ts` — `api` instance

  **Acceptance Criteria**:
  - [ ] Hook usa `api.customers.*` directamente
  - [ ] No importa `useEngineService`
  - [ ] No usa `syncStatus` en tipos
  - [ ] Tests reescritos (si existen)

  **QA Scenarios**:
  ```
  Scenario: Listar clientes
    Tool: Playwright / curl
    Steps:
      1. Login
      2. Navegar a /clientes
      3. Verificar que lista carga sin errores
    Expected Result: Lista de clientes visible, sin badges de sync
  ```

  **Commit**: YES
  - Message: `feat(app): migrate customer hooks to Eden Treaty`

---

- [x] 5. **Hook: `use-products.ts`**

  **What to do**:
  - Mismo patrón que customers: `api.products.*`
  - `useProducts()` → `api.products.get()`
  - `useProduct(id)` → `api.products({ id }).get()`
  - `useCreateProduct()` → `api.products.post()`
  - `useUpdateProduct()` → `api.products({ id }).patch.patch()`
  - Variantes: `useProductVariants(productId)` → endpoint correspondiente

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2
  - **Blocked By**: Task 1, 2

  **Commit**: YES

---

- [x] 6. **Hook: `use-tags.ts`**

  **What to do**:
  - `api.tags.*`
  - Tags y customer_tags

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2

  **Commit**: YES

---

- [x] 7. **Hook: `use-suppliers.ts`**

  **What to do**:
  - `api.suppliers.*`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2

  **Commit**: YES

---

- [x] 8. **Hook: `use-visitas.ts`**

  **What to do**:
  - `api.visitas.*`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2

  **Commit**: YES

---

- [x] 9. **Hook: `use-sales.ts` — REWRITE COMPLETO**

  **What to do**:
  - Este es el hook más grande. Reescribir completamente:
    ```typescript
    export function useSales(filters?: SaleFilters) {
      return useQuery({
        queryKey: queryKeys.sales.lists(filters ?? {}),
        queryFn: async () => {
          const { data, error } = await api.sales.get({
            query: { limit: 50, offset: 0, ...filters }
          });
          return extractData(data);
        },
      });
    }

    export function useSale(id: string | null) {
      return useQuery({
        queryKey: id ? queryKeys.sales.detail(id) : ["sales", "detail"],
        queryFn: async () => {
          if (!id) return null;
          const { data, error } = await api.sales({ id }).get();
          return extractData(data);
        },
        enabled: !!id,
      });
    }

    export function usePaginatedSales(query: SalePageQuery) {
      return useQuery({
        queryKey: queryKeys.sales.lists(query),
        queryFn: async () => {
          const { data, error } = await api.sales.get({ query });
          return extractData(data); // { items, total }
        },
        placeholderData: keepPreviousData,
      });
    }

    export function useCreateSale() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: async ({ sale, items }) => {
          const { data, error } = await api.sales.post({ ...sale, items });
          return extractData(data);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
        },
      });
    }

    export function useConfirmSale() {
      return useMutation({
        mutationFn: async (id: string) => {
          const { data, error } = await api.sales({ id }).confirm.post();
          return extractData(data);
        },
      });
    }

    export function useConfirmPreOrder() {
      return useMutation({
        mutationFn: async ({ id, baseVersion }) => {
          const { data, error } = await api.sales({ id }).confirm.post({ body: { baseVersion } });
          return extractData(data);
        },
      });
    }

    export function useDeliverSale() {
      return useMutation({
        mutationFn: async ({ id, baseVersion }) => {
          const { data, error } = await api.sales({ id }).deliver.post({ body: { baseVersion } });
          return extractData(data);
        },
      });
    }

    export function useCancelSale() {
      return useMutation({
        mutationFn: async ({ id, reason, refundAmount, refundMethod }) => {
          const { data, error } = await api.sales({ id }).cancel.post({
            body: { reason, refundAmount, refundMethod }
          });
          return extractData(data);
        },
      });
    }

    export function useDeleteSale() {
      return useMutation({
        mutationFn: async ({ id }) => {
          await api.sales({ id }).delete.delete();
        },
      });
    }

    export function useUpdateSale() {
      return useMutation({
        mutationFn: async ({ id, input }) => {
          const { data, error } = await api.sales({ id }).patch.patch({ body: input });
          return extractData(data);
        },
      });
    }

    export function useCreateDraftSale() {
      return useMutation({
        mutationFn: async (options) => {
          const { data, error } = await api.sales.draft.post({ body: options });
          return extractData(data);
        },
      });
    }

    export function useSalesByCustomer(customerId: string) {
      return useQuery({
        queryKey: queryKeys.sales.byCustomer(customerId),
        queryFn: async () => {
          const { data, error } = await api.sales.get({
            query: { customerId, limit: 50, offset: 0 }
          });
          return extractData(data);
        },
        enabled: !!customerId,
      });
    }

    export function useSalesByStatus(status: SaleStatus) {
      return useQuery({
        queryKey: queryKeys.sales.byStatus(status),
        queryFn: async () => {
          const { data, error } = await api.sales.get({
            query: { status, limit: 50, offset: 0 }
          });
          return extractData(data);
        },
      });
    }
    ```
  - Eliminar `useSaleSyncStatus` — ya no existe syncStatus
  - Los mutations deben hacer `invalidateQueries` apropiado en `onSuccess`

  **Must NOT do**:
  - No usar `useEngineService`
  - No referenciar `syncStatus`, `syncAttempts`, `version` en interfaces
  - No mantener lógica de batch/local transactions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend`]

  **Parallelization**:
  - **Can Run In Parallel**: NO — es muy grande, mejor secuencial dentro de Wave 3
  - **Blocked By**: Task 1, 2
  - **Blocks**: Tasks 10-13 (consolidación de use-sales-db)

  **References**:
  - `packages/app/app/hooks/use-sales.ts` (actual, 429 líneas)
  - `packages/backend/src/api/sales.ts` — endpoints existentes
  - `packages/backend/src/services/business/sale.service.ts` — métodos backend

  **Acceptance Criteria**:
  - [ ] Todos los exports del hook original están presentes
  - [ ] Ninguno usa `useEngineService`
  - [ ] `useSaleSyncStatus` eliminado
  - [ ] `extractData` usado para todas las llamadas a API

  **QA Scenarios**:
  ```
  Scenario: Crear venta completa
    Tool: Playwright
    Steps:
      1. Login → /ventas
      2. Click "Nueva venta"
      3. Seleccionar cliente
      4. Agregar producto
      5. Click "Confirmar"
    Expected Result: Venta creada, redirigido a detalle, status=active
    Evidence: .sisyphus/evidence/task-9-create-sale.png

  Scenario: Cancelar venta
    Tool: Playwright
    Steps:
      1. Abrir venta activa
      2. Click "Cancelar"
      3. Ingresar motivo
      4. Confirmar
    Expected Result: Status cambia a cancelled, sin errores
  ```

  **Commit**: YES
  - Message: `feat(app): rewrite sales hooks to use Eden Treaty API`

---

- [x] 10. **Eliminar `use-sales-db.ts` + consolidar**

  **What to do**:
  - `use-sales-db.ts` era un wrapper sobre `use-sales.ts` con lógica adicional
  - Todo su contenido debe moverse a `use-sales.ts` o eliminarse si ya no es necesario:
    - `useSaleItems(saleId)` → reemplazar por `useSale(saleId)` y leer `.items`
    - `useCreateSale()` extendido → simplificar, el backend maneja nombres de productos
    - `useFinalizeSale()` → `api.sales({ id }).finalizeDelivery.post()`
    - `useAddSaleItem()` → `api.sales({ id }).items.post()`
    - `useRemoveSaleItem()` → `api.sales({ id }).items({ itemId }).delete.delete()`
    - `useUpdateSaleItem()` → `api.sales({ id }).items({ itemId }).patch.patch()`
  - Eliminar archivo `use-sales-db.ts`

  **Must NOT do**:
  - No mantener doble capa de hooks

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO — secuencial después de Task 9
  - **Blocked By**: Task 9

  **Commit**: YES
  - Message: `feat(app): consolidate sales hooks, remove use-sales-db`

---

- [x] 11. **Hook: `use-payments.ts`**

  **What to do**:
  - Reescribir para usar `api.payments.*`
  - `usePayments()` → `api.payments.get()`
  - `useCreatePayment()` → `api.payments.post()`
  - Eliminar lógica de sync local

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3
  - **Blocked By**: Task 1, 2

  **Commit**: YES

---

- [x] 12. **Hook: `use-distribuciones.ts`**

  **What to do**:
  - Reescribir para usar `api.distribuciones.*`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3

  **Commit**: YES

---

- [x] 13. **Hook: `use-inventory.ts`**

  **What to do**:
  - `InventoryService` es LOCAL-ONLY en el frontend (no existe en backend sync)
  - Verificar si backend tiene endpoint de inventory
  - Si NO hay endpoint: **decisión necesaria** — ¿crear endpoint backend o eliminar feature?
  - Si SÍ hay endpoint: reescribir hook

  **Must NOT do**:
  - No asumir que hay endpoint sin verificar

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3

  **Commit**: Condicional

---

- [x] 14. **Hook: `use-dashboard.ts`**

  **What to do**:
  - Eliminar fallback a local PGlite
  - Quitar `useEngineService<SaleService>("sales")`
  - Usar directamente `api.reports.*`:
    ```typescript
    export function useSalesStats(period: PeriodParams) {
      return useQuery({
        queryKey: queryKeys.dashboard.stats(period),
        queryFn: async () => {
          const { data, error } = await api.reports["sales-stats"].get({ query: { type: period.type } });
          return extractData(data);
        },
      });
    }
    ```
  - `useDebtorsSummary()` → `api.reports["debtors-summary"].get()`
  - `useSalesChart()` → `api.reports["sales-chart"].get()`

  **Must NOT do**:
  - No mantener lógica de fallback offline

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 4
  - **Blocked By**: Task 1, 2

  **References**:
  - `packages/app/app/hooks/use-dashboard.ts` (actual, 163 líneas)
  - `packages/app/app/lib/services/sale-service.ts:1360-1467` — métodos que reemplaza

  **Commit**: YES

---

- [x] 15. **Hook: `use-sale-analysis.ts`**

  **What to do**:
  - Eliminar fallback offline
  - Eliminar `useSales()` (ya no necesita buscar localmente)
  - Usar `api.reports["sale/:id/analysis"].get()` directamente
  - Eliminar `useSync()` (no hay sync status que verificar)
  - Simplificar a:
    ```typescript
    export function useSaleAnalysis(saleId: string | null) {
      return useQuery({
        queryKey: ["sale-analysis", saleId],
        queryFn: async () => {
          if (!saleId) return null;
          const { data, error } = await api.reports["sale-analysis"]({ id: saleId }).get();
          return extractData(data);
        },
        enabled: !!saleId,
      });
    }
    ```

  **Must NOT do**:
  - No verificar `syncStatus === "synced"` antes de llamar API

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 4

  **Commit**: YES

---

- [x] 16. **Layout: `_protected.tsx` — eliminar engine y sync**

  **What to do**:
  - Eliminar TODO el código relacionado con sync engine:
    - `FrameworkSyncProvider` → eliminar import y uso
    - `SyncDevToolsProvider` → eliminar import y uso
    - `createSyncReactRuntime` → eliminar import
    - `useSyncInit` → eliminar import
    - `createAvileoSyncEngine` → eliminar import
    - `ServicesProviderWrapper` con `useState<LocalEngineState>` → eliminar componente completo
    - `useEffect` que crea engine → eliminar
    - `ConflictResolver` → eliminar import y render
    - `initDevTools`, `addServiceDebugHelpers` → eliminar
    - Estados de loading de engine: "Inicializando base de datos local...", `hasInitTimeout`, `schemaError` → eliminar
    - Barra de modo offline: `isOfflineMode` → simplificar a detección básica sin sync
  - El `_protected.tsx` nuevo debe ser:
    ```typescript
    export default function ProtectedLayout() {
      const { user, isLoading } = useAuth();
      const location = useLocation();
      const { data: business } = useBusiness();

      // Auth check
      const hasToken = !!getStoredAuthToken();
      if (!hasToken) return <Navigate to="/login" replace />;
      if (isLoading || !user) return <LoadingSpinner />;

      // Business check
      const businessId = getStoredBusinessId() || "";
      if (!businessId && location.pathname !== "/business/create") {
        return <Navigate to="/business/create" replace />;
      }

      return (
        <AppLayout>
          <Outlet />
        </AppLayout>
      );
    }
    ```

  **Must NOT do**:
  - No mantener ningún estado relacionado a engine initialization
  - No mantener `ConflictResolver`
  - No mantener `SyncDevToolsProvider`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend`]

  **Parallelization**:
  - **Can Run In Parallel**: NO — Wave 5
  - **Blocked By**: Tasks 4-15 (todos los hooks deben estar migrados)
  - **Blocks**: Tasks 18-21 (componentes sync)

  **References**:
  - `packages/app/app/routes/_protected.tsx` (actual, 555 líneas)

  **Acceptance Criteria**:
  - [ ] `_protected.tsx` tiene < 100 líneas
  - [ ] No importa nada de `@avileo/drizzle-sync`
  - [ ] No renderiza pantallas de "Inicializando base de datos local"
  - [ ] App carga inmediatamente después de auth (sin delay de engine)

  **QA Scenarios**:
  ```
  Scenario: Login y carga rápida
    Tool: Playwright
    Steps:
      1. Ir a /login
      2. Ingresar credenciales
      3. Click "Ingresar"
    Expected Result: Redirigido a /dashboard en < 2 segundos, sin pantalla de "Inicializando base de datos"
    Evidence: .sisyphus/evidence/task-16-login-speed.png
  ```

  **Commit**: YES
  - Message: `feat(app): remove sync engine from protected layout`

---

- [x] 17. **`root.tsx` — limpiar supresión de errores PGlite**

  **What to do**:
  - Buscar en `root.tsx` código que suprime errores específicos de PGlite (duplicate key, etc.)
  - Eliminar ese código

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 5

  **Commit**: YES

---

- [x] 18. **Eliminar componentes `components/sync/*`**

  **What to do**:
  - Eliminar directorio completo `packages/app/app/components/sync/`
  - Archivos típicos:
    - `conflict-resolver.tsx`
    - `sync-status.tsx`
    - `background-sync-badge.tsx`
    - `sync-indicator.tsx`
  - Buscar imports de estos componentes en rutas y eliminarlos

  **Must NOT do**:
  - No mantener badges de sync status en UI

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 6
  - **Blocked By**: Task 16 (layout ya no los usa)

  **Commit**: YES
  - Message: `feat(app): remove sync UI components`

---

- [x] 19. **Eliminar referencias sync en `app-layout.tsx`**

  **What to do**:
  - Revisar `components/layout/app-layout.tsx` por referencias a `SyncDevTools`
  - Eliminarlas

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 6

  **Commit**: NO (grupo con Task 18)

---

- [x] 20. **Eliminar `lib/debug/console/service-helpers.ts`**

  **What to do**:
  - Este archivo expone services al `window` para debugging
  - Ya no hay services locales, eliminar

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 6

  **Commit**: YES

---

- [x] 21. **Eliminar `lib/debug/` completo**

  **What to do**:
  - Si `lib/debug/` solo contenía helpers para sync/PGlite, eliminar directorio completo
  - Si tiene otra utilidad, conservar solo lo no relacionado a sync

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 6

  **Commit**: YES

---

- [x] 22. **Eliminar `lib/services/*` — TODOS los services**

  **What to do**:
  - Eliminar TODOS los archivos en `packages/app/app/lib/services/`:
    - `base-service.ts` (298 líneas)
    - `sale-service.ts` (1468 líneas)
    - `customer-service.ts`
    - `product-service.ts`
    - `distribucion-service.ts`
    - `payment-service.ts`
    - `purchase-service.ts`
    - `inventory-service.ts`
    - `supplier-service.ts`
    - `visita-service.ts`
    - `tag-service.ts`
    - `customer-tag-service.ts`
    - `customer-group-service.ts`
    - `sale-service.test.ts`
    - `distribucion-service.test.ts`
    - `visita-service.test.ts`
  - Verificar que ningún archivo en el proyecto hace import de estos services
  - Si hay imports residuales (ej. tipos), mover los tipos necesarios a un archivo de tipos puros

  **Must NOT do**:
  - No eliminar si algún hook aún los importa (deben estar todos migrados)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO — Wave 7
  - **Blocked By**: Tasks 4-15 (todos los hooks migrados)

  **Acceptance Criteria**:
  - [ ] Directorio `lib/services/` no existe o está vacío
  - [ ] Ningún import falla

  **QA Scenarios**:
  ```
  Scenario: Build sin services
    Tool: Bash
    Steps:
      1. cd packages/app && bun run build
    Expected Result: Exit code 0
  ```

  **Commit**: YES
  - Message: `feat(app): delete all local services`

---

- [x] 23. **Eliminar `lib/sync/generated/*`**

  **What to do**:
  - Eliminar TODO el directorio `packages/app/app/lib/sync/generated/`
  - Contiene código generado por drizzle-sync que ya no se usa

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 7

  **Commit**: YES

---

- [x] 24. **Eliminar `lib/sync/service-overrides.ts`**

  **What to do**:
  - Eliminar archivo

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 7

  **Commit**: NO (grupo con Task 23)

---

- [x] 25. **Eliminar archivos sync residuales**

  **What to do**:
  - `lib/sync/types.ts` → eliminar
  - `lib/sync/schema-error.ts` → eliminar
  - `lib/sync/index.ts` → eliminar o dejar vacío
  - Directorio `lib/sync/` → eliminar si queda vacío

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 7

  **Commit**: YES

---

- [x] 26. **Eliminar `hooks/use-manual-sync.ts`**

  **What to do**:
  - Eliminar hook que permite push manual de sync
  - Buscar imports en rutas/componentes y eliminar

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 7

  **Commit**: YES

---

- [x] 27. **Eliminar `hooks/use-clear-sync-storage.ts`**

  **What to do**:
  - Eliminar hook que limpia storage de sync
  - Buscar imports y eliminar

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 7

  **Commit**: NO (grupo con Task 26)

---

- [x] 28. **Eliminar/simplificar `hooks/use-offline-aware-mutation.ts`**

  **What to do**:
  - Este hook envuelve mutations para detectar offline
  - Simplificar a solo detectar `navigator.onLine` y mostrar mensaje
  - O eliminar si cada componente maneja su propio estado offline

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 7

  **Commit**: YES

---

- [x] 29. **`package.json` — eliminar dependencias sync/PGlite**

  **What to do**:
  - Eliminar de `dependencies`:
    - `@avileo/drizzle-sync`
    - `@electric-sql/pglite`
  - Revisar si `drizzle-orm` sigue siendo necesario en frontend (probablemente NO si solo era para PGlite)
  - Ejecutar `bun install` para actualizar lockfile

  **Must NOT do**:
  - No eliminar `@elysiajs/eden` (se usa más que nunca)
  - No eliminar `@tanstack/react-query` (sigue siendo la capa de cache)

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO — Wave 8
  - **Blocked By**: Tasks 22-28 (todo el código que importaba estas deps ya fue eliminado)

  **Commit**: YES
  - Message: `chore(app): remove drizzle-sync and pglite dependencies`

---

- [x] 30. **`vite.config.ts` — limpiar config PGlite**

  **What to do**:
  - Buscar en `vite.config.ts` configuración relacionada a:
    - WASM workers
    - PGlite workers
    - Optimización de chunks para pglite
  - Eliminar esa configuración

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 8

  **Commit**: YES

---

- [x] 31. **`tsconfig.json` — revisar paths**

  **What to do**:
  - Revisar si hay paths que apuntan a `lib/sync/` o similar
  - Limpiar si es necesario

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 8

  **Commit**: NO (grupo con Task 30)

---

- [x] 32. **Reescribir `hooks/use-sales.test.tsx`**

  **What to do**:
  - El test actual mockea `@avileo/drizzle-sync/react`
  - Reescribir para mockear `api` o usar MSW
  - Test básico: `useCreateDraftSale` llama `api.sales.draft.post`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`elena-testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 9
  - **Blocked By**: Task 9 (hook reescrito)

  **Commit**: YES

---

- [x] 33. **Reescribir `hooks/use-sales-db.test.tsx`**

  **What to do**:
  - Este test se elimina junto con `use-sales-db.ts`
  - O si hay lógica valiosa, migrarla a `use-sales.test.tsx`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 9

  **Commit**: YES

---

- [x] 34. **Reescribir tests de otros hooks afectados**

  **What to do**:
  - Identificar todos los tests que mockean `@avileo/drizzle-sync`
  - Reescribirlos para mockear `api` o usar MSW
  - Hooks a revisar: use-customers, use-products, use-payments, etc.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 9

  **Commit**: YES

---

## Final Verification Wave

- [x] F1. **Import Check** — `quick`
  ```bash
  grep -R "syncStatus\|syncAttempts\|sync_status\|sync_attempts" packages/backend/src packages/shared/src
  grep -R "@avileo/drizzle-sync\|@electric-sql/pglite\|useEngineService\|useSyncEngine\|SyncClientEngineLike\|extends BaseService" packages/app/app
  ```
  Expected: zero matches in active code.

- [x] F2. **Build Check** — `quick`
  ```bash
  cd packages/shared && bun run build
  cd packages/backend && bun run build
  cd packages/app && bun run build
  ```
  Expected: exit code 0.

- [x] F3. **Test Check** — `quick`
  ```bash
  cd packages/backend && bun test
  cd packages/app && bun test
  ```
  Expected: all tests pass.

- [x] F3b. **Migration Check** — `unspecified-high`
  ```bash
  cd packages/backend && bun run db:generate
  cd packages/backend && bun run db:migrate
  ```
  Expected: migration generated/reviewed/applied; dropped columns match B1 DROP list.

- [x] F4. **Smoke Test** — `unspecified-high` (+ `playwright` skill)
  Login → Dashboard → Navegar a Ventas → Crear venta → Agregar item → Confirmar → Ver detalle.
  Evidence: screenshots en `.sisyphus/evidence/`

---

## Commit Strategy

Cada wave es un commit (o varios commits dentro de la wave):

```
feat(app): add API helpers and query key factory
feat(app): migrate customer hooks to Eden Treaty
feat(app): migrate product hooks to Eden Treaty
feat(app): migrate sales hooks to Eden Treaty
feat(app): remove sync engine and providers from layout
feat(app): delete local services and sync generated code
feat(app): clean PGlite dependencies and build config
feat(app): rewrite tests for online-first hooks
```

---

## Success Criteria

### Verification Commands
```bash
# Zero sync imports
grep -R "@avileo/drizzle-sync\|@electric-sql/pglite\|useEngineService" packages/app/app

# Build success
cd packages/app && bun run build

# Tests pass
cd packages/app && bun test

# Type check
cd packages/app && bun run typecheck
```

### Final Checklist
- [x] Ningún import de `@avileo/drizzle-sync` en `packages/app/`
- [x] Ningún import de `@electric-sql/pglite` en `packages/app/`
- [x] `useEngineService` no existe en ningún archivo
- [x] `_protected.tsx` no inicializa engine ni sync
- [x] Todos los hooks usan `api` desde `~/lib/api-client`
- [x] `bun run build` pasa sin errores
- [x] `bun test` pasa sin fallas
- [x] Smoke test de Playwright: flujo completo de venta funciona
- [x] Bundle size reducido (sin WASM de PGlite)

---

*Plan generado para migración frontend: offline-first → online-first. Eliminar engine, usar Eden Treaty directamente.*
