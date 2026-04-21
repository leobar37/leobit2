# Requirements: Refactor PGlite Architecture

## Functional Requirements

### FR-001: SqlExecutor Abstraction
**ID:** FR-001  
**Description:** Create an SqlExecutor abstraction that wraps PGlite query/exec operations to enable testing with mocks.

**Acceptance Criteria:**
- Must expose `query<T>(sql, params)` method
- Must expose `exec(sql)` method for non-SELECT statements  
- Must be constructible from `SyncClientEngineContext.pg`
- Must pass through all SQL errors unchanged

### FR-002: Context-Based Dependency Injection
**ID:** FR-002  
**Description:** All services must receive dependencies through `SyncClientEngineContext` instead of direct PGlite/businessId parameters.

**Acceptance Criteria:**
- ChangeApplier constructor signature: `(context: SyncClientEngineContext, options?: ApplierOptions)`
- SyncService constructor signature: `(context: SyncClientEngineContext, options?: SyncServiceOptions)`
- PullService constructor signature: `(context: SyncClientEngineContext, options?: PullServiceOptions)`
- No direct PGlite parameter in any public service constructor

### FR-003: Logger Interface Injection
**ID:** FR-003  
**Description:** Replace all direct `syncLogger` usage with injected `ISyncLogger` interface.

**Acceptance Criteria:**
- All services accept `logger?: ISyncLogger` in options
- Default to no-op logger if not provided (not syncLogger)
- No direct imports of `syncLogger` in domain/ layer
- Existing behavior preserved when logger is provided

### FR-004: Change Application Refactor
**ID:** FR-004  
**Description:** Refactor change-applier.ts into domain/change/ with clear separation of strategies.

**Acceptance Criteria:**
- InsertStrategy, UpdateStrategy, DeleteStrategy as separate functions/classes
- Conflict checking extracted to separate module
- REQUIRED_COLUMN_DEFAULTS moved to config/defaults.ts
- All SQL construction happens via SqlExecutor
- Support for upsert behavior maintained

### FR-005: Queue Operations Refactor
**ID:** FR-005  
**Description:** Refactor pg-sync-queue.ts into domain/queue/ with repository pattern.

**Acceptance Criteria:**
- QueueRepository handles all SQL operations
- PgSyncQueue uses repository, no direct SQL
- Coalescing logic extracted to separate module
- Priority-based ordering maintained

### FR-006: Push Service Refactor
**ID:** FR-006  
**Description:** Refactor sync-service.ts and related files into domain/push/.

**Acceptance Criteria:**
- SyncBatchProcessor uses injected dependencies only
- SyncOperationLifecycleService integrated or merged
- SyncEntityStatusUpdater integrated or merged
- HTTP client interface properly used (ISyncHttpClient)
- Mutex usage maintained

### FR-007: Pull Service Refactor
**ID:** FR-007  
**Description:** Refactor pull-service.ts and staged-pull-coordinator.ts into domain/pull/.

**Acceptance Criteria:**
- PullService uses context for all dependencies
- StagedPullCoordinator updated to new PullService API
- Cursor storage interface maintained
- Change applier integration via context

### FR-008: SyncClientEngine Update
**ID:** FR-008  
**Description:** Update SyncClientEngine to instantiate services with new context-based APIs.

**Acceptance Criteria:**
- Engine creates context object with all dependencies
- All service instantiations use new signatures
- No regression in engine functionality
- Event emitter integration maintained

### FR-009: Public API Preservation
**ID:** FR-009  
**Description:** pglite/index.ts must export same public APIs (even if internal implementation changed).

**Acceptance Criteria:**
- All existing exports available
- Type exports maintained
- New interfaces also exported for advanced usage

## Non-Functional Requirements

### NFR-001: Testability
- All domain services must be testable with mocked SqlExecutor
- No direct PGlite dependency in domain logic tests

### NFR-002: Performance
- SQL queries must not change (same performance characteristics)
- No additional overhead in hot paths

### NFR-003: Code Organization
- Max 300 lines per file (except generated/index files)
- Single responsibility per module
- Clear import/export patterns

## Out of Scope

- Migrating from SQL raw to Drizzle ORM (future phase)
- Adding new sync features or entities
- Changing sync protocol or conflict resolution logic
- UI changes in app package
- Database schema changes
