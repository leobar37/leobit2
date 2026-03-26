---
name: avileo-sync
description: |
  Analyze, debug, and extend Avileo's offline-first sync engine. Use when:
  - Finding bugs in sync operations, syncGroupId, or conflict resolution
  - Adding new entities to the sync system
  - Creating new sync flows for sales, purchases, or other entities
  - Debugging "sync pending", "sync failed", or "conflict" issues
  - Understanding how syncGroupId groups operations
  - Adding new sync handlers on backend
  - Questions about sync status fields or schema declarations

  Covers: push sync, pull sync, syncGroupId, operation sorting, handlers,
  conflict resolution, and schema requirements. Sync hooks are disabled.
allowed-tools: Read, Grep, Glob, Bash
---

# Avileo Sync Engine Skill

This skill provides comprehensive knowledge about Avileo's offline-first synchronization system.

## Quick Reference

### Sync Group ID Function
**Location**: `packages/app/app/lib/services/base-service.ts:140-142`

```typescript
protected generateSyncGroup(): string {
  return crypto.randomUUID();
}
```

**Purpose**: Groups related operations (sale + items + payments) so they:
1. Are sent together in a single batch
2. Are processed in correct dependency order (parent before child)

### Entity Priority Map (Backend)
**Location**: `packages/backend/src/services/sync/framework/OperationSorter.ts:9-18`

```typescript
private entityPriority: Record<string, number> = {
  sales: 1,
  sale_items: 2,
  customer_groups: 3,
  customer_group_members: 4,
  purchases: 1,
  purchase_items: 2,
  distribucion: 1,
  distribucion_items: 2,
};
```

### Key Files

| Component | File | Key Lines |
|-----------|------|-----------|
| Sync Service (client) | `packages/app/app/lib/sync/sync-service.ts` | 570-634 (grouping logic) |
| BaseService | `packages/app/app/lib/services/base-service.ts` | 140-189 |
| SaleService | `packages/app/app/lib/services/sale-service.ts` | 366, 406, 433 |
| SyncEngine (backend) | `packages/backend/src/services/sync/framework/SyncEngine.ts` | 60-177 |
| OperationSorter | `packages/backend/src/services/sync/framework/OperationSorter.ts` | 20-41 |
| Sync API | `packages/backend/src/api/sync.ts` | 20-156 |

## Required Fields for Sync

### 1. All Sync-Capable Tables Need
| Field | Type | Purpose |
|-------|------|---------|
| `sync_status` | text | `pending`, `synced`, `error` |
| `sync_attempts` | integer | Number of sync attempts |

### 2. Parent Tables Need (for grouping)
| Table | Column | Purpose |
|-------|--------|---------|
| `sales` | `sync_group_id` | Groups sale + items + payments |
| `purchases` | `sync_group_id` | Groups purchase + items |

### 3. Frontend sync_operations Table
```sql
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  sync_group_id TEXT,
  operation TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Schema Declaration Locations

| Schema Type | Location |
|-------------|----------|
| Shared (PGlite + PG) | `packages/shared/src/schema.ts` |
| Backend DB | `packages/backend/src/db/schema/*.ts` |
| Zod Validation | `packages/backend/src/services/sync/schemas/index.ts` |
| API Body | `packages/backend/src/api/sync.ts:121-155` |

## Adding New Entity to Sync

### Steps
1. **Backend Schema**: Add `sync_status`, `sync_attempts` to table
2. **Shared Schema**: Add same fields to `packages/shared/src/schema.ts`
3. **Create Handler**: `packages/backend/src/services/sync/handlers/[Entity]SyncHandler.ts`
4. **Register Handler**: Update `packages/backend/src/services/sync/framework/HandlerRegistry.ts`
5. **Add Priority**: Update `entityPriority` in OperationSorter.ts
6. **Frontend Service**: Use `queueSync()` with `syncGroupId` for parent entities

### Handler Template
```typescript
// packages/backend/src/services/sync/handlers/NewEntitySyncHandler.ts
import { BaseSyncHandler } from "./BaseSyncHandler";
import type { ISyncHandlerDeps } from "../framework/types";

export class NewEntitySyncHandler extends BaseSyncHandler {
  readonly entityType = "new_entities";

  async validateBusinessRules(
    ctx: RequestContext,
    payload: Record<string, unknown>
  ): Promise<void> {
    // Add entity-specific validation
  }

  async executeInsert(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<SyncHandlerResult> {
    // Insert logic
  }

  async executeUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<SyncHandlerResult> {
    // Update logic
  }

  async executeDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<SyncHandlerResult> {
    // Delete logic
  }
}
```

## Common Issues

### 1. Operations not being grouped
- Check if `syncGroupId` is being passed to `queueSync()`
- Ensure parent entity is created before children

### 2. Sync hook blocking valid operations
- **NOTE**: Sync hooks are disabled. The `registry.ts` returns `allow: true` for all operations. If you need hooks in the future, re-implement using `createSyncHook()`.

### 3. Conflict not resolving
- Check `packages/backend/src/services/sync/framework/ConflictResolver.ts`
- Ensure version field is incrementing on updates

## Debugging Commands

```bash
# Check pending sync operations (client)
# In browser console or dev tools:
await syncService.getStatus()
await syncService.logDetailedStatus()

# Check failed operations
await syncService.getFailedOperations()

# Retry a failed operation
await syncService.retryOperation(operationId)

# Force process pending
await syncService.processPending()
```

## For Detailed Information

- [Architecture Overview](references/overview.md)
- [Sync Group ID Deep Dive](references/sync-group-id.md)
- [Adding New Entity to Sync](references/adding-entity.md)
- [Troubleshooting Guide](references/troubleshooting.md)
- [Code Examples](examples/sync-flow-examples.md)
