# Requirements: Extract Drizzle-Based Custom Sync Library

## Functional Requirements

### FR-001: Core Types and Interfaces
The library MUST provide runtime-agnostic core types for sync operations, including:
- `SyncOperation` with idempotency key, entity type, operation type, payload, version, and sync group ID
- `SyncStatus` enum (pending, processing, syncing, completed, failed, conflict, dead_letter)
- `SyncResult` with success/failure status and error details
- `DeadLetterOperation` for operations exceeding retry limits

**Acceptance Criteria:**
- Types are exported from `@avileo/drizzle-sync/core`
- Types do not depend on PGlite, Node.js, or React runtime specifics
- Types are compatible with both JSON serialization and database persistence

### FR-002: Sync Queue Abstraction
The library MUST define an `ISyncQueue` interface for operation enqueue, dequeue, and status tracking, with implementations for:
- PGlite-based queue for frontend offline-first scenarios
- PostgreSQL-based queue for backend processing (optional, can use existing Drizzle patterns)

**Acceptance Criteria:**
- `ISyncQueue` interface exported from `@avileo/drizzle-sync/core`
- `PgSyncQueue` implementation exported from `@avileo/drizzle-sync/pglite`
- Queue supports idempotency key checking before enqueue
- Queue supports operation coalescing (create+delete=cancel, update+update=merge)

### FR-003: Change Applier for PGlite
The library MUST provide a change applier for applying server-to-client changes to PGlite using raw SQL UPSERT operations, supporting:
- INSERT for new entities
- UPDATE for existing entities
- DELETE for removed entities
- Conflict detection with local unsynced changes

**Acceptance Criteria:**
- `applyChange()` function exported from `@avileo/drizzle-sync/pglite`
- Uses raw SQL for UPSERT to handle camelCase/snake_case mismatch
- Validates table names and column names against whitelist
- Supports retry logic for transient errors
- Optionally checks for conflicts with local pending operations

### FR-004: Schema Mapper for Table/Column Validation
The library MUST provide a schema mapper for validating entity types against a whitelist and mapping between camelCase and snake_case conventions.

**Acceptance Criteria:**
- `isValidTableName()` and `filterValidColumns()` functions exported from `@avileo/drizzle-sync/pglite`
- Table whitelist configurable via constructor or options
- Column whitelist per table configurable via constructor or options
- Snake_case conversion utilities for raw SQL queries

### FR-005: Backend Sync Engine
The library MUST provide a sync engine for batch processing of sync operations with:
- PostgreSQL savepoint-based per-operation rollback within transaction
- Priority-based operation sorting (parent entities before children)
- Entity registry to track created entities within batch for parent existence checks
- Handler registry for entity-specific operation handlers

**Acceptance Criteria:**
- `SyncEngine` class exported from `@avileo/drizzle-sync/server`
- Processes operations in priority order within sync groups
- Uses PostgreSQL savepoints for atomic batch processing
- Returns `SyncBatchResult` with per-operation success/failure status

### FR-006: Conflict Resolution
The library MUST provide version-based conflict detection comparing client version with server version for each entity.

**Acceptance Criteria:**
- `ConflictResolver` class exported from `@avileo/drizzle-sync/server`
- Detects conflicts when client version < server version
- Returns conflict payload with server data for client resolution
- Supports per-entity conflict resolver customization

### FR-007: Base Sync Handler
The library MUST provide an abstract `BaseSyncHandler` class for entity-specific handlers with:
- Template method pattern for create/update/delete operations
- Logging integration with correlation IDs
- Payload validation with Zod schemas
- Parent existence check using entity registry

**Acceptance Criteria:**
- `BaseSyncHandler` abstract class exported from `@avileo/drizzle-sync/server`
- Application implements concrete handlers extending `BaseSyncHandler`
- Handlers receive `RequestContext` with business ID and user ID
- Handlers support transaction parameter for batch operations

### FR-008: Operation Repositories
The library MUST provide Drizzle-based repositories for:
- `SyncOperationRepository` — persist and query sync operations
- `SyncConflictRepository` — persist and query conflicts
- `SyncDeadLetterRepository` — persist and query dead letter operations

**Acceptance Criteria:**
- Repository classes exported from `@avileo/drizzle-sync/server`
- Use Drizzle ORM for type-safe queries
- Support transaction parameter for batch operations
- Filter by business ID for multi-tenancy

### FR-009: Observability Interface
The library MUST define an `ISyncLogger` interface with implementations for:
- Ring-buffer logger with console forwarding (frontend)
- Pino-based structured logger (backend)

**Acceptance Criteria:**
- `ISyncLogger` interface exported from `@avileo/drizzle-sync/core`
- `RingBufferLogger` exported from `@avileo/drizzle-sync/pglite`
- `PinoSyncLogger` exported from `@avileo/drizzle-sync/server`
- Library components accept logger instance via constructor or options

### FR-010: React Integration
The library MUST provide React context and hooks for sync status management:
- `SyncProvider` component for context setup
- `useSyncStatus()` hook for accessing sync state

**Acceptance Criteria:**
- `SyncProvider` and `useSyncStatus` exported from `@avileo/drizzle-sync/react`
- Provider accepts PGlite instance and configuration
- Hook returns sync status, pending count, error state

### FR-011: Pull Service for Cursor-Based Sync
The library MUST provide a pull service for fetching server changes with:
- Cursor-based pagination
- Stale pull detection (cursor not advancing)
- Staged pull strategy (CRITICAL, RECENT_SALES, HISTORICAL)

**Acceptance Criteria:**
- `PullService` class exported from `@avileo/drizzle-sync/pglite`
- Supports configurable pull stages
- Emits events for stale cursor detection
- Integrates with `ISyncHttpClient` for server communication

### FR-012: Operation Coalescing
The library MUST provide operation coalescing logic to reduce redundant operations:
- Create + Delete for same entity = Cancel
- Update + Update for same entity = Merge
- Create + Update for same entity = Create with merged payload

**Acceptance Criteria:**
- `getCoalescePlan()` function exported from `@avileo/drizzle-sync/core`
- Pure function with no side effects
- Returns coalesce plan with type, operation, and merged payload

## Non-Functional Requirements

### NFR-001: Tree-Shakeable Bundle
The library MUST be designed for tree-shaking so consumers can import only required entrypoints.

**Acceptance Criteria:**
- Subpath exports defined in `package.json`
- No side effects in module initialization
- ES module output with proper `exports` field

### NFR-002: TypeScript Support
The library MUST provide TypeScript type definitions for all exported APIs.

**Acceptance Criteria:**
- Type definitions generated from source TypeScript
- Types exported alongside JavaScript in dist
- Strict TypeScript configuration (no `any` in public APIs)

### NFR-003: Runtime Compatibility
The library MUST support:
- Bun runtime (primary)
- Node.js runtime (secondary)
- Browser runtime for PGlite entrypoint

**Acceptance Criteria:**
- `core` and `pglite` entrypoints work in browser
- `server` entrypoint works in Bun and Node.js
- No Node.js-specific APIs in `core` or `pglite`

### NFR-004: Minimal Dependencies
The library MUST minimize external dependencies.

**Acceptance Criteria:**
- `core` has zero runtime dependencies
- `pglite` depends only on `@electric-sql/pglite`
- `server` depends only on `drizzle-orm` and `postgres`
- `react` depends only on `react`

### NFR-005: Performance
The library MUST support performance-critical sync operations:
- Fast-path enqueue without precheck for hot paths
- Batch processing with savepoints for atomic operations
- Cursor-based pagination for large datasets

**Acceptance Criteria:**
- Enqueue fast-path completes in < 5ms for local operations
- Batch processing handles 100+ operations per transaction
- Pull service handles 10,000+ changes per batch

### NFR-006: Backward Compatibility During Migration
The library MUST allow Avileo to continue using existing sync implementations during incremental migration.

**Acceptance Criteria:**
- Original files remain functional during migration
- Re-export from library with deprecation warnings
- No breaking changes to Avileo's sync API

## Constraints

1. **Schema definitions remain in application** — Library does not define database tables; application provides Drizzle schema.

2. **Entity handlers remain in application** — Library provides `BaseSyncHandler`; application implements concrete handlers.

3. **Business logic remains in application** — Library does not include repositories or services for business entities.

4. **Conflict resolution UI remains in application** — Library provides conflict data; application renders UI.

5. **Better Auth integration remains in application** — Library does not depend on Better Auth.

## Open Questions

1. **Q-001:** Should the library include a testing entrypoint with mocks and factories?
   - **Recommendation:** Yes, as `@avileo/drizzle-sync/testing`

2. **Q-002:** Should the library support multiple Drizzle schema versions?
   - **Recommendation:** No, assume Drizzle ORM ^0.45.x

3. **Q-003:** Should the library provide a CLI for generating handler boilerplate?
   - **Recommendation:** No, out of scope for initial release

4. **Q-004:** Should the library support custom conflict resolution strategies beyond version-based?
   - **Recommendation:** Yes, allow custom `ConflictResolver` implementations

5. **Q-005:** Should the library include metrics collection (Prometheus, OpenTelemetry)?
   - **Recommendation:** No, provide hooks for custom metrics integration
