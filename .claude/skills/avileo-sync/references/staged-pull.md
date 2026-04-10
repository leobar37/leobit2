# 3-Stage Pull Strategy

## Overview

The sync system uses a 3-stage pull strategy to prioritize essential data while loading historical data in the background. This ensures the app is usable quickly while still getting complete data.

## Stage Configuration

**Location**: `packages/shared/src/sync-stages.ts`

```typescript
export const SYNC_STAGES = {
  CRITICAL: {
    name: "CRITICAL" as const,
    entities: ["customers", "products", "product_variants"] as const,
    lookbackDays: 30,
    description: "Datos de referencia esenciales",
    blocking: true,  // App cannot function until this stage completes
  },

  RECENT_SALES: {
    name: "RECENT_SALES" as const,
    entities: ["sales", "sale_items"] as const,
    lookbackDays: 7,
    description: "Ventas recientes",
    blocking: true,  // App cannot function until this stage completes
  },

  HISTORICAL: {
    name: "HISTORICAL" as const,
    entities: [
      "abonos",
      "purchases",
      "purchase_items",
      "distribuciones",
      "distribucion_items",
      "suppliers",
      "visitas",
      "tags",
      "customer_tags",
      "customer_groups",
      "customer_group_members",
    ] as const,
    lookbackDays: null,  // Full historical data
    description: "Histórico completo",
    blocking: false,  // Background, app is usable during this stage
  },
};
```

## Stage Execution

**Location**: `packages/app/app/lib/sync/staged-pull-coordinator.ts`

```typescript
async executeStagedPull(): Promise<void> {
  // Stage 1: CRITICAL - block UI
  await this.pullWithOptions({
    entityTypes: ["customers", "products", "product_variants"],
    since: thirtyDaysAgo,
  });

  // Stage 2: RECENT_SALES - block UI
  await this.pullWithOptions({
    entityTypes: ["sales", "sale_items"],
    since: sevenDaysAgo,
  });

  // Stage 3: HISTORICAL - background, non-blocking
  this.pullWithOptions({
    entityTypes: allHistoricalEntities,
    // No since = full history, loaded in background
  });
}
```

## Key Concepts

### Blocking Stages
- App shows loading indicator until CRITICAL and RECENT_SALES complete
- User cannot interact with the app during blocking stages
- Ensures core reference data (customers, products) and recent sales are available immediately

### Non-Blocking (Background) Stage
- HISTORICAL loads in background while user can interact
- Useful for older abonos, purchases, distributions, visits
- If user navigates to historical data before it's loaded, a loading state is shown

### Lookback Windows
- **30 days** for CRITICAL: Catches recently accessed customers/products
- **7 days** for RECENT_SALES: Current week's transactions
- **Full history** for HISTORICAL: Complete record for audit/history screens

## Stage Cursor Management

Each stage maintains its own cursor in localStorage:

```typescript
// Stored separately per stage
localStorage.setItem('pglite_sync_cursor_CRITICAL', cursor);
localStorage.setItem('pglite_sync_cursor_RECENT_SALES', cursor);
localStorage.setItem('pglite_sync_cursor_HISTORICAL', cursor);

// Or use the default cursor key for the main cursor
this.saveStageCursor(stageKey, nextSince);
```

## Integration with PullService

**Location**: `packages/app/app/lib/sync/pull-service.ts:230-244`

```typescript
// Pull with specific options (for staged loading)
async pullWithOptions(options: {
  entityTypes?: string[];
  since?: string;
  limit?: number;
  cursorKey?: string;
}): Promise<PullResult & { nextSince: string | null }> {
  return this.executePull({
    entityTypes: options.entityTypes,
    since: options.since,
    limit: options.limit,
    cursorKey: options.cursorKey,
    useDefaultCursor: false,  // Use stage-specific cursor
    applyBackoff: false,      // No backoff for staged pulls
  });
}
```

## When to Use Staged Pull

| Scenario | Approach |
|----------|----------|
| Initial app load (first login) | Full 3-stage pull |
| Subsequent app loads | Regular `pull()` using main cursor |
| Manual refresh | Regular `pull()` |
| Background sync | Regular `pull()` |

## SyncCoordinator and Staged Pull

**Location**: `packages/app/app/lib/sync/coordinator.ts`

The `SyncCoordinator` manages regular auto-pull via `PullService`. Staged pull is typically used during onboarding or initial sync:

```typescript
// In app initialization:
const stagedCoordinator = new StagedPullCoordinator(pg, db, syncService, pullService, businessId);
await stagedCoordinator.executeStagedPull();

// After initial sync, regular auto-pull takes over:
coordinator.start();
```

## Helper Functions

**Location**: `packages/shared/src/sync-stages.ts`

```typescript
// Get entities for a specific stage
getEntitiesForStage("CRITICAL")  // ["customers", "products", "product_variants"]

// Get all entities across all stages
getAllStagedEntities()  // All 14 entities

// Check which stage an entity belongs to
getStageForEntity("sales")  // "RECENT_SALES"
getStageForEntity("abonos")  // "HISTORICAL"
```

## Database Query for Staged Sync

When `since` is provided, the server applies lookback:

```typescript
// In getChanges(), for CRITICAL/RECENT_SALES:
if (since && lookbackDays) {
  const lookbackDate = subDays(new Date(), lookbackDays);
  baseConditions.push(gte(syncOperations.processedAt, lookbackDate));
}

// For HISTORICAL (no lookback):
// No since filter = full history
```

## Monitoring Stage Progress

```typescript
// Check which stages have completed
const status = await stagedPullCoordinator.getStageStatus();
// { CRITICAL: "completed", RECENT_SALES: "in_progress", HISTORICAL: "pending" }
```
