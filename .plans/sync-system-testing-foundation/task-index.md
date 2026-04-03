# Task Index: Sync System Testing Foundation

## Resumen de Tareas

| ID | Tarea | Dependencias | Estado |
|----|-------|--------------|--------|
| T-001 | Extraer interfaces para DI | - | Pending |
| T-002 | Crear PGlite test doubles | T-001 | Pending |
| T-003 | Unit tests para StagedPullCoordinator | T-001, T-002 | Pending |
| T-004 | Unit tests para PullService edge cases | T-001, T-002 | Pending |
| T-005 | Integration tests para sync flow | T-003, T-004 | Pending |
| T-006 | Backend sync handlers tests | - | Pending |
| T-007 | Agregar loop protection | T-003 | Pending |
| T-008 | Agregar empty sync_operations handling | T-007 | Pending |

## Dependency Graph

```
T-001 (Extract interfaces)
    │
    ├── T-002 (PGlite doubles) ──────┐
    │                                │
    ├── T-003 (StagedCoordinator) ───┤
    │                                │
    └── T-004 (PullService) ─────────┤
                                     │
                                     ▼
                              T-005 (Integration)
                                     │
                                     ▼
                              T-007 (Loop protection)
                                     │
                                     ▼
                              T-008 (Empty sync ops)

T-006 (Backend handlers) ── Independent
```

## Fase 1: Infrastructure (T-001, T-002)

### T-001: Extraer interfaces para DI
**Archivo:** `packages/app/app/lib/sync/interfaces.ts` (nuevo)

Extrae interfaces TypeScript para:
- `IPullService` - interfaz para PullService
- `IChangeApplier` - interfaz para applyChange
- `IStagedPullCoordinator` - interfaz para StagedPullCoordinator

**Criterio de	done:** Interfaces exportadas y usadas en lugar de clases concretas en tests.

### T-002: Crear PGlite test doubles
**Archivo:** `packages/app/tests/mocks/pglite-mock.ts` (nuevo)

Crea mock de PGlite que:
- Mantiene estado en memoria
- Simula `query()` y `exec()`
- Permite setup de respuestas por tabla

**Criterio de	done:** Mock puede reemplazar PGlite real en tests.

---

## Fase 2: Unit Tests (T-003, T-004)

### T-003: Unit tests para StagedPullCoordinator
**Archivos:**
- `packages/app/app/lib/sync/__tests__/staged-pull-coordinator.test.ts` (nuevo)
- `packages/app/app/lib/sync/__tests__/staged-pull-coordinator.edge-cases.test.ts` (nuevo)

**Tests requeridos:**
- loadCriticalData: success, error, empty response
- loadRecentSales: success, error, empty response
- loadHistoricalData: success, error, non-blocking
- executeStagedLoad: correct sequence
- Progress calculation per stage
- Max iterations protection (edge case)

**Criterio de	done:** 90%+ code coverage.

### T-004: Unit tests para PullService edge cases
**Archivos:**
- `packages/app/app/lib/sync/__tests__/pull-service.edge-cases.test.ts` (extender existente)

**Tests requeridos:**
- pullWithOptions with empty response and hasMore: true
- pullWithOptions with pagination
- pullWithOptions with entityTypes filter
- Stage cursor persistence
- Concurrent pulls prevention
- Backoff behavior

**Criterio de	done:** 85%+ code coverage.

---

## Fase 3: Integration Tests (T-005)

### T-005: Integration tests para sync flow
**Archivos:**
- `packages/app/tests/integration/sync/` (nuevo directorio)
- `packages/app/tests/integration/sync/staged-sync-flow.integration.spec.tsx`
- `packages/app/tests/integration/sync/sync-page.integration.spec.tsx`

**MSW Handlers requeridos:**
- `GET /sync/changes` - various responses
- `GET /sync/health` - health check

**Tests requeridos:**
- Full staged sync flow (CRITICAL → RECENT_SALES → HISTORICAL)
- Quick sync with existing cursor
- Error recovery flow
- 0 records scenario (critical gap)
- Progress UI updates

**Criterio de	done:** All CT-003 test cases pass.

---

## Fase 4: Backend Tests (T-006)

### T-006: Backend sync handlers tests
**Archivos:**
- `packages/backend/src/services/sync/handlers/__tests__/` (nuevo directorio)
- `packages/backend/src/services/sync/handlers/__tests__/customer-sync-handler.test.ts`
- `packages/backend/src/services/sync/handlers/__tests__/sale-sync-handler.test.ts`
- etc.

**Tests requeridos:**
- Cada handler procesa operaciones correctamente
- Errores de validación retornan estructura correcta
- sync_operations se crea con status "processed"
- Payload se preserva correctamente

**Criterio de	done:** Cada handler tiene al menos 3 tests unitarios.

---

## Fase 5: Defensive Code (T-007, T-008)

### T-007: Agregar loop protection
**Archivos a modificar:**
- `packages/app/app/lib/sync/staged-pull-coordinator.ts`
- `packages/app/app/lib/sync/pull-service.ts`

**Cambios:**
```typescript
const MAX_ITERATIONS_PER_STAGE = 100;
const STAGE_TIMEOUT_MS = 30000;

// En while(hasMore):
if (++iterations > MAX_ITERATIONS_PER_STAGE) {
  throw new Error(`Max iterations reached for stage ${stage}`);
}
```

**Criterio de	done:** Sin loop infinito posible, con error claro.

### T-008: Agregar empty sync_operations handling
**Archivos a modificar:**
- `packages/app/app/lib/sync/staged-pull-coordinator.ts`
- `packages/app/app/routes/sync.tsx`

**Cambios:**
- Detectar cuando response tiene 0 cambios en múltiples requests consecutivos
- Mostrar error accionable en UI
- Sugerir backfill o contactar soporte

**Criterio de	done:** UI muestra error claro con mensaje accionable.

---

## Tracking Checklist

Usar `planner-checklist.js` para trackear progreso:

```bash
node ./planner-checklist.js list sync-system-testing-foundation
node ./planner-checklist.js start sync-system-testing-foundation T-001
node ./planner-checklist.js complete sync-system-testing-foundation T-001
```
