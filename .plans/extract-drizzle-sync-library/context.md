# Context: Extract Drizzle-Based Custom Sync Library

## Objective

Extract Avileo's offline-first sync engine into a reusable, Drizzle-oriented library package (`@avileo/drizzle-sync`) that can be adopted by other projects using Drizzle ORM with PostgreSQL. The library must support both PGlite (frontend) and PostgreSQL (backend) runtimes, unify observability, and provide clear migration paths while keeping Avileo operational during incremental extraction.

## Scope

**In Scope:**
- Create `packages/drizzle-sync/` workspace library with submodules: `core`, `pglite`, `server`, `react`, `shared`
- Extract frontend PGlite adapters (change-applier, schema-mapper, pg-sync-queue, sync-logger)
- Extract backend server engine adapters (SyncEngine, ConflictResolver, BaseSyncHandler, operation repositories)
- Unify observability (sync-logger) with configurable adapters for frontend (console/ring-buffer) and backend (pino/logger)
- Define stable contracts for operation types, queue interfaces, and handler abstractions
- Provide migration paths from current Avileo sync implementations to library imports
- Maintain backward compatibility during rollout with feature flags or parallel imports

**Non-Scope:**
- Application-specific entity handlers (SaleSyncHandler, CustomerSyncHandler, etc.) — remain in Avileo
- Business logic (repositories, services) — remain in Avileo
- UI components for conflict resolution — remain in Avileo
- Database schema definitions — remain in `@avileo/shared` and `packages/backend/src/db/schema`
- ElectricSQL integration — not part of this library
- Breaking changes to Avileo's sync API during extraction

## Verified Context

### Frontend Sync Architecture (packages/app/app/lib/sync/)

| File | Lines | Purpose | Extractable |
|------|-------|---------|-------------|
| `change-applier.ts` | 553 | Raw SQL UPSERT for applying server changes to PGlite | ✅ Core pattern |
| `schema-mapper.ts` | 272 | Table/column validation, snake_case mapping | ✅ Core utility |
| `queue/pg-sync-queue.ts` | 508 | ISyncQueue implementation for PGlite | ✅ Core adapter |
| `queue/coalesce.ts` | 129 | Operation coalescing logic (create+delete=cancel) | ✅ Core logic |
| `sync-logger.ts` | 117 | Ring-buffer logger with console forwarding | ✅ Observability |
| `sync-service.ts` | 397 | Push sync orchestration | ⚠️ Facade over queue |
| `pull-service.ts` | 786 | Cursor-based pull, stale detection | ⚠️ Facade over change-applier |
| `coordinator.ts` | 185 | Push + pull orchestration, online/offline | ⚠️ Facade |
| `service-provider.tsx` | 599 | React context for sync services | ✅ React adapter |
| `types/operations.types.ts` | 146 | SyncOperationRecord, DeadLetterOperationRecord | ✅ Core types |
| `types/conflict.types.ts` | 56 | Conflict detection types | ✅ Core types |
| `config.ts` | 63 | OPERATION_STATUS constants | ✅ Core config |
| `backoff.ts` | 95 | Exponential backoff utilities | ✅ Core utility |

### Backend Sync Architecture (packages/backend/src/services/sync/)

| File | Lines | Purpose | Extractable |
|------|-------|---------|-------------|
| `framework/SyncEngine.ts` | 333 | Batch processing with savepoints | ✅ Core engine |
| `framework/ConflictResolver.ts` | 566 | Version-based conflict detection | ✅ Core pattern |
| `framework/HandlerRegistry.ts` | 36 | Handler registration | ✅ Core pattern |
| `framework/OperationSorter.ts` | 37 | Priority-based sorting | ✅ Core utility |
| `framework/EntityRegistry.ts` | 69 | Track created entities in batch | ✅ Core utility |
| `framework/SyncOperationRepository.ts` | 209 | Drizzle-based operation persistence | ✅ Core adapter |
| `framework/SyncConflictRepository.ts` | 198 | Drizzle-based conflict persistence | ✅ Core adapter |
| `framework/SyncDeadLetterRepository.ts` | 152 | Drizzle-based DLQ persistence | ✅ Core adapter |
| `framework/SyncMetricsService.ts` | 178 | Metrics collection | ✅ Observability |
| `framework/SyncPipeline.ts` | 81 | Pipeline orchestration | ⚠️ Thin wrapper |
| `handlers/BaseSyncHandler.ts` | 176 | Abstract handler with logging | ✅ Core abstraction |
| `sync-logger.ts` | 401 | Structured logging with correlation IDs | ✅ Observability |
| `schemas/index.ts` | 433 | Zod validation schemas | ❌ App-specific |

### Shared Configuration (packages/shared/src/)

| File | Lines | Purpose | Extractable |
|------|-------|---------|-------------|
| `sync-config.ts` | 89 | SYNC_ENTITIES, ENTITY_PRIORITIES | ⚠️ App-specific, but pattern reusable |

### Key Architectural Decisions (Verified)

1. **Change-applier uses raw SQL** — Drizzle ORM has camelCase/snake_case mismatch with PGlite. Library must support raw SQL adapters alongside Drizzle.

2. **Two-tier entity priority** — Parent entities (sales, customers) processed before children (sale_items, customer_tags). Library must expose priority configuration.

3. **Version-based conflict detection** — Each entity has `version` column incremented on update. ConflictResolver compares versions.

4. **Savepoint-based batch processing** — Backend SyncEngine uses PostgreSQL savepoints for per-operation rollback within transaction.

5. **Idempotency keys** — Operations use `idempotencyKey` for deduplication. Frontend queue checks before enqueue.

6. **Dead letter queue** — Operations exceeding MAX_RETRIES move to DLQ for manual retry.

7. **Staged pull strategy** — CRITICAL → RECENT_SALES → HISTORICAL. Library should expose pull stages configuration.

8. **Sync group ID** — Groups parent+children operations for atomic processing.

## Inferred Context

1. **Library should be runtime-agnostic** — Core types and interfaces should not depend on PGlite or Node.js runtime specifics.

2. **Drizzle-first but SQL-compatible** — Library should use Drizzle for type-safe queries where possible, but allow raw SQL adapters for edge cases (camelCase/snake_case mismatch).

3. **Observability as plugin** — Frontend uses ring-buffer + console; backend uses pino. Library should accept logger adapter interface.

4. **React integration optional** — Not all consumers use React. React adapters should be a separate entrypoint.

5. **Entity handlers remain app-specific** — Library provides `BaseSyncHandler` pattern; app implements concrete handlers.

## Unknowns

1. **API stability guarantees** — What semver policy should the library adopt? (Recommend: 0.x for initial releases)

2. **Bundle size constraints** — Should frontend entrypoint tree-shake unused features? (Recommend: Yes, design for tree-shaking)

3. **Testing strategy** — Should library include test utilities (mocks, factories)? (Recommend: Yes, as separate entrypoint)

4. **Documentation hosting** — Where should library docs live? (Recommend: `packages/drizzle-sync/README.md` + typedoc)

5. **Cross-package imports during migration** — How to handle circular dependencies during incremental extraction? (Recommend: Re-export from library, deprecate original locations)

## Likely Files or Areas Involved

### New Library Structure

```
packages/drizzle-sync/
├── src/
│   ├── core/                    # Runtime-agnostic core
│   │   ├── types.ts             # SyncOperation, SyncStatus, etc.
│   │   ├── interfaces.ts        # ISyncQueue, ISyncHandler, ILogger
│   │   ├── priority.ts          # Entity priority configuration
│   │   ├── coalesce.ts          # Operation coalescing logic
│   │   ├── backoff.ts           # Exponential backoff
│   │   └── index.ts
│   ├── pglite/                  # Frontend PGlite adapters
│   │   ├── change-applier.ts    # Raw SQL UPSERT
│   │   ├── schema-mapper.ts     # Table/column validation
│   │   ├── sync-queue.ts        # ISyncQueue implementation
│   │   ├── pull-service.ts      # Cursor-based pull (facade)
│   │   ├── sync-logger.ts       # Ring-buffer logger
│   │   └── index.ts
│   ├── server/                  # Backend PostgreSQL adapters
│   │   ├── sync-engine.ts       # Batch processing with savepoints
│   │   ├── conflict-resolver.ts # Version-based detection
│   │   ├── operation-repository.ts
│   │   ├── conflict-repository.ts
│   │   ├── dead-letter-repository.ts
│   │   ├── base-handler.ts      # Abstract handler
│   │   ├── handler-registry.ts
│   │   ├── operation-sorter.ts
│   │   ├── entity-registry.ts
│   │   ├── sync-logger.ts      # Pino-based logger
│   │   └── index.ts
│   ├── react/                   # React integration
│   │   ├── sync-provider.tsx   # Context provider
│   │   ├── use-sync-status.ts  # Hook for status
│   │   └── index.ts
│   ├── shared/                  # Shared utilities
│   │   ├── constants.ts         # OPERATION_STATUS
│   │   └── index.ts
│   └── index.ts                 # Main entrypoint
├── package.json
├── tsconfig.json
├── tsup.config.ts              # Build config for multiple entrypoints
└── README.md
```

### Migration Sources

| Current Location | Target Location | Notes |
|------------------|-----------------|-------|
| `packages/app/app/lib/sync/change-applier.ts` | `packages/drizzle-sync/src/pglite/change-applier.ts` | Raw SQL pattern |
| `packages/app/app/lib/sync/schema-mapper.ts` | `packages/drizzle-sync/src/pglite/schema-mapper.ts` | Table validation |
| `packages/app/app/lib/sync/queue/pg-sync-queue.ts` | `packages/drizzle-sync/src/pglite/sync-queue.ts` | ISyncQueue impl |
| `packages/app/app/lib/sync/queue/coalesce.ts` | `packages/drizzle-sync/src/core/coalesce.ts` | Pure logic |
| `packages/app/app/lib/sync/backoff.ts` | `packages/drizzle-sync/src/core/backoff.ts` | Pure utility |
| `packages/app/app/lib/sync/sync-logger.ts` | `packages/drizzle-sync/src/pglite/sync-logger.ts` | Frontend logger |
| `packages/backend/src/services/sync/framework/SyncEngine.ts` | `packages/drizzle-sync/src/server/sync-engine.ts` | Core engine |
| `packages/backend/src/services/sync/framework/ConflictResolver.ts` | `packages/drizzle-sync/src/server/conflict-resolver.ts` | Conflict pattern |
| `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` | `packages/drizzle-sync/src/server/base-handler.ts` | Handler abstraction |
| `packages/backend/src/services/sync/sync-logger.ts` | `packages/drizzle-sync/src/server/sync-logger.ts` | Backend logger |
| `packages/app/app/lib/sync/service-provider.tsx` | `packages/drizzle-sync/src/react/sync-provider.tsx` | React context |

## Architecture Direction

### Single Package with Submodules

**Recommendation:** Create a single workspace library package (`@avileo/drizzle-sync`) with multiple entrypoints rather than four separate packages.

**Rationale:**
- Simpler dependency management (one `package.json`)
- Shared types and interfaces naturally co-located
- Easier versioning and publishing
- Consumers can import only what they need via subpath exports

**Package.json Exports:**
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./core": "./dist/core/index.js",
    "./pglite": "./dist/pglite/index.js",
    "./server": "./dist/server/index.js",
    "./react": "./dist/react/index.js",
    "./shared": "./dist/shared/index.js"
  }
}
```

### Drizzle-Oriented but SQL-Compatible

**Recommendation:** Library should use Drizzle ORM as primary API but support raw SQL adapters for edge cases.

**Rationale:**
- `change-applier.ts` currently uses raw SQL due to camelCase/snake_case mismatch
- Drizzle provides type-safe query building
- Raw SQL needed for PGlite UPSERT patterns

**Pattern:**
```typescript
// Library provides both APIs
import { applyChangeWithDrizzle } from '@avileo/drizzle-sync/pglite';
import { applyChangeWithRawSQL } from '@avileo/drizzle-sync/pglite/raw-sql';

// Or unified interface with strategy
import { createChangeApplier } from '@avileo/drizzle-sync/pglite';
const applier = createChangeApplier({ strategy: 'raw-sql' }); // or 'drizzle'
```

### Observability Plugin Pattern

**Recommendation:** Library should accept logger adapter interface, with built-in implementations for common cases.

**Interface:**
```typescript
interface ISyncLogger {
  info(prefix: string, message: string, data?: unknown): void;
  warn(prefix: string, message: string, data?: unknown): void;
  error(prefix: string, message: string, data?: unknown): void;
  getEntries?(): SyncLogEntry[]; // Optional for ring-buffer implementations
}
```

**Built-in Implementations:**
- `RingBufferLogger` (frontend) — in-memory ring-buffer + console
- `PinoLogger` (backend) — wraps pino logger
- `ConsoleLogger` (testing) — simple console output

## Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package structure | Single package with submodules | Simpler deps, shared types, tree-shakeable |
| ORM strategy | Drizzle-first, raw SQL fallback | Type-safety where possible, SQL for edge cases |
| Observability | Plugin pattern with interface | Flexibility for different runtimes |
| Entity handlers | Remain in application | App-specific business logic |
| Migration strategy | Parallel imports with deprecation warnings | Non-breaking extraction |
| Versioning | Semver 0.x initially | API stability not guaranteed |
