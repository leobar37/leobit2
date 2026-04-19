# T-008 — Documentation: README, AGENTS.md, and Changelog

## Objective

Document the `@avileo/drizzle-sync` library so future developers (and agents) can understand its purpose, API, and how the backend consumes it. Also update the project's AGENTS.md files to reference the library.

## Requirements Covered

- `FR-008` — Library has README with usage documentation
- Implicit: `NFR-005` (documentation is required for production-ready library)

## Dependencies

- T-005 (migration complete — API surface is final when writing docs)
- T-007 (validation complete — docs reflect actual behavior, not planned behavior)

## Files or Areas Involved

- `packages/drizzle-sync/README.md` — Create
- `packages/drizzle-sync/CHANGELOG.md` — Create
- `packages/backend/AGENTS.md` — Modify (add library reference)
- `packages/app/AGENTS.md` — Modify (add library reference)
- `CLAUDE.md` (root) — Modify (add library to documentation map)

## Actions

### 8a. Create `packages/drizzle-sync/README.md`

Structure:
```markdown
# @avileo/drizzle-sync

Drizzle-based offline-first sync library for PostgreSQL (backend) and PGlite (frontend).

## Overview

...

## Subpath Exports

| Entry | Purpose |
|-------|---------|
| `@avileo/drizzle-sync/core` | Runtime-agnostic types, coalescing, backoff, events |
| `@avileo/drizzle-sync/shared` | Constants (OPERATION_STATUS, etc.) |
| `@avileo/drizzle-sync/pglite` | PGlite adapters for frontend |
| `@avileo/drizzle-sync/server` | PostgreSQL adapters for backend |
| `@avileo/drizzle-sync/react` | React hooks and provider |

## Backend Quick Start

```typescript
import { SyncEngine } from "@avileo/drizzle-sync/server";
import { createSyncLoggerAdapter, syncLogger } from "@avileo/drizzle-sync/server";
// ...
```

## Frontend Quick Start

```typescript
import { SyncProvider } from "@avileo/drizzle-sync/react";
import { PgSyncQueue } from "@avileo/drizzle-sync/pglite";
// ...
```

## API Reference

### SyncEngine

...

### BaseSyncHandler

...

### PgSyncQueue

...
```

### 8b. Create `packages/drizzle-sync/CHANGELOG.md`

```markdown
# Changelog

## 0.1.0 — [date]

### Added
- Initial extraction from Avileo codebase
- `core/` submodule: types, coalescing, backoff, priority, events
- `server/` submodule: SyncEngine, BaseSyncHandler, repositories, conflict resolver
- `pglite/` submodule: PgSyncQueue, PullService, change-applier
- `react/` submodule: SyncProvider, useSyncState hooks
```

### 8c. Update `packages/backend/AGENTS.md`

Add a section on the library:
```markdown
## Sync Library

The backend sync framework (`packages/backend/src/services/sync/`) is built on top of `@avileo/drizzle-sync/server`.

| Component | Library | App-specific |
|-----------|---------|--------------|
| SyncEngine | `@avileo/drizzle-sync/server` | Config with Drizzle db |
| BaseSyncHandler | `@avileo/drizzle-sync/server` | Concrete handlers extend it |
| Repositories | `@avileo/drizzle-sync/server` | Drizzle implementations |
| ConflictResolver | `@avileo/drizzle-sync/server` | Entity-specific resolvers |
```

Also add an import rule: `SyncService` and handlers should import from `@avileo/drizzle-sync/server` not from local framework files.

### 8d. Update `packages/app/AGENTS.md`

Add library reference to the sync section, noting which components come from the library vs. app-specific implementations.

### 8e. Update `CLAUDE.md`

Add `@avileo/drizzle-sync` to the Package Documentation Map:
```markdown
| `@avileo/drizzle-sync` | `packages/drizzle-sync/README.md` | Sync library |
```

## Completion Criteria

- `packages/drizzle-sync/README.md` exists with quick start for both backend and frontend
- `packages/drizzle-sync/CHANGELOG.md` exists with initial version
- Backend AGENTS.md documents the library consumption pattern
- CLAUDE.md includes the library in the package map

## Validation

- README is readable and correct (manual review)
- AGENTS.md references are accurate (typecheck not required for markdown)

## Risks or Notes

- Do not document internal implementation details that are likely to change. Focus on public API and integration patterns.
