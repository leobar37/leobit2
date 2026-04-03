# T-004: Unit tests para PullService edge cases

## Objetivo
Extender los tests existentes de `PullService` para cubrir edge cases críticos, especialmente el scenario de "0 registros con hasMore: true".

## Archivos a Modificar
- `packages/app/app/lib/sync/__tests__/pull-service.test.ts` (extender existente)

## Tests Nuevos a Agregar

### Test Suite: Edge Cases (agregar al archivo existente)

```typescript
describe("pullWithOptions edge cases", () => {
  describe("when server returns 0 changes but hasMore: true", () => {
    it("should not infinite loop", async () => {
      // Setup: PullService returns { changes: [], hasMore: true, nextSince: cursor }
      // Expect: After N iterations, should stop (max iterations)
      // This is the CRITICAL bug we need to prevent
    });

    it("should eventually set hasMore: false", async () => {
      // Setup: First call returns empty, second returns data
      // Assert: Completes successfully
    });

    it("should track consecutive empty responses", async () => {
      // Setup: Multiple empty responses
      // Assert: can detect "stuck" state
    });
  });

  describe("stage cursors", () => {
    it("should save cursor per stage", async () => {
      // cursorKey = "critical" saves to localStorage["cursor_key_critical"]
    });

    it("should load stage-specific cursor", async () => {
      // On subsequent sync, should resume from correct cursor
    });

    it("should not mix cursors between stages", async () => {
      // CRITICAL cursor should not affect RECENT_SALES
    });
  });

  describe("entityTypes filtering", () => {
    it("should send entityTypes as comma-separated", async () => {
      // Verify URL: /sync/changes?entityTypes=customers,products
    });

    it("should handle single entity", async () => {
      // Verify URL: /sync/changes?entityTypes=customers
    });
  });

  describe("concurrent pulls prevention", () => {
    it("should return early if isPullingFlag is true", async () => {
      // Directly set isPullingFlag = true and call pullWithOptions
    });

    it("should reset isPullingFlag on error", async () => {
      // Force error during pull, verify flag is reset
    });
  });
});

describe("backoff behavior", () => {
  it("should apply backoff after HTTP 500", async () => {
    // Multiple 500 errors should increase backoff exponentially
  });

  it("should reset backoff on success", async () => {
    // After success, backoff should reset to 0
  });

  it("should cap backoff at MAX_BACKOFF", async () => {
    // After many failures, backoff should not exceed 30000ms
  });
});
```

### Test Suite: Error Responses (nuevo)

```typescript
describe("error handling", () => {
  it("should handle network timeout", async () => {
    // AbortController timeout
  });

  it("should handle malformed JSON", async () => {
    // Server returns invalid JSON
  });

  it("should handle 401 Unauthorized", async () => {
    // Token expired
    // Assert: clear error message
  });

  it("should handle 403 Forbidden", async () => {
    // No access to business
  });
});
```

## Criterios de Aceptación

- [ ] 85%+ code coverage
- [ ] Edge case de "0 registros con hasMore: true" testeado
- [ ] Stage cursors testeados
- [ ] Backoff behavior testeado
- [ ] No más loops infinitos posibles

## Dependencias
- T-001 (interfaces)
- T-002 (PGlite mock)

## Notas
- Estos tests previenen el bug de sync "plantado"
- El scenario "0 cambios con hasMore: true" es el más crítico
- Considerar agregar `consecutiveEmptyResponses` counter en el código para tracking
