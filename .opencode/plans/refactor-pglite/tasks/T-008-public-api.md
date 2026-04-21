# T-008: Create New Public API

## Objective
Create new pglite/index.ts that exports new domain APIs while maintaining backward compatibility where possible.

## Requirements Addressed
- FR-009: Public API Preservation

## Files to Create/Modify

### Create
- `packages/drizzle-sync/src/pglite/types.ts` (new consolidated types)
- `packages/drizzle-sync/src/pglite/index.ts` (new public API)

### Delete (after T-009)
- Old `packages/drizzle-sync/src/pglite/index.ts` (if exists at root)

## Implementation Details

### New types.ts (consolidated)
```typescript
// pglite/types.ts - re-exports from domain modules
export type {
  // From domain/change
  ApplyResult,
  BatchApplyResult,
  ApplierOptions,
  ChangeApplier,
} from "./domain/change";

export type {
  // From domain/queue
  QueueOptions,
  PgSyncQueue,
} from "./domain/queue";

export type {
  // From domain/push
  PushResult,
  PushServiceOptions,
  PushSyncService,
} from "./domain/push";

export type {
  // From domain/pull
  PullResult,
  PullServiceOptions,
  PullSyncService,
  CursorStorage,
} from "./domain/pull";

// Re-export existing core types for convenience
export type {
  PullChange,
  PullResponse,
  PullStatus,
} from "../core";
```

### New index.ts
```typescript
// pglite/index.ts

// Domain exports - new APIs
export { ChangeApplier } from "./domain/change";
export { PgSyncQueue } from "./domain/queue";
export { PushSyncService } from "./domain/push";
export { PullSyncService, LocalStorageCursorStorage, MemoryCursorStorage } from "./domain/pull";

// Infra exports
export { createSqlExecutor, type SqlExecutor } from "./infra";

// Config exports
export { REQUIRED_COLUMN_DEFAULTS } from "./config";

// Types
export type {
  ApplyResult,
  BatchApplyResult,
  PushResult,
  PullResult,
  CursorStorage,
  // ... all types
} from "./types";

// Re-export core types for convenience
export type {
  PullChange,
  PullResponse,
  PullStatus,
  ISyncQueue,
  ISyncHttpClient,
  ISyncLogger,
  ISyncMutex,
} from "../core";

// Note: Old APIs (applyChange, SyncService, PullService) intentionally NOT exported
// Users should migrate to new class-based APIs
```

## Breaking Changes Documentation

The new index.ts intentionally does NOT export:
- `applyChange` function (use `ChangeApplier` class)
- `applyChangesBatch` function (use `ChangeApplier.applyBatch`)
- Old `SyncService` class (use `PushSyncService`)
- Old `PullService` class (use `PullSyncService`)

Users must update their imports when upgrading.

## Verification Steps
```bash
# Type check
cd packages/drizzle-sync && bun run typecheck

# Build
cd packages/drizzle-sync && bun run build

# Verify exports are accessible
# (Check that all exports can be imported)
```

## Dependencies
- **T-003**: ChangeApplier exports
- **T-004**: Queue exports
- **T-005**: PushSyncService exports
- **T-006**: PullSyncService exports

## Deliverables
1. New `types.ts` with consolidated type exports
2. New `index.ts` with all public exports
3. Clear separation of new vs old APIs

## Acceptance Criteria
- [ ] All new domain classes exported
- [ ] Types properly re-exported
- [ ] Core types re-exported for convenience
- [ ] Old function-based APIs NOT exported
- [ ] No naming conflicts
- [ ] Build succeeds
