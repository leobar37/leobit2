# T-008: Tests para nuevo sistema

## Requirement IDs
- NFR-004

## Objective
Crear tests completos para el nuevo sistema configurable.

## Files to Create

1. `packages/drizzle-sync/src/config/__tests__/validator.test.ts`
2. `packages/drizzle-sync/src/__tests__/integration.test.ts`
3. `packages/drizzle-sync/src/presets/__tests__/avileo.test.ts`

## Test Coverage Required

| Module | Coverage | Tests |
|--------|----------|-------|
| config/ | 90%+ | entity-definition, validator |
| createSyncEngine | 85%+ | factory, instance methods |
| Integration | 80%+ | full workflow |
| Presets | 90%+ | avileo config |

## Key Test Scenarios

### 1. Config Validation Tests
- Valid config passes
- Missing entities detected
- Circular dependencies detected
- Priority hierarchy violations detected
- Missing parent fields detected
- Invalid sync status fields detected

### 2. Sync Engine Tests
- Factory creates instance
- processBatch executes operations
- Priority ordering works
- Conflict resolution works
- Event emission works
- Hooks execute
- Error handling works

### 3. Integration Tests
- Full push workflow
- Full pull workflow
- Conflict detection & resolution
- Handler execution
- Database integration (mock)

### 4. Preset Tests
- Avileo entities all defined
- Priorities correct
- Self-heal configured
- Config is valid

## Example Test

```typescript
// integration.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createSyncEngine, defineEntity } from '../';
import type { SyncOperationInput } from '../server/types';

describe('integration', () => {
  it('full sync workflow', async () => {
    const sync = createSyncEngine({
      entities: {
        customers: defineEntity('customers', {
          tableName: 'customers',
          fields: ['id', 'name'],
          priority: 1,
          selfHeal: true,
        }),
      },
      hooks: {
        onPushComplete: vi.fn(),
      },
    });

    const operations: SyncOperationInput<'customers'>[] = [
      {
        idempotencyKey: 'op-1',
        entityType: 'customers',
        entityId: 'cust-1',
        operation: 'create',
        payload: { id: 'cust-1', name: 'John' },
        localVersion: 1,
        localTimestamp: new Date().toISOString(),
      },
    ];

    const result = await sync.processBatch(
      { businessId: 'biz-1', userId: 'user-1' },
      operations
    );

    expect(result.summary.total).toBe(1);
    expect(result.summary.succeeded).toBe(1);
    expect(sync.getConfig().hooks?.onPushComplete).toHaveBeenCalled();
  });
});
```

## Acceptance Criteria

- [ ] Cobertura total > 80%
- [ ] Todos los tests pasan
- [ ] Tests antiguos migrados o eliminados
- [ ] CI/CD pasa

## Time Estimate

6 horas
