# Plan de Implementacion Ajustado: Sync Engine Offline-First

> **Objetivo**: Implementar sincronizacion incremental y segura, alineada al codigo actual de Avileo (Electric + TanStack + Better Auth + RequestContext), sin romper contratos existentes.

**Fecha**: Febrero 2026  
**Estado**: Ajustado y listo para implementacion  
**Duracion estimada**: 4-6 dias

---

## 1. Decisiones de Arquitectura (Ajustadas)

### 1.1 Principios obligatorios

1. **No reemplazar de golpe la base actual**
   - Mantener `ElectricProvider` y `SyncProvider` en `packages/app/app/routes/_protected.tsx`.
   - Evolucion incremental sobre la arquitectura existente.

2. **Multi-tenant por contexto, no por query param**
   - `businessId` se obtiene desde `RequestContext` en backend.
   - No confiar en `businessId` enviado por cliente en endpoints de sync.

3. **Contrato tipado y idempotente**
   - Cada operacion de sync debe tener `operationId` unico.
   - Reintentos no deben duplicar efectos.

4. **Alineacion total con schema real**
   - Usar nombres/campos reales de tablas Drizzle actuales.
   - No introducir columnas inexistentes (`version`, `deleted`) en fase inicial.

---

## 2. Estado Actual del Proyecto (Fuente de Verdad)

### Backend

- `sync_status` existe como enum global en `packages/backend/src/db/schema/enums.ts`.
- Tablas con `sync_status` y/o `sync_attempts` ya presentes:
  - `customers` (`packages/backend/src/db/schema/customers.ts`)
  - `sales`, `sale_items` (`packages/backend/src/db/schema/sales.ts`)
  - `abonos` (`packages/backend/src/db/schema/payments.ts`)
  - `distribuciones` (`packages/backend/src/db/schema/inventory.ts`)
  - `closings` (`packages/backend/src/db/schema/closings.ts`)
- Patron de auth/context actual:
  - `contextPlugin` en `packages/backend/src/plugins/context.ts`
  - `RequestContext` en `packages/backend/src/context/request-context.ts`
  - Servicios inyectados via `servicesPlugin` en `packages/backend/src/plugins/services.ts`

### Frontend

- `SyncProvider` y `SyncStatus` existen en `packages/app/app/components/sync/sync-status.tsx`.
- `ElectricProvider` existe en `packages/app/app/lib/db/electric-client.tsx` (actualmente placeholder).
- Hooks de negocio usan API actual (`customers`, `sales`, `payments`, etc.).

---

## 3. Arquitectura Objetivo (Incremental)

```
UI (React Router)
  -> Hooks / Mutations existentes
  -> Cola local de operaciones (IndexedDB)
  -> Sync client (batch push + pull incremental)

API Elysia
  -> contextPlugin (session Better Auth -> RequestContext)
  -> sync routes (/sync/batch, /sync/changes)
  -> SyncService (valida, aplica, idempotencia)

PostgreSQL
  -> tablas operativas existentes
  -> tabla nueva sync_operations (log + idempotencia)
```

### Nota de compatibilidad

- Este plan **no elimina** Electric/TanStack.
- Agrega una capa de sincronizacion robusta para operaciones offline y reconciliacion, compatible con flujo actual.

---

## 4. Contrato de Sync (v1)

### 4.1 Operacion de cliente

```ts
type SyncEntity = "customers" | "sales" | "sale_items" | "abonos" | "distribuciones";
type SyncAction = "insert" | "update" | "delete";

interface SyncOperationInput {
  operationId: string;      // UUID generado en cliente
  entity: SyncEntity;
  action: SyncAction;
  entityId: string;
  payload: Record<string, unknown>;
  clientTimestamp: string;  // ISO
}
```

### 4.2 Respuesta por operacion

```ts
interface SyncOperationResult {
  operationId: string;
  success: boolean;
  error?: string;
  serverTimestamp: string;
}
```

### 4.3 Reglas de idempotencia

- Si `operationId` ya fue procesado para el mismo tenant, retornar `success: true` sin reaplicar efecto.
- Todos los writes se validan con `ctx.businessId`.

---

## 5. Diseño de Backend (Ajustado)

### 5.1 Archivos a crear

#### `packages/backend/src/db/schema/sync-operations.ts`

Tabla `sync_operations` para log/idempotencia.

Columnas minimas:
- `id` (uuid, PK)
- `business_id` (uuid, index)
- `operation_id` (text, unique compuesto por negocio)
- `entity` (text)
- `action` (text)
- `entity_id` (uuid/text)
- `payload` (jsonb)
- `status` (`pending` | `processed` | `failed`)
- `error` (text nullable)
- `client_timestamp` (timestamp)
- `processed_at` (timestamp nullable)
- `created_at` (timestamp default now)

#### `packages/backend/src/services/sync/sync.service.ts`

Responsabilidades:
- Validar lote.
- Aplicar operaciones en transaccion por item.
- Garantizar idempotencia por `operationId` + `businessId`.
- Mapear entidades a servicios/repositorios existentes.

#### `packages/backend/src/api/sync.ts`

Endpoints:
- `POST /sync/batch`
- `GET /sync/changes?since=<ISO>`

Patron obligatorio:
- `.use(contextPlugin)`
- `.use(servicesPlugin)`
- `ctx as RequestContext` en handlers

### 5.2 Archivos a modificar

- `packages/backend/src/db/schema/index.ts`
  - Exportar `syncOperations`.
- `packages/backend/src/plugins/services.ts`
  - Inyectar `syncService`.
- `packages/backend/src/index.ts`
  - Registrar `syncRoutes`.

### 5.3 Seguridad y tenancy

- Ignorar `businessId` en body/query de cliente para writes.
- Usar siempre `ctx.businessId`.
- Validar pertenencia de `entityId` al tenant en updates/deletes.

---

## 6. Diseño de Frontend (Ajustado)

### 6.1 Archivos a crear

#### `packages/app/app/lib/sync/queue.ts`

Cola persistente en IndexedDB:
- `enqueue(operation)`
- `listPending(limit)`
- `markProcessed(operationId)`
- `markFailed(operationId, error)`
- `retryCount` por item

#### `packages/app/app/lib/sync/client.ts`

Cliente de sincronizacion:
- `pushBatch()` -> `POST /sync/batch`
- `pullChanges(since)` -> `GET /sync/changes`
- backoff exponencial con jitter
- lock para evitar ejecuciones concurrentes

#### `packages/app/app/hooks/use-sync-engine.ts`

Hook para orquestacion:
- inicia loop cada 30s
- reintento al evento `online`
- expone estado (`idle`, `syncing`, `error`, `offline`)

### 6.2 Archivos a modificar

- `packages/app/app/lib/db/electric-client.tsx`
  - Mantener provider, pero conectar estado real de sync (`isSyncing`, `isConnected`).
- `packages/app/app/components/sync/sync-status.tsx`
  - Conectar `pendingCount` y `lastSyncAt` reales.
- Hooks de mutacion (`use-customers.ts`, `use-sales.ts`, `use-payments.ts`)
  - Enqueue de operacion local al crear/editar/eliminar offline.
  - Mantener UX actual (optimistic).

---

## 7. Mapeo de Entidades y Nombres

### 7.1 Reglas de naming

- Frontend puede exponer `payments` por UX/API.
- Capa sync debe mapear a tabla backend real `abonos`.

Tabla de mapeo inicial:

| Dominio UI/API | Tabla DB | Archivo schema backend |
|---|---|---|
| customers | customers | `db/schema/customers.ts` |
| sales | sales | `db/schema/sales.ts` |
| sale_items | sale_items | `db/schema/sales.ts` |
| payments | abonos | `db/schema/payments.ts` |
| distribuciones | distribuciones | `db/schema/inventory.ts` |

---

## 8. Estrategia de Conflictos (v1)

### 8.1 Regla base

- **Last write wins por `updated_at`/`created_at` + server timestamp**, con prioridad de servidor ante ambiguedad.

### 8.2 Casos

1. **Insert duplicado** (`entityId` ya existe):
   - tratar como idempotente si payload equivalente;
   - si difiere, devolver error de conflicto.

2. **Update sobre registro inexistente**:
   - devolver `success: false` con `error = NOT_FOUND`.

3. **Delete repetido**:
   - idempotente (`success: true`).

### 8.3 Alcance v1

- Sin UI avanzada de merge manual.
- Registrar conflictos en `sync_operations` para soporte/observabilidad.

---

## 9. Plan de Implementacion por Fases

### Fase 1 (Dia 1): Backend base de sync

- Crear schema `sync_operations` y migracion.
- Crear `sync.service.ts` con idempotencia.
- Exponer `POST /sync/batch` (sin pull aun).
- Registrar rutas y servicios.

**Criterio de salida**:
- Batch procesa operaciones con `ctx.businessId`.
- Reintento del mismo `operationId` no duplica write.

### Fase 2 (Dia 2): Frontend cola local + push

- Implementar `queue.ts` (IndexedDB).
- Integrar enqueue en mutaciones claves (customers/sales/payments).
- Implementar `client.ts` con `pushBatch`.

**Criterio de salida**:
- Crear datos offline deja operaciones pendientes persistidas.
- Al volver online, batch se procesa y limpia cola.

### Fase 3 (Dia 3): Pull incremental + estado UI

- Implementar `GET /sync/changes` backend.
- Guardar `lastSyncAt` local.
- Conectar `SyncStatus` a estado real.

**Criterio de salida**:
- Pull trae cambios desde servidor por `since`.
- UI muestra `synced/pending/offline/error` reales.

### Fase 4 (Dia 4): Hardening

- Backoff exponencial con jitter.
- Limite de batch y retries por operacion.
- Manejo de errores parciales por item.
- Telemetria basica de sync (conteos y ultimo error).

**Criterio de salida**:
- Soporta reconexion intermitente sin duplicaciones.

### Fase 5 (Dia 5-6): QA y estabilizacion

- Escenarios offline/online reales.
- Validacion multi-tenant y seguridad.
- Pruebas de regresion sobre rutas existentes.

---

## 10. Testing (Manual + Tecnico)

### 10.1 Manual

1. Crear cliente/venta/abono offline.
2. Cerrar y abrir app: confirmar que cola persiste.
3. Reconectar internet: confirmar push exitoso.
4. Verificar en DB que no hay duplicados por reintentos.
5. Simular conflicto basico de update concurrente.

### 10.2 Tecnico

- Backend:
  - tests de idempotencia (`operationId` repetido).
  - tests de tenancy (`ctx.businessId` obligatorio).
  - tests de errores parciales en batch.
- Frontend:
  - tests de queue persistente.
  - tests de retry/backoff.
  - tests de transicion de estados de `SyncStatus`.

---

## 11. Checklist de Implementacion (Ajustado)

### Backend

- [ ] Crear `db/schema/sync-operations.ts`
- [ ] Crear migracion Drizzle
- [ ] Crear `services/sync/sync.service.ts`
- [ ] Crear `api/sync.ts`
- [ ] Registrar en `plugins/services.ts`
- [ ] Registrar en `src/index.ts`
- [ ] Validar tenancy con `RequestContext`

### Frontend

- [ ] Crear `lib/sync/queue.ts`
- [ ] Crear `lib/sync/client.ts`
- [ ] Crear `hooks/use-sync-engine.ts`
- [ ] Integrar enqueue en mutaciones clave
- [ ] Conectar `SyncStatus` a estado real
- [ ] Actualizar `ElectricProvider` para estado real

### QA

- [ ] Offline create/update/delete
- [ ] Reconexion con retry
- [ ] Idempotencia validada
- [ ] Sin fuga de datos entre negocios

---

## 12. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Duplicados por reintentos | Alto | `operationId` idempotente + constraint unico por negocio |
| Fuga multi-tenant | Critico | `ctx.businessId` como unica fuente de verdad |
| Drift de naming (`payments` vs `abonos`) | Medio | Mapeo explicito en SyncService |
| Saturacion por lotes grandes | Medio | `batchSize` + procesamiento por chunks |
| Estado UI inconsistente | Medio | fuente unica de estado en `use-sync-engine` |

---

## 13. Decisiones Fuera de Alcance (v1)

- No migrar completamente a una arquitectura nueva rompiendo Electric/TanStack.
- No implementar UI compleja de resolucion manual de conflictos.
- No agregar Service Worker avanzado de background sync en esta iteracion.

---

## 14. Proximos Pasos Post-v1

1. Dashboard tecnico de sincronizacion (admin).
2. Conflict center para casos no auto-resolubles.
3. Background sync via Service Worker.
4. Observabilidad (metricas de latencia, error-rate, retries).

---

*Documento ajustado para implementacion segura sobre el estado real del repositorio Avileo.*
