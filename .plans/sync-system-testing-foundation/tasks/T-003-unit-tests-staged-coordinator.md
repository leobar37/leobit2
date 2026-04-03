# T-003: Unit tests para StagedPullCoordinator

## Objetivo
Crear tests unitarios exhaustivos para `StagedPullCoordinator` cubriendo todos los escenarios de las 3 etapas y edge cases.

## Archivos a Crear
- `packages/app/app/lib/sync/__tests__/staged-pull-coordinator.test.ts`
- `packages/app/app/lib/sync/__tests__/staged-pull-coordinator.edge-cases.test.ts`

## Tests Requeridos

### Test Suite: loadCriticalData

```typescript
describe("loadCriticalData", () => {
  it("should load customers, products, product_variants", async () => {
    // Setup: mock PullService.pullWithOptions returns data
    // Assert: stage is "CRITICAL", status is "complete"
  });

  it("should accumulate changesApplied correctly", async () => {
    // Setup: multiple pages of data
    // Assert: totalApplied = sum of all pages
  });

  it("should set status to error on failure", async () => {
    // Setup: PullService throws error
    // Assert: status = "error", error message set
  });

  it("should handle empty response (0 records)", async () => {
    // Setup: PullService returns empty array
    // Assert: status = "complete", changesApplied = 0
  });
});
```

### Test Suite: loadRecentSales

```typescript
describe("loadRecentSales", () => {
  it("should load sales and sale_items", async () => { /* ... */ });
  it("should use correct since date (7 days)", async () => { /* ... */ });
  it("should set status to error on failure", async () => { /* ... */ });
});
```

### Test Suite: loadHistoricalData

```typescript
describe("loadHistoricalData", () => {
  it("should not block when error occurs", async () => {
    // Setup: HISTORICAL stage fails
    // Assert: error logged but not thrown, stage status = "error"
    // UI should still be usable
  });

  it("should continue loading even if one batch fails", async () => {
    // Setup: first batch fails, retries succeed
    // Assert: continues loading, reports total changes
  });
});
```

### Test Suite: Edge Cases (edge-cases.test.ts)

```typescript
describe("loop protection", () => {
  it("should throw after MAX_ITERATIONS", async () => {
    // Setup: PullService always returns hasMore: true
    // Assert: throws "Max iterations reached for stage CRITICAL"
  });

  it("should respect STAGE_TIMEOUT_MS", async () => {
    // Setup: stage takes too long
    // Assert: throws timeout error
  });
});

describe("progress calculation", () => {
  it("should calculate correct progress for CRITICAL stage", async () => {
    // CRITICAL: min=15, max=50
  });

  it("should calculate correct progress for RECENT_SALES stage", async () => {
    // RECENT_SALES: min=50, max=75
  });

  it("should calculate correct progress for HISTORICAL stage", async () => {
    // HISTORICAL: min=75, max=95
  });
});
```

## Estructura de Tests

1. **Setup común** - crear mock de PullService
2. **Each test** - configurar respuesta específica, ejecutar, assertion
3. **Cleanup** - reset mocks entre tests

## Criterios de Aceptación

- [ ] 90%+ code coverage
- [ ] Todos los escenarios de CT-001 cubiertos
- [ ] Tests de edge cases en archivo separado
- [ ] Nombres de test descriptivos (given-when-then)

## Dependencias
- T-001 (interfaces)
- T-002 (PGlite mock)

## Notas
- Mock `PullService` completamente, no hacer llamadas reales
- Usar `vi.mock` para isolate del código real
- Tests deben ser rápidos (< 50ms cada uno)
