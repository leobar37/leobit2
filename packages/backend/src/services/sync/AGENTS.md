# Sync Service - AGENTS.md

> Server-side sync engine for processing offline operations from mobile clients. Part of `packages/backend/src/services/AGENTS.md`.

## OVERVIEW

Processes batched sync operations from offline-first mobile clients: validates business rules, resolves conflicts, executes atomically.

## STRUCTURE

```
sync/
├── sync.service.ts          # Orchestrates batch processing
├── sync-logger.ts           # Structured sync logging
├── types.ts                 # Operation types, results
├── handlers/                # Entity-specific handlers
│   ├── BaseSyncHandler.ts   # Abstract base (extend this)
│   ├── CustomerSyncHandler.ts
│   ├── SaleSyncHandler.ts
│   ├── AbonoSyncHandler.ts
│   ├── PurchaseSyncHandler.ts
│   └── ... (10 more)
├── framework/               # Core infrastructure
│   ├── SyncEngine.ts        # Batch execution engine
│   ├── ConflictResolver.ts  # Version conflict logic
│   ├── OperationSorter.ts   # Dependency ordering
│   ├── SyncPipeline.ts      # Processing pipeline
│   └── HandlerRegistry.ts   # Handler lookup
└── schemas/                 # Zod validation schemas
```

## WHERE TO LOOK

| Task | File |
|------|------|
| New entity handler | `handlers/BaseSyncHandler.ts` |
| Add validation rules | Extend `validateBusinessRules()` in handler |
| Fix conflict bugs | `framework/ConflictResolver.ts` |
| Operation ordering | `framework/OperationSorter.ts` |
| Handler registration | `framework/HandlerRegistry.ts` |
| Add schema | `schemas/` then import in handler |

## CONVENTIONS

**Handler Implementation**
- Extend `BaseSyncHandler`
- Set `readonly entityType: SyncEntity`
- `validateBusinessRules()` - business validation (no DB writes)
- `execute()` - DB writes via `tx` parameter
- Always use `ctx.businessId` for multi-tenancy

**Sync Flow**
1. `OperationSorter` orders by dependencies (customers → sales → items)
2. `SyncPipeline` runs validation → execution per operation
3. `ConflictResolver` checks version timestamps
4. All writes happen in single transaction per operation

**Error Handling**
- Return `createErrorResult(code, message, details?)` not throw
- Use typed error codes from `SyncErrorCode`
- Log with `logError()` for structured traces

## ANTI-PATTERNS

- **Skip validateBusinessRules**: Always validate before execute
- **Manual DB queries**: Use injected repositories via `ctx`
- **Forget businessId**: All queries MUST filter by `ctx.businessId`
- **Throw in execute**: Return error results for graceful batch handling
- **Hardcode entity strings**: Use `SyncEntity` enum
</content>