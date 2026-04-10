# Pull Sync Mechanics

## Overview

Pull sync fetches changes from the server and applies them to the local PGlite database. It uses a cursor-based pagination strategy to track position.

## Cursor Format

**New format (current)**: `${processedAt.toISOString()}_${operationId}`
- Example: `2026-03-07T18:07:41.784Z_op-abc123`
- Provides stable pagination even when multiple ops have the same timestamp
- Allows deterministic resume point

**Legacy format (still supported)**: ISO 8601 timestamp only
- Server detects legacy format and handles gracefully
- Logged as `Legacy cursor format detected`

## Key Files

| File | Purpose |
|------|---------|
| `packages/app/app/lib/sync/pull-service.ts` | Pull execution, cursor management, stale detection |
| `packages/app/app/lib/sync/change-applier.ts` | Applies changes to PGlite via raw SQL UPSERT |
| `packages/app/app/lib/sync/backoff.ts` | Exponential backoff for retry |
| `packages/backend/src/services/sync/sync.service.ts` | `getChanges()` — returns changes since cursor |

## Pull Execution Flow

```typescript
// packages/app/app/lib/sync/pull-service.ts:249-541

async executePull(config: PullExecutionConfig): Promise<PullResult & { nextSince: string | null }> {
  // 1. Build URL with cursor and filters
  const url = new URL(`${API_URL}/sync/changes`);
  if (cursor) url.searchParams.set("since", cursor);
  url.searchParams.set("limit", String(config.limit ?? 100));
  if (config.entityTypes) {
    url.searchParams.set("entityTypes", config.entityTypes.join(","));
  }

  // 2. Fetch from server
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}`, "x-business-id": businessId }
  });

  // 3. Parse response
  const { changes, nextSince, hasMore, serverTimestamp } = body.data;

  // 4. Save cursor BEFORE applying changes (crash-safe)
  if (nextSince) {
    this.saveCursor(nextSince);
  }

  // 5. Apply each change
  for (const change of changes) {
    await applyChange(this.pg, this.db, change, this.businessId);
  }

  // 6. Notify via callback and events
  if (entityTypes.size > 0) {
    this.onChangesApplied?.(Array.from(entityTypes));
    syncEvents.emit("pull:completed", { changesApplied, entityTypes });
  }
}
```

## Stale Pull Detection

Pull service detects two types of stuck conditions:

### Cursor Stuck
If cursor doesn't advance after consecutive pulls (with hasMore=true):
- `consecutiveStalePulls` counter increments
- After `MAX_STALE_PULLS = 3` → `isStuck = true`
- Stops auto-pull, emits `pull:stale` event

### Empty Pulls Stuck
If multiple consecutive pulls return empty changes with `hasMore=true`:
- `consecutiveEmptyPulls` counter increments
- After `MAX_EMPTY_PULLS = 5` → `isStuck = true`
- Indicates infinite loop risk (server says more data but returns none)

### Recovery
```typescript
// Manual reset
pullService.forceReset()  // Clears all state, restarts auto-pull

// Or via coordinator
coordinator.forceResetSync()  // Calls pullService.forceReset() + restarts sync
```

## Cursor Persistence

**Location**: `packages/app/app/lib/sync/pull-service.ts:93-124`

Cursor is stored in localStorage with key: `pglite_sync_cursor_<namespace>`

```typescript
private loadCursor(): void {
  const stored = localStorage.getItem(this.cursorStorageKey);
  if (stored) this.lastSince = stored;
}

private saveCursor(cursor: string): void {
  this.lastSince = cursor;
  localStorage.setItem(this.cursorStorageKey, cursor);
}

clearCursor(): void {
  this.lastSince = null;
  localStorage.removeItem(this.cursorStorageKey);
}
```

After 3 consecutive storage failures, cursor is cleared to prevent stale state.

## Auto-Pull Configuration

**Location**: `packages/app/app/lib/sync/config.ts:13`

```typescript
export const PULL_INTERVAL_MS = 10000;  // 10 seconds
```

Auto-pull is started by `SyncCoordinator`:
```typescript
// coordinator.ts:46-48
if (this.config.enableAutoSync) {
  this.pullService.startAutoPull();
}
```

## Staged Pull

For large initial syncs, `StagedPullCoordinator` coordinates 3-stage loading:

```typescript
// staged-pull-coordinator.ts
async executeStagedPull(): Promise<void> {
  // Stage 1: CRITICAL (blocking) - customers, products, variants
  await this.pullWithOptions({ entityTypes: CRITICAL_ENTITIES });

  // Stage 2: RECENT_SALES (blocking) - sales, sale_items (7 days)
  await this.pullWithOptions({ entityTypes: RECENT_SALES_ENTITIES });

  // Stage 3: HISTORICAL (background) - everything else
  this.pullWithOptions({ entityTypes: HISTORICAL_ENTITIES });  // non-blocking
}
```

See [staged-pull.md](staged-pull.md) for full details.

## On Changes Applied Callback

After changes are applied, `PullService` notifies via:

```typescript
// Set callback
pullService.setOnChangesApplied((entityTypes: string[]) => {
  // Invalidate TanStack Query cache for affected entity types
  queryClient.invalidateQueries({ queryKey: ["customers"] });
  queryClient.invalidateQueries({ queryKey: ["sales"] });
});

// Also emits sync event
syncEvents.emit("pull:completed", { changesApplied, entityTypes });
```

## Backend: GET /sync/changes

**Location**: `packages/backend/src/services/sync/sync.service.ts:111-192`

```typescript
async getChanges(
  ctx: RequestContext,
  since?: Date,
  limit = 100,
  syncGroupId?: string,
  entityTypes?: string[],
  cursorOperationId?: string
) {
  // Builds WHERE clause with:
  // - businessId = ctx.businessId
  // - status = 'processed'
  // - processedAt > since (or > cursor timestamp)
  // - entity IN (entityTypes) if provided
  // - syncGroupId = provided or null

  const operations = await db.query.syncOperations.findMany({
    where,
    orderBy: [asc(syncOperations.processedAt), asc(syncOperations.operationId)],
    limit: effectiveLimit + 1,  // fetch one extra to detect hasMore
  });

  // Composite cursor: timestamp_operationId
  const nextSince = last?.processedAt && last.operationId
    ? `${last.processedAt.toISOString()}_${last.operationId}`
    : serverTimestamp;

  return {
    changes: results.map(item => ({
      idempotencyKey: item.operationId,
      entityType: item.entity,
      operation: item.action,
      entityId: item.entityId,
      payload: item.payload,
      localTimestamp: item.clientTimestamp.toISOString(),
      processedAt: item.processedAt?.toISOString(),
    })),
    nextSince,
    hasMore,
    serverTimestamp,
  };
}
```

## Change Applier (Server → Client)

**Location**: `packages/app/app/lib/sync/change-applier.ts`

Applies changes using raw SQL UPSERT (not Drizzle, due to camelCase/snake_case mismatch):

```typescript
// For create: INSERT OR REPLACE
// For update: UPDATE ... WHERE id = $1
// For delete: DELETE FROM ... WHERE id = $1 AND business_id = $2

// Upsert behavior: if record exists, UPDATE; if not, INSERT
// Required column defaults applied for missing NOT NULL fields
```

## Key Configuration

| Constant | Value | Location |
|----------|-------|----------|
| `PULL_INTERVAL_MS` | 10000 | `config.ts` |
| `MAX_STALE_PULLS` | 3 | `config.ts` |
| `MAX_EMPTY_PULLS` | 5 | `config.ts` |
| `MAX_APPLY_RETRIES` | 3 | `change-applier.ts` |
