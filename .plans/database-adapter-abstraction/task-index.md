# Database Adapter Abstraction — Task Index

| ID | Task | Status | Priority | Dependencies |
|----|------|--------|----------|--------------|
| T-001 | Create DatabaseAdapter interface and PgLiteAdapter | pending | high | — |
| T-002 | Update engine context and config types for adapter | pending | high | T-001 |
| T-003 | Migrate sync internals to DatabaseAdapter | pending | high | T-002 |
| T-004 | Migrate push service and executor to DatabaseAdapter | pending | high | T-003 |
| T-005 | Export types and validate backward compatibility | pending | medium | T-004 |

## Execution Order

```
T-001 ──→ T-002 ──→ T-003 ──→ T-004 ──→ T-005
```

All tasks are sequential. Each task builds on the previous.

## Task Summary

### T-001: Create DatabaseAdapter interface and PgLiteAdapter
Create the core abstraction and its PGlite implementation. No existing files modified.

### T-002: Update engine context and config types for adapter
Add `adapter?: DatabaseAdapter` to `SyncClientEngineContext` and `SyncClientEngineConfig`. Update engine to auto-create adapter.

### T-003: Migrate sync internals to DatabaseAdapter
Update `SyncEntityStatusUpdater`, `SyncOperationLifecycleService`, and `PushSyncService` to use `DatabaseAdapter`.

### T-004: Migrate push service and executor to DatabaseAdapter
Update `PushSyncService` to pass adapter to lifecycle services. Update `createSqlExecutor()` to prefer adapter.

### T-005: Export types and validate backward compatibility
Export new types from `index.ts`. Run type-check and build to verify zero breaking changes.
