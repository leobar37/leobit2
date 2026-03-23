# Adding New Entity to Sync

## Overview

This guide explains how to add a new entity type to the sync system. Follow these steps in order.

## Step 1: Update Database Schemas

### 1.1 Backend Schema

**Location**: `packages/backend/src/db/schema/`

Add sync fields to your entity's schema file:

```typescript
// Example for a new "visits" table
import { syncStatusEnum } from "./enums";

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),

    // ... other fields ...

    // REQUIRED: Sync fields
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // OPTIONAL: For parent entities with children
    syncGroupId: varchar("sync_group_id", { length: 100 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // ... other indexes ...
    index("idx_visits_sync_status").on(table.syncStatus),
    // If using syncGroupId:
    index("idx_visits_sync_group_id").on(table.syncGroupId),
  ]
);
```

### 1.2 Shared Schema

**Location**: `packages/shared/src/schema.ts`

Add the same fields for PGlite compatibility:

```typescript
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),

    // ... other fields ...

    // REQUIRED: Sync fields (use text instead of enum for PGlite)
    syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // OPTIONAL: For parent entities
    syncGroupId: varchar("sync_group_id", { length: 100 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  // ... indexes ...
);
```

### 1.3 Database Migration

If using migrations (not push):

```bash
cd packages/backend
bun run db:generate
bun run db:migrate
```

Or for development with push:

```bash
cd packages/backend
bun run db:push
```

## Step 2: Create Backend Handler

### 2.1 Create Handler File

**Location**: `packages/backend/src/services/sync/handlers/VisitSyncHandler.ts`

```typescript
import { BaseSyncHandler, type SyncHandlerResult } from "./BaseSyncHandler";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { ISyncHandlerDeps } from "../framework/types";
import { visits } from "../../../db/schema/visits";
import { eq, and } from "drizzle-orm";

export class VisitSyncHandler extends BaseSyncHandler {
  readonly entityType = "visits";

  constructor(deps: ISyncHandlerDeps) {
    super(deps);
  }

  async validateBusinessRules(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string
  ): Promise<void> {
    // Add entity-specific validation
    if (operation === "create" || operation === "update") {
      if (!payload.customerId) {
        throw new Error("Visit requires customerId");
      }
      if (!payload.distribucionId) {
        throw new Error("Visit requires distribucionId");
      }
    }
  }

  async executeInsert(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<SyncHandlerResult> {
    const { idempotencyKey, entityId, payload } = operation;

    // Check if already exists (idempotency)
    const existing = await tx
      .select()
      .from(visits)
      .where(and(eq(visits.id, entityId), eq(visits.businessId, ctx.businessId)))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: true,
        idempotencyKey,
        serverTimestamp: new Date().toISOString(),
      };
    }

    // Insert new record
    await tx.insert(visits).values({
      id: entityId,
      businessId: ctx.businessId,
      customerId: payload.customerId,
      distribucionId: payload.distribucionId,
      // ... other fields from payload
      syncStatus: "synced",
    });

    return {
      success: true,
      idempotencyKey,
      serverTimestamp: new Date().toISOString(),
    };
  }

  async executeUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<SyncHandlerResult> {
    const { idempotencyKey, entityId, payload } = operation;

    const existing = await tx
      .select()
      .from(visits)
      .where(and(eq(visits.id, entityId), eq(visits.businessId, ctx.businessId)))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Visit not found");
    }

    // Update with version check for optimistic locking
    await tx
      .update(visits)
      .set({
        // ... update fields from payload
        syncStatus: "synced",
      })
      .where(and(eq(visits.id, entityId), eq(visits.businessId, ctx.businessId)));

    return {
      success: true,
      idempotencyKey,
      serverTimestamp: new Date().toISOString(),
    };
  }

  async executeDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<SyncHandlerResult> {
    const { idempotencyKey, entityId } = operation;

    await tx
      .delete(visits)
      .where(and(eq(visits.id, entityId), eq(visits.businessId, ctx.businessId)));

    return {
      success: true,
      idempotencyKey,
      serverTimestamp: new Date().toISOString(),
    };
  }
}
```

### 2.2 Register Handler

**Location**: `packages/backend/src/services/sync/framework/HandlerRegistry.ts`

```typescript
import { VisitSyncHandler } from "../handlers/VisitSyncHandler";

// In getHandler function:
case "visits":
  return new VisitSyncHandler(deps);
```

### 2.3 Update Entity Priority

**Location**: `packages/backend/src/services/sync/framework/OperationSorter.ts`

```typescript
private entityPriority: Record<string, number> = {
  // ... existing entries ...
  visits: 2,  // Add priority for new entity
};
```

### 2.4 Add Zod Schema (if validation needed)

**Location**: `packages/backend/src/services/sync/schemas/index.ts`

```typescript
export const visitCreateSchema = z.object({
  customerId: z.string().min(1),
  distribucionId: z.string().min(1),
  // ... other fields
});
```

### 2.5 Update API Entity Types

**Location**: `packages/backend/src/api/sync.ts:125-140`

```typescript
entityType: t.Union([
  // ... existing types ...
  t.Literal("visits"),
]),
```

## Step 3: Create Frontend Service

### 3.1 Create Service

**Location**: `packages/app/app/lib/services/visit-service.ts`

```typescript
import { BaseService, type EntityType } from "./base-service";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { SyncService } from "../sync/sync-service";
import { visits } from "@avileo/shared";

export class VisitService extends BaseService {
  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  getEntityType(): EntityType {
    return "visits";
  }

  getEntityPrefix(): string {
    return "vis";
  }

  async createVisit(data: CreateVisitInput): Promise<Visit> {
    const id = this.generateId();
    const syncGroupId = this.generateSyncGroup(); // If grouping with parent

    const visit = {
      id,
      businessId: this.businessId,
      customerId: data.customerId,
      distribucionId: data.distribucionId,
      // ... other fields
      syncStatus: "pending" as const,
      syncAttempts: 0,
    };

    // Insert locally
    await this.pg.insert(visits).values(visit);

    // Queue for sync
    await this.queueSync("insert", id, visit, syncGroupId);

    return visit;
  }
}
```

### 3.2 Register Entity Type

**Location**: `packages/app/app/lib/services/base-service.ts`

```typescript
export type EntityType =
  | "customers"
  | "sales"
  // ... existing ...
  | "visits";  // Add new entity type
```

## Step 4: Add Sync Hook (Optional)

**Location**: `packages/app/app/lib/sync/hooks/visits.ts`

```typescript
import { createHook, type SyncHookContext } from "../create-sync-hook";

export const visitSyncHook = createHook("visits")
  .onBeforeSync(async (context: SyncHookContext, options) => {
    // Validation logic
    if (context.operation === "insert") {
      if (!context.data.customerId) {
        return { allow: false, reason: "Visit requires customer" };
      }
    }
    return { allow: true };
  })
  .build();
```

**Location**: `packages/app/app/lib/sync/registry.ts`

```typescript
const registeredHooks: SyncHook[] = [
  saleSyncHook,
  // purchaseSyncHook,
  visitSyncHook,  // Add new hook
];
```

## Step 5: Update Type Exports

### 5.1 Backend Types

**Location**: `packages/backend/src/services/sync/types.ts`

```typescript
export type SyncEntity =
  | "customers"
  | "sales"
  // ... existing ...
  | "visits";
```

### 5.2 Frontend Types

**Location**: `packages/app/app/lib/sync/types.ts`

```typescript
export type SyncOperation = "insert" | "update" | "delete" | "create";
```

## Checklist

- [ ] Backend schema has `sync_status` and `sync_attempts`
- [ ] Shared schema has same fields
- [ ] Backend handler created in `handlers/`
- [ ] Handler registered in `HandlerRegistry`
- [ ] Entity priority added to `OperationSorter`
- [ ] API entity types updated
- [ ] Frontend service created extending `BaseService`
- [ ] Entity type added to `EntityType`
- [ ] Sync hook created (optional but recommended)
- [ ] Type exports updated in both backend and frontend
