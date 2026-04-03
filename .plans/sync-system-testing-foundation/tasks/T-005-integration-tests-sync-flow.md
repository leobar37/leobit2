# T-005: Integration tests para sync flow

## Objetivo
Crear tests de integración que prueben el flujo completo de sincronización usando MSW para mockear las APIs del backend.

## Archivos a Crear
- `packages/app/tests/integration/sync/staged-sync-flow.integration.spec.tsx`
- `packages/app/tests/integration/sync/sync-page.integration.spec.tsx`
- `packages/app/tests/integration/sync/handlers.ts` (MSW handlers)

## MSW Handlers a Crear

```typescript
// packages/app/tests/integration/sync/handlers.ts

// GET /sync/changes - various responses
export const syncChangesHandlers = {
  // Happy path: returns data
  withData: http.get(`${API_URL}/sync/changes`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        changes: [
          {
            idempotencyKey: "key-1",
            entityType: "customers",
            operation: "create",
            entityId: "customer-1",
            payload: { name: "Test Customer", phone: "123" },
            localTimestamp: "2024-01-01T00:00:00Z",
            processedAt: "2024-01-01T00:00:00Z",
          }
        ],
        nextSince: "2024-01-02T00:00:00Z",
        hasMore: false,
        serverTimestamp: new Date().toISOString(),
      }
    });
  }),

  // Empty response (sync_operations table is empty)
  empty: http.get(`${API_URL}/sync/changes`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        changes: [],
        nextSince: null,
        hasMore: false,
        serverTimestamp: new Date().toISOString(),
      }
    });
  }),

  // Empty but hasMore: true (THE BUG SCENARIO)
  emptyWithHasMore: http.get(`${API_URL}/sync/changes`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        changes: [],
        nextSince: "2024-01-01T00:00:00Z",
        hasMore: true,  // This causes infinite loop!
        serverTimestamp: new Date().toISOString(),
      }
    });
  }),

  // Server error
  error: http.get(`${API_URL}/sync/changes`, () => {
    return HttpResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }),
};

// GET /sync/health
export const syncHealthHandler = http.get(`${API_URL}/sync/health`, () => {
  return HttpResponse.json({
    success: true,
    data: {
      metrics: { total: 0, pending: 0 },
      errorSummary: {},
      recentErrors: [],
    }
  });
});
```

## Tests a Crear

### Test 1: Staged Sync Flow (happy path)

```typescript
describe("StagedSyncFlow", () => {
  it("should complete all 3 stages sequentially", async () => {
    // Setup: MSW returns data for all 3 stages
    // Render: StagedPullCoordinator
    // Assert: CRITICAL → RECENT_SALES → HISTORICAL completes
  });

  it("should report progress per stage", async () => {
    // Setup: progress callback
    // Assert: called with correct stage transitions
  });

  it("should allow app to be usable after CRITICAL + RECENT_SALES", async () => {
    // Assert: isAppUsable() returns true after first 2 stages
  });
});
```

### Test 2: Sync Page (UI)

```typescript
describe("SyncPage", () => {
  it("should show 'Datos de referencia esenciales: X registros' during CRITICAL", async () => {
    // Setup: MSW withData
    // Render: SyncPage
    // Assert: progress message updates with count
  });

  it("should show error when 0 records in CRITICAL stage", async () => {
    // Setup: MSW empty response
    // Render: SyncPage
    // Assert: Shows actionable error message
    // NOT just "0 registros" - should explain WHY and WHAT TO DO
  });

  it("should navigate to dashboard after successful sync", async () => {
    // Setup: MSW withData
    // Render: SyncPage
    // Wait for navigate("/dashboard")
    // Assert: navigation occurred
  });

  it("should show retry button on error", async () => {
    // Setup: MSW error
    // Render: SyncPage
    // Assert: retry button visible
  });
});
```

### Test 3: Error Recovery

```typescript
describe("Sync Error Recovery", () => {
  it("should allow manual retry after network error", async () => {
    // Setup: First call fails, second succeeds
    // Render: SyncPage
    // Click retry
    // Assert: Sync completes
  });

  it("should preserve partial progress on error", async () => {
    // Setup: CRITICAL succeeds, RECENT_SALES fails
    // Click retry
    // Assert: CRITICAL doesn't reload
  });
});
```

## Criterios de Aceptación

- [ ] All CT-003 test cases pass
- [ ] MSW handlers cover all scenarios
- [ ] Sync page shows actionable error for 0 records
- [ ] Navigation to dashboard on success
- [ ] Retry button works

## Dependencias
- T-003 (StagedPullCoordinator tests)
- T-004 (PullService edge cases)

## Notas
- Usar `tests/integration/sync/` como directorio
- MSW handlers centralizados en `handlers.ts`
- Reutilizar patterns de `tests/integration/` existentes
