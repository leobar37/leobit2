# Conflict Resolution

## Overview

The sync engine uses **version-based conflict detection** to identify when the same entity was modified on multiple devices simultaneously. When detected, the conflict is persisted for resolution.

## Conflict Detection Flow

```
1. Client sends operation with localVersion
2. Server checks: serverVersion > localVersion?
3. If yes → conflict detected → persist to sync_conflicts → return conflict to client
4. If no → apply operation → return success
```

## Version-Based Detection

**Location**: `packages/backend/src/services/sync/framework/ConflictResolver.ts`

All conflict resolvers extend `BaseVersionConflictResolver`:

```typescript
abstract class BaseVersionConflictResolver implements IConflictResolver {
  async checkConflict(ctx, operation, tx): Promise<ConflictCheckResult> {
    if (operation.operation === "create" || operation.operation === "delete") {
      return { hasConflict: false };  // No conflict for create/delete
    }

    const record = await queryApi.findFirst({
      where: and(
        eq(table[idField], operation.entityId),
        eq(table[businessIdField], ctx.businessId)
      ),
    });

    if (!record) return { hasConflict: false };

    const serverVersion = record[versionField];
    const localVersion = operation.localVersion ?? 1;

    if (serverVersion > localVersion) {
      return {
        hasConflict: true,
        serverVersion,
        serverData: this.getServerDataFields(record),
      };
    }

    return { hasConflict: false };
  }
}
```

## Per-Entity Resolvers

Each entity has its own conflict resolver in `ConflictResolver.ts`:

| Entity | Resolver | Notes |
|--------|----------|-------|
| `customers` | `CustomerConflictResolver` | Standard version-based |
| `sales` | `VersionConflictResolver` | Standard version-based |
| `sale_items` | `SaleItemConflictResolver` | **Delegates to parent sale's version** |
| `abonos` | `AbonoConflictResolver` | Standard version-based |
| `products` | `ProductConflictResolver` | Standard version-based |
| `product_variants` | `ProductVariantConflictResolver` | Uses `productVariants` query relation |
| `tags` | `TagConflictResolver` | Standard version-based |
| `customer_tags` | `CustomerTagConflictResolver` | Uses `customerTags` query relation |
| `customer_groups` | `CustomerGroupConflictResolver` | Uses `customerGroups` query relation |
| `customer_group_members` | `CustomerGroupMemberConflictResolver` | Uses `customerGroupMembers` relation |
| `visitas` | `VisitaConflictResolver` | Standard version-based |
| `purchases` | `PurchaseConflictResolver` | Standard version-based |
| `purchase_items` | `PurchaseItemConflictResolver` | Uses `purchaseItems` query relation |
| `suppliers` | `SupplierConflictResolver` | Standard version-based |

## Sale Items Special Case

**Location**: `packages/backend/src/services/sync/framework/ConflictResolver.ts:466-524`

Sale items don't have independent versioning — they use their parent sale's version:

```typescript
class SaleItemConflictResolver implements IConflictResolver {
  async checkConflict(ctx, operation, tx): Promise<ConflictCheckResult> {
    // Get the sale item
    const item = await tx.query.saleItems.findFirst({ where: ... });

    // Get the parent sale for version checking
    const sale = await tx.query.sales.findFirst({ where: ... });

    // Use parent sale's version for conflict detection
    if (sale.version > operation.localVersion) {
      return {
        hasConflict: true,
        serverVersion: sale.version,
        serverData: { /* item fields */ },
      };
    }

    return { hasConflict: false };
  }
}
```

**Implication**: A sale item update can be flagged as conflict if the parent sale was independently modified on another device. This may produce false positives for certain edit patterns.

## Conflict Resolution Strategies

### Client-Side (SyncService)

**Location**: `packages/app/app/lib/sync/sync-service.ts:594-660`

```typescript
async resolveConflict(
  operationId: string,
  resolution: ConflictStrategy,
  mergedData?: Record<string, unknown>
): Promise<boolean> {
  switch (resolution) {
    case CONFLICT_STRATEGY.SERVER_WINS:
      // Just mark as completed, discard local
      await this.markCompleted(operationId);
      return true;

    case CONFLICT_STRATEGY.CLIENT_WINS:
      // Retry with local data (or merged data)
      await this.markProcessing(operationId);
      const result = await this.syncOperation({ ...op, payload: mergedData || parsePayload(op.payload) });
      if (result.success) {
        await this.markCompleted(operationId);
        return true;
      }
      return false;

    case CONFLICT_STRATEGY.FIELD_MERGE:
      // Apply merged data from UI
      await this.markProcessing(operationId);
      const result = await this.syncOperation({ ...op, payload: mergedData });
      if (result.success) {
        await this.markCompleted(operationId);
        return true;
      }
      return false;

    case CONFLICT_STRATEGY.MANUAL:
      // Don't auto-resolve, show UI to user
      return false;
  }
}
```

### Server-Side (Admin API)

**Location**: `packages/backend/src/api/sync.ts:379-455`

```typescript
.post("/conflicts/:id/resolve", async ({ ctx, params, body }) => {
  const conflict = await conflictRepo.findById(ctx, params.id);

  if (conflict.status !== "pending") {
    return { error: { code: "ALREADY_RESOLVED", ... } };
  }

  const resolvedConflict = await conflictRepo.resolve(ctx, params.id, {
    resolution: body.resolution,  // "server" | "local" | "merge"
    mergedData: body.mergedData,
  });

  return { success: true, data: resolvedConflict };
})
```

## Conflict Data Stored

**Location**: `packages/backend/src/db/schema/sync-conflicts.ts`

```typescript
interface SyncConflict {
  id: string;
  businessId: string;
  operationId: string;      // Idempotency key of conflicting op
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;    // What client tried to push
  serverData: Record<string, unknown>;  // What's currently on server
  localVersion: number;
  serverVersion: number;
  sourceDeviceId?: string;
  sourceFingerprint?: string;
  status: "pending" | "resolved";
  resolution?: "server" | "local" | "merge";
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}
```

## Listing and Resolving Conflicts

```typescript
// List pending conflicts
GET /sync/conflicts?status=pending&entityType=sales&limit=50&offset=0

// Get single conflict
GET /sync/conflicts/:id

// Resolve conflict
POST /sync/conflicts/:id/resolve
{
  "resolution": "merge",  // or "server" or "local"
  "mergedData": { /* fields to keep from each side */ }
}
```

## Backend Conflict Resolution (sync_conflicts table)

**Location**: `packages/backend/src/services/sync/framework/SyncConflictRepository.ts`

When a conflict is resolved as "server", the local operation is marked completed (server data wins).
When resolved as "local", the operation is retried with merged data.
When resolved as "merge", the provided merged data is applied.

## Composite Cursor for Stable Pagination

The `SaleItemConflictResolver` delegates to parent sale version because sync operations are ordered by `(processedAt, operationId)`. A sale item operation could have a different `processedAt` than its parent sale, making separate version tracking unreliable without the composite cursor.

## Self-Heal vs Conflict

- **Self-heal**: An `update` operation gets `RECORD_NOT_FOUND` → converts to `create` (for `SELF_HEAL_INSERTABLE` entities)
- **Conflict**: An `update` finds a record but with a higher version → persists conflict for resolution

These are different failure modes with different recovery paths.
