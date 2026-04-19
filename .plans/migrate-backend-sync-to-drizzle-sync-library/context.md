# Migrate Backend Sync to drizzle-sync Library — Context

## Overview

The `@avileo/drizzle-sync` library was extracted from the Avileo codebase to consolidate offline-first sync logic into a single reusable package with `core/`, `pglite/`, `server/`, and `react/` submodules. The frontend is partially integrated (utility re-exports and React adapter), but the **backend sync framework is entirely independent** — it does not import from the library at all. This plan migrates the backend to become a consumer of the library's `server/` submodule, achieving 100% library incorporation on the backend side.

## Background

The extraction plan (`.plans/extract-drizzle-sync-library/`) was created in January 2025 and executed in 6 tasks:
- T-001 (library structure) ✅ — T-004 (observability) ✅ — all marked completed
- T-005 (compose Avileo on top of library) 🔄 — in progress, incomplete
- T-006 (validation) ⏳ — pending

The audit revealed that while the library's `server/` submodule was created, the backend still runs its original sync framework in `packages/backend/src/services/sync/framework/` with zero imports from the library. The library and backend are parallel implementations, not a parent-child relationship.

**Key audit findings:**
1. Backend has **zero references** to `@avileo/drizzle-sync`
2. `packages/drizzle-sync/src/server/sync-engine.ts` is **unused** by backend
3. `packages/drizzle-sync/src/server/base-handler.ts` is a **minimal generic stub**; the backend's has PostgreSQL error extraction, proper logger integration, and `pgErrorCode`/`pgErrorDetail` classification
4. Library's `SyncEngine` calls `handler.execute(ctx, operation, tx)` directly; backend's uses a `SyncPipeline` middleware wrapper
5. The `change-applier.ts` exists in both `app/lib/sync/` and `drizzle-sync/src/pglite/` — not a re-export relationship

## Goal

The backend sync framework (`packages/backend/src/services/sync/`) becomes a thin application layer on top of `@avileo/drizzle-sync/server`. All core sync engine logic, handler abstractions, repositories, conflict resolution, and observability live in the library. The backend contributes only app-specific: concrete handler implementations, Drizzle schema bindings, and `RequestContext`/`DbTransaction` concrete types.

## Key Decisions

- **Library-first**: The library's `server/` submodule is the source of truth. Backend adaptations exist only where app-specific concerns (Drizzle schema, RequestContext) require it.
- **Handler inheritance**: Concrete handlers (SaleSyncHandler, CustomerSyncHandler, etc.) continue to extend `BaseSyncHandler` from the library, not from an app-local copy.
- **No forking**: If the library's `BaseSyncHandler` lacks a feature the backend needs (e.g., PostgreSQL error extraction), that feature is added to the library — not worked around in the app.
- **Parallel-run migration**: Backend keeps its current implementation running until the library-backed version is validated. Old files are removed only after verification.
- **SyncPipeline decision**: The backend's `SyncPipeline` middleware adds logging/context injection per operation. This will be preserved as a middleware layer that wraps the library's handler execution, not removed.

## Scope Boundaries

- **In scope**: Backend sync framework migration to library, `BaseSyncHandler` feature parity, library test coverage, documentation, old file removal.
- **Out of scope**: Frontend migration (T-005 frontend side is separate), new features, database schema changes, changes to the library's `core/` or `pglite/` submodules (they are considered stable).

---

## Audit Findings (T-001 Output)

### Component-by-Component Comparison

#### 1. `SyncEngine`

| Aspect | Library (`server/sync-engine.ts`) | Backend (`framework/SyncEngine.ts`) | Delta |
|--------|-----------------------------------|-------------------------------------|-------|
| Architecture | Generic `class SyncEngine<TRequestContext, TTransaction, TDeps>` | Concrete class | Library uses generics; backend uses concrete types |
| DI Pattern | `SyncEngineConfig<TRequestContext, TTransaction>` config object | Direct instantiation, internally instantiates `SyncOperationRepository` | Library uses explicit config; backend uses implicit deps |
| Execution | Calls `handler.execute(ctx, operation, tx)` directly | Calls `syncPipeline.execute(context, operation, handler, tx)` | **KEY DELTA**: Library has no middleware/pipeline concept |
| Savepoints | Via `savepointSql`, `releaseSavepointSql`, `rollbackSavepointSql` function fields in config | Via `sql.raw()` strings directly in `processBatch` | Equivalent — library is more explicit |
| Logging | Uses internal `syncLogger` singleton via `this.log()` | Uses `syncLogger.generateCorrelationId()` directly | Library is self-contained; backend imports singleton |
| Event emitter | `ISyncEventEmitter` support via config | No event emitter | Library has event emission; backend does not |
| Idempotency | Checks `findByIdempotencyKey`, returns `"already-processed"` | Same | Identical behavior |
| Conflict detection | Calls `ConflictResolverRegistry.getResolver().checkConflict()` | Same | Identical |
| Savepoint error handling | `rollbackSavepoint()` on error, then releases | Same pattern | Identical |

**Verdict**: Library's `SyncEngine` is architecturally superior (generics, config object, event emitter). The **SyncPipeline middleware is the only significant behavioral delta** — backend wraps handler execution with `validateStructure` + `validateBusinessRules` + `executeHandler` stages before the actual handler. Library's `processOperation` has no such middleware.

#### 2. `BaseSyncHandler`

| Aspect | Library (`server/base-handler.ts`) | Backend (`handlers/BaseSyncHandler.ts`) | Delta |
|--------|------------------------------------|----------------------------------------|-------|
| Logger | `console.log` for all methods | `logger.info()` / `logger.error()` (app logger) | **KEY DELTA**: Library has no `ISyncLogger` injection |
| PostgreSQL error extraction | None | Extracts `pgErrorCode`, `pgErrorDetail`, `pgErrorRoutine` from error chain | **KEY DELTA**: Library lacks PostgreSQL error classification |
| Correlation ID | Not used | `correlationId` from `operation.correlationId \|\| syncLogger.generateCorrelationId()` | Library doesn't track correlation IDs |
| `logStart` | `console.log` with entityType, operation, entityId | Same + `businessId`, `businessUserId` from ctx | Backend logs more context |
| `logSuccess` | `console.log` | Same, no ctx | Identical pattern |
| `logError` | `console.error` | Extracts PostgreSQL error chain + logs `pgErrorCode`, `pgErrorDetail`, `pgErrorRoutine` | **KEY DELTA**: Backend has richer error context |
| `validatePayload` | Uses Zod `createSchema.parse(payload)` | Same | Identical |
| `ensureParentExists` | Checks `registry.wasCreated(parentId)`, then DB query | Same | Identical |
| `executeOperation` | `create`/`update`/`delete` dispatch | Same | Identical |

**Verdict**: Library's `BaseSyncHandler` is a minimal generic stub. Backend's version has production features (PostgreSQL error extraction, proper logger, correlation IDs). **T-002 must add these to the library's version.**

#### 3. `HandlerRegistry`

| Aspect | Library (`server/handler-registry.ts`) | Backend (`framework/HandlerRegistry.ts`) | Delta |
|--------|----------------------------------------|-----------------------------------------|-------|
| Pattern | Static `Map<Entity, HandlerFactory>` | Same | Identical |
| `HandlerFactory` type | `(deps: TDeps) => ISyncHandler<unknown, unknown>` | `(deps: SyncEngineDeps) => ISyncHandler` | Library uses `unknown` generics; backend uses concrete |
| Methods | `register`, `getHandler`, `hasHandler`, `getRegisteredEntities`, `clear` | Same | Identical |

**Verdict**: Identical pattern. `HandlerFactory` signatures are compatible. Backend's concrete handlers return their specific type, which satisfies `ISyncHandler<unknown, unknown>`.

#### 4. Repositories (`SyncOperationRepository`)

| Aspect | Library (`server/operation-repository.ts`) | Backend (`SyncOperationRepository.ts`) | Delta |
|--------|--------------------------------------------|----------------------------------------|-------|
| Interface | `ISyncOperationRepository<TRequestContext, TTransaction>` with abstract base class | Concrete class (no interface declaration) | Library has interface + abstract base; backend just concrete |
| `findByIdempotencyKey` | Interface method | Same logic | Identical |
| `findByIdempotencyKeyForUpdate` | Interface method | Same (with `for update` semantics) | Identical |
| `insertOrUpdate` | Same 3-branch logic (`already-processed`, `updated`, `inserted`) | Same | Identical |
| `updateStatus` | Same | Same | Identical |
| Unique violation check | `message.includes("unique") \|\| message.includes("duplicate")` | `error.code === "23505"` | **DELTA**: Backend uses PostgreSQL error code; library uses string matching |
| `RepositoryRequestContext` | `{ businessId: string }` | Uses `RequestContext` from app (`businessId`, `businessUserId`) | **DELTA**: Backend's `RequestContext` has more fields |

**Verdict**: Library interface and abstract base class are well-designed. Backend's Drizzle implementation matches the interface. **T-003 must align `RepositoryRequestContext` with `RequestContext`** (or accept that the backend maps `RequestContext → RepositoryRequestContext`).

#### 5. `SyncConflictRepository`

| Aspect | Library (`server/conflict-repository.ts`) | Backend (`SyncConflictRepository.ts`) | Delta |
|--------|------------------------------------------|-------------------------------------|-------|
| Interface | `ISyncConflictRepository` + abstract base | Concrete class | Library has interface |
| All CRUD methods | Same | Same | Identical |
| Context type | `RepositoryRequestContext` (businessId only) | `RequestContext` (businessId + businessUserId) | Same delta as above |

**Verdict**: Interfaces are compatible. Backend adds `businessUserId` to context but `RepositoryRequestContext.businessId` is sufficient for all queries.

#### 6. `SyncDeadLetterRepository`

| Aspect | Library (`server/dead-letter-repository.ts`) | Backend (`SyncDeadLetterRepository.ts`) | Delta |
|--------|----------------------------------------------|---------------------------------------|-------|
| Interface | `ISyncDeadLetterRepository` + abstract base | Concrete class | Library has interface |
| `create`, `findByBusiness`, `countByBusiness`, `countByBusinessAndEntity`, `findById`, `delete`, `deleteOlderThan` | All present | All present | Identical |
| Context type | `RepositoryRequestContext` | `RequestContext` | Same delta |

**Verdict**: Fully compatible. Backend implementation matches library interface.

#### 7. `EntityRegistry`

| Aspect | Library (`server/entity-registry.ts`) | Backend (`framework/EntityRegistry.ts`) | Delta |
|--------|-------------------------------------|---------------------------------------|-------|
| Implementation | Class implementing `IEntityRegistry` | Class | Library implements interface; backend doesn't |
| All methods | `register`, `wasCreated`, `wasModified`, `wasDeleted`, `clear`, `getStats` | Same | Identical |
| Logic | Identical | Identical | None |

**Verdict**: Identical. Library has interface (good practice). No migration needed.

#### 8. `OperationSorter`

| Aspect | Library (`server/operation-sorter.ts`) | Backend (`framework/OperationSorter.ts`) | Delta |
|--------|--------------------------------------|---------------------------------------|-------|
| Sort logic | syncGroupId → priority → timestamp | Same | Identical |
| `getPriorityMap()` | Returns `{ ...ENTITY_PRIORITIES }` | Same | Identical |
| Return type | `{ operations: SyncOperationInput[]; groupCount: number }` | Same | Identical |

**Verdict**: Identical. No migration needed — both can coexist or one can re-export from the other.

#### 9. `SyncLogger`

| Aspect | Library (`server/sync-logger.ts`) | Backend (`sync-logger.ts`) | Delta |
|--------|-----------------------------------|---------------------------|-------|
| Singleton | `SyncLogger.getInstance()` | `syncLogger` module singleton | Same pattern |
| `generateCorrelationId()` | Same format: `sync-${Date.now()}-${random}` | Same | Identical |
| Error classification | Spanish strings: "requiere", "no encontrado" | Same | Identical |
| `classifyError` categories | VALIDATION, NOT_FOUND, CONFLICT, DATABASE, NETWORK, UNKNOWN | Same | Identical |
| `ISyncLogger` adapter | `SyncLoggerAdapter` + `createSyncLoggerAdapter()` | N/A | Library has adapter; backend uses logger directly |

**Verdict**: Essentially identical. Library has an `ISyncLogger` adapter that the backend can use. No significant delta.

#### 10. `SyncPipeline` (backend only)

The backend's `SyncPipeline` (81 lines) wraps handler execution with:
1. `validateStructure` — Zod schema validation via `syncOperationSchema`
2. `validateBusinessRules` — calls `handler.validateBusinessRules()`
3. `executeHandler` — calls `handler.execute(ctx, operation, tx)`

This middleware is **not present in the library**. The library's `SyncEngine` calls `handler.execute()` directly.

**Verdict**: This is the **architectural decision point (OQ-001)**.

#### 11. `SyncHandlerDeps`

| Aspect | Library (`server/types.ts`) | Backend (`framework/types.ts`) | Delta |
|--------|-----------------------------|------------------------------|-------|
| Type | `{ [key: string]: unknown }` | Named properties: `customerRepo`, `saleRepo`, etc. | **DELTA**: Library is generic dict; backend is explicit |

**Verdict**: Library's `SyncEngineDeps extends SyncHandlerDeps` with `{ [key: string]: unknown }` is intentionally minimal. Backend's concrete `SyncEngineDeps` has named optional properties. For migration, backend passes its deps to library's `SyncEngine` via the generic interface.

---

### OQ-001 Resolution: SyncPipeline Strategy

**Decision: Option B (SyncPipeline as backend-only wrapper)**

The library's `SyncEngine` does not have a middleware/pipeline concept. The backend's `SyncPipeline` adds three things:
1. Zod schema validation (`syncOperationSchema`)
2. Business rule validation per handler
3. Handler execution

For the migration:
- Keep `SyncPipeline.ts` in the backend (it is app-specific — Zod schemas and business rule validation are Avileo-specific)
- The backend's `SyncService` constructs the library's `SyncEngine` with its config
- The backend's `processBatch` route handler calls `SyncPipeline.execute()` instead of `engine.processBatch()` directly
- `SyncPipeline` internally calls `libraryEngine.processBatch()` for the actual batch processing, or wraps the per-operation call

**Simpler approach**: Since `SyncPipeline` validates structure and business rules, and the library's `SyncEngine.processOperation` also checks idempotency and calls the handler, we can keep `SyncPipeline` as a pre-processing layer in the backend that validates before calling the library engine.

### OQ-002 Resolution: DbTransaction Adapter

**Decision: Option A (use library's generic with Drizzle adapter)**

The library defines `DbTransaction = unknown` as a generic placeholder. The backend uses `DbTransaction` from `packages/backend/src/lib/txid.ts` (which is Drizzle's transaction type).

For migration:
- The backend passes its `db` client (which implements `transaction()` and `execute()`) as `DbClient<TTransaction>`
- `SyncOperationRepository` etc. are instantiated with the backend's Drizzle `db` instance
- The library's `DbTransaction = unknown` is acceptable because the concrete implementations use Drizzle's actual transaction type internally
- A thin adapter in the backend maps `RequestContext` (with `businessId` + `businessUserId`) to `RepositoryRequestContext` (with `businessId`)

### Summary of Required Changes

| Component | Action | Priority |
|-----------|--------|----------|
| `BaseSyncHandler` | Add PostgreSQL error extraction, `ISyncLogger` injection, correlation ID support | **T-002 (highest)** |
| `SyncHandlerDeps` | Backend's concrete deps compatible with library's `{ [key: string]: unknown }` | T-005 |
| `SyncEngine` | Add optional `IPipelineStage[]` config for middleware hooks, or keep SyncPipeline as backend wrapper | **T-003** |
| `RepositoryRequestContext` | Align with backend's `RequestContext` — add `businessUserId` | T-003 |
| `HandlerRegistry` | Compatible as-is | No change |
| `EntityRegistry` | Identical | No change |
| `OperationSorter` | Identical | No change |
| `SyncLogger` | Compatible via adapter | No change |
| Repositories | Backend implements library interfaces | T-004 |
| `SyncPipeline` | Keep as backend-only wrapper | T-003 (decision) |
