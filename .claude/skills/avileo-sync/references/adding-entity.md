# Adding New Entity to Sync

## Overview

This guide explains how to add a new entity type to the sync system. Follow these steps in order.

## The 14 Sync Entities

The current entities are: `customers`, `sales`, `sale_items`, `abonos`, `distribuciones`, `products`, `product_variants`, `tags`, `customer_tags`, `purchases`, `purchase_items`, `customer_groups`, `customer_group_members`, `visitas`, `suppliers`.

If adding a new one, follow all steps below.

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

    // REQUIRED: Version column for conflict detection
    version: integer("version").notNull().default(1),

    // REQUIRED: Sync status
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),

    // REQUIRED: Sync attempts
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // OPTIONAL: For parent entities with children
    syncGroupId: varchar("sync_group_id", { length: 100 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // ... other indexes ...
    index("idx_visits_business_id").on(table.businessId),
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

    // REQUIRED: Version column (use integer for PGlite)
    version: integer("version").notNull().default(1),

    // REQUIRED: Sync status (use text instead of enum for PGlite compatibility)
    syncStatus: text("sync_status").notNull().default("synced"),

    // REQUIRED: Sync attempts
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

## Step 2: Update Shared Sync Config

### 2.1 Add to SYNC_ENTITIES

**Location**: `packages/shared/src/sync-config.ts:8-24`

```typescript
export const SYNC_ENTITIES = [
  // ... existing entities ...
  "new_entity",
] as const;
```

### 2.2 Add to ENTITY_PRIORITIES

**Location**: `packages/shared/src/sync-config.ts:33-52`

```typescript
export const ENTITY_PRIORITIES: Partial<Record<SyncEntity, number>> = {
  // ... existing ...
  // Tier 1 for parent, Tier 2 for child
  new_entity: 1,
};
```

### 2.3 Add to SYNC_STATUS_TRACKED (if entity tracks sync_status)

**Location**: `packages/shared/src/sync-config.ts:55-64`

```typescript
export const SYNC_STATUS_TRACKED = [
  // ... existing ...
  "new_entity",
] as const;
```

### 2.4 Add to SELF_HEAL_INSERTABLE (if entity supports self-heal)

**Location**: `packages/shared/src/sync-config.ts:67-76`

```typescript
export const SELF_HEAL_INSERTABLE = [
  // ... existing ...
  "new_entity",
] as const;
```

## Step 3: Create Backend Handler

### 3.1 Create Handler File

**Location**: `packages/backend/src/services/sync/handlers/VisitSyncHandler.ts`

```typescript
import { BaseSyncHandler } from "./BaseSyncHandler";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";

export class VisitSyncHandler extends BaseSyncHandler {
  readonly entityType = "visitas";

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    try {
      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation, tx);
      } else if (operation.operation === "update") {
        await this.handleUpdate(ctx, operation, tx);
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation, tx);
      } else {
        throw new Error(`Unsupported action: ${operation.operation}`);
      }
      this.logSuccess(ctx, operation);
      return this.createSuccessResult(operation);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logError(ctx, operation, err);
      return this.createErrorResult(operation, err.message);
    }
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

  private async handleCreate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    // Use the repository for actual DB operations
    const { visitas } = await import("../../../db/schema/visits");
    const { eq, and } = await import("drizzle-orm");

    await this.repoCreate(ctx, operation, visitas, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const { visitas } = await import("../../../db/schema/visits");
    await this.repoUpdate(ctx, operation, visitas, tx);
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const { visitas } = await import("../../../db/schema/visits");
    await this.repoDelete(ctx, operation, visitas, tx);
  }
}
```

See `BaseSyncHandler` at `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` for inherited helper methods (`repoCreate`, `repoUpdate`, `repoDelete`, `repoFindById`).

### 3.2 Register Handler

**Location**: `packages/backend/src/services/sync/sync.service.ts:42-101`

```typescript
// In registerHandlers method:
HandlerRegistry.register("visitas", () => {
  return new VisitSyncHandler(deps.visitaRepo);
});
```

### 3.3 Add Zod Schema (if validation needed)

**Location**: `packages/backend/src/services/sync/schemas/index.ts`

```typescript
export const visitaCreateSchema = z.object({
  customerId: z.string().min(1),
  distribucionId: z.string().min(1),
  // ... other fields
});
```

### 3.4 Add Conflict Resolver

**Location**: `packages/backend/src/services/sync/framework/ConflictResolver.ts`

```typescript
// Add to imports at top
import { visitas } from "../../../db/schema/visits";

// Add new resolver class (extends BaseVersionConflictResolver)
class VisitaConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Visita"; }
  protected getTable() { return visitas; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      customerId: record.customerId,
      distribucionId: record.distribucionId,
      status: record.status,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

// Add to resolvers map:
visitas: new VisitaConflictResolver(),
```

### 3.5 Update API Entity Types

**Location**: `packages/backend/src/api/sync.ts:63-68`

```typescript
const entityLiterals = SYNC_ENTITIES.map((entity) => t.Literal(entity)) as [
  ReturnType<typeof t.Literal>,
  ...ReturnType<typeof t.Literal>[],
];
// SYNC_ENTITIES already includes all entities — no manual update needed
```

## Step 4: Create Frontend Service

### 4.1 Create Service

**Location**: `packages/app/app/lib/services/visit-service.ts`

```typescript
import { BaseService, type EntityType } from "./base-service";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { SyncService } from "../sync/sync-service";
import { visitas } from "@avileo/shared";

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
    return "visitas";
  }

  getEntityPrefix(): string {
    return "vis";
  }

  async createVisit(data: CreateVisitInput): Promise<Visita> {
    const id = this.generateId();
    const syncGroupId = this.generateSyncGroup();

    const visit = {
      id,
      businessId: this.businessId,
      customerId: data.customerId,
      distribucionId: data.distribucionId,
      // ... other fields
      syncStatus: "pending" as const,
      syncAttempts: 0,
      version: 1,
    };

    await this.pg.insert(visitas).values(visit);
    await this.queueSync("create", id, visit, syncGroupId);

    return visit;
  }
}
```

### 4.2 Register Entity Type

**Location**: `packages/app/app/lib/services/base-service.ts`

```typescript
export type EntityType =
  | "customers"
  | "sales"
  // ... existing ...
  | "visitas";
```

## Checklist

- [ ] Backend schema has `version`, `sync_status`, `sync_attempts`
- [ ] Shared schema has same fields
- [ ] Added to `SYNC_ENTITIES` in `packages/shared/src/sync-config.ts`
- [ ] Added to `ENTITY_PRIORITIES` in `packages/shared/src/sync-config.ts`
- [ ] Backend handler created in `handlers/`
- [ ] Handler registered in `SyncService.registerHandlers()`
- [ ] Conflict resolver added to `ConflictResolver.ts`
- [ ] Frontend service created extending `BaseService`
- [ ] Entity type added to `EntityType`
