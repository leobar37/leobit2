# Sync Framework Documentation

> **Date:** March 2026
> **Status:** Active Implementation

---

## Overview

This document describes Avileo's sync system architecture. It covers both the **current implementation** (in production use) and a **future generator proposal** that may simplify development.

**Key principle:** The current system uses explicit, hand-written handlers with shared definitions. The generator proposal remains future work and is not required for current development.

---

## Shared Manifest Architecture

The **Shared Manifest** (`packages/shared/src/sync-manifest.ts`) is the single source of truth for all syncable entities.

### Canonical vs Local-Only Entities

Entities are divided into two categories:

| Type | Sync Direction | Storage | Example |
|------|---------------|---------|---------|
| **Canonical** | Bidirectional (client ↔ server) | Both sides | `customers`, `sales`, `abonos` |
| **Local-Only** | Client-side only | Local only | `sync_operations`, `pending_changes` |

### Manifest Structure

```typescript
// packages/shared/src/sync-manifest.ts

export interface SyncManifest {
  // Entities that sync bidirectionally
  canonicalEntities: CanonicalEntityDef[];
  
  // Entities that exist only on client
  localOnlyEntities: LocalOnlyEntityDef[];
  
  // Cross-cutting sync configuration
  config: {
    batchSize: number;
    retryAttempts: number;
    conflictStrategy: ConflictStrategy;
  };
}

export interface CanonicalEntityDef {
  name: string;                    // Entity type identifier
  table: string;                   // Database table name
  primaryKey: string;              // UUID field name
  syncGroupCapable: boolean;       // Can use sync_group_id
  conflictStrategy: 'timestamp' | 'version' | 'none';
  parentEntity?: string;           // For child entities (e.g., sale_items → sales)
  fields: FieldDef[];
}

export interface LocalOnlyEntityDef {
  name: string;
  table: string;
  primaryKey: string;
  fields: FieldDef[];
}
```

### Entity Priority for Sync Ordering

Operations are sorted by dependency before sync to ensure parent entities are created before children:

```typescript
// packages/backend/src/services/sync/framework/OperationSorter.ts
private entityPriority: Record<string, number> = {
  sales: 1,
  sale_items: 2,           // Depends on sales
  customer_groups: 3,
  customer_group_members: 4, // Depends on groups
  purchases: 1,
  purchase_items: 2,
  distribucion: 1,
  distribucion_items: 2,
};
```

---

## SyncCoordinator (Client-Side)

The **SyncCoordinator** orchestrates the sync lifecycle on the client side. It sits between the UI components and the underlying sync services.

### Responsibilities

| Concern | Description |
|---------|-------------|
| **Queue Management** | Manages the `sync_operations` queue (pending, processing, failed) |
| **Lifecycle Hooks** | Provides before/after hooks for sync operations (NOT blocking validators) |
| **Status Tracking** | Tracks sync status for each entity and overall sync health |
| **Retry Logic** | Handles exponential backoff for failed operations |
| **Conflict Handling** | Delegates to server-side conflict resolution |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                        │
│              (TanStack Query hooks)                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  SyncCoordinator                            │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Queue      │  │  Lifecycle  │  │   Status    │         │
│  │  Manager    │  │  Hooks      │  │   Tracker   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Sync Service Layer                         │
│    (SyncService for push, PullService for pull)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     PGLite (Local DB)                       │
│                 (IndexedDB persistence)                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Differences from Old Hook System

**Old approach (deprecated):** `registry.ts` with blocking sync hooks that could prevent operations

**New approach:** SyncCoordinator with lifecycle hooks that observe but don't block

| Aspect | Old (Hooks) | New (Coordinator) |
|--------|-------------|-------------------|
| Can block operations | Yes | No |
| Purpose | Validation | Observation/Logging |
| Registration | `registry.ts` | Direct coordinator config |
| Returns | `{ allow: boolean }` | Nothing (void) |

### Lifecycle Hooks

```typescript
// packages/app/app/lib/sync/coordinator.ts

export interface SyncLifecycleHooks {
  // Called before enqueueing an operation
  onBeforeEnqueue?: (operation: SyncOperation) => void;
  
  // Called after successful enqueue
  onAfterEnqueue?: (operation: SyncOperation) => void;
  
  // Called before processing a batch
  onBeforeProcess?: (operations: SyncOperation[]) => void;
  
  // Called after batch processing
  onAfterProcess?: (result: ProcessResult) => void;
  
  // Called when an operation fails
  onOperationFailed?: (operation: SyncOperation, error: Error) => void;
}
```

**Important:** Lifecycle hooks are for logging, analytics, and side effects. They **cannot** block or reject operations. Validation happens in server-side handlers.

---

## Design Principles

1. **Declarative over Imperative** — Define what to sync via config, not code
2. **Convention over Configuration** — Sensible defaults, override only what's needed
3. **Schema-first** — Drizzle schema is the source of truth
4. **Type-safe end-to-end** — Types shared between client and server
5. **Minimal runtime** — Leverage existing TanStack Query + PGlite

---

## Future: Generator Proposal (Not Implemented)

**Status:** This section describes a potential future enhancement. The current implementation uses explicit handlers as documented above.

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Schema Layer                             │
│   Drizzle schemas + sync.config.ts (entity definitions)     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   sync.config.ts                              │
│   Entity configs, conflict strategies, field mappings        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Generator CLI                              │
│   bunx @avileo/sync-generator generate                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Generated Artifacts                        │
│   - handlers/ (backend)                                     │
│   - resolvers/ (backend)                                    │
│   - hooks/ (frontend)                                       │
│   - types/ (shared)                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Sync Entity Configuration

Instead of decorators, we define sync entities in a dedicated configuration file.

### `packages/shared/src/sync.config.ts`

```typescript
import { defineSyncEntity } from '@avileo/sync-generator';

// Entity definitions
export const syncEntities = {
  customers: defineSyncEntity({
    name: 'customers',
    table: 'customers',
    primaryKey: 'id',
    conflictStrategy: 'timestamp',
    fields: {
      id: { primary: true },
      name: { required: true, maxLength: 255 },
      dni: { maxLength: 20 },
      phone: { maxLength: 50 },
      address: { },
      notes: { },
      updatedAt: { version: true },
    },
  }),

  sales: defineSyncEntity({
    name: 'sales',
    table: 'sales',
    primaryKey: 'id',
    conflictStrategy: 'version',
    syncGroupId: true,
    fields: {
      id: { primary: true },
      customerId: { relation: 'customers' },
      totalAmount: { required: true },
      status: { required: true },
      version: { version: true },
    },
  }),

  saleItems: defineSyncEntity({
    name: 'saleItems',
    table: 'sale_items',
    primaryKey: 'id',
    conflictStrategy: 'parent',
    parentEntity: 'sales',
    fields: {
      id: { primary: true },
      saleId: { parentId: true },
      productId: { relation: 'products' },
      quantity: { required: true },
      unitPrice: { required: true },
    },
  }),
} as const;

export type SyncEntities = typeof syncEntities;
```

### `defineSyncEntity` Type Definition

```typescript
import type { SyncConflictStrategy } from './types';

export interface SyncFieldConfig {
  primary?: boolean;
  required?: boolean;
  maxLength?: number;
  version?: boolean;      // Used for conflict detection
  parentId?: boolean;     // Foreign key to parent entity
  relation?: string;      // Entity name this relates to
  sync?: boolean;         // Whether to sync this field (default: true)
}

export interface SyncEntityConfig {
  name: string;
  table: string;
  primaryKey: string;
  conflictStrategy: SyncConflictStrategy;
  syncGroupId?: boolean;   // Generate sync_group_id for this entity
  parentEntity?: string;    // For child entities (saleItems → sales)
  fields: Record<string, SyncFieldConfig | undefined>;
}

export function defineSyncEntity<const T extends SyncEntityConfig>(
  config: T
): T {
  return config;
}
```

### Conflict Strategies

```typescript
export type SyncConflictStrategy =
  | 'timestamp'   // Compare updatedAt fields
  | 'version'     // Compare version number (increments on update)
  | 'parent'      // Inherit conflict strategy from parent entity
  | 'none';       // No conflict detection (always overwrite)
```

---

## Project Structure

```
packages/
├── shared/src/
│   ├── schema.ts              # Drizzle schemas (existing)
│   ├── sync.config.ts         # NEW: Sync entity configurations
│   └── sync-types.ts          # NEW: Shared sync types
│
├── sync-generator/            # NEW: Code generator package
│   ├── src/
│   │   ├── index.ts          # CLI entry point
│   │   ├── generator.ts       # Main generator logic
│   │   ├── templates/         # EJS templates
│   │   │   ├── handler.ts.ejs
│   │   │   ├── resolver.ts.ejs
│   │   │   └── hook.ts.ejs
│   │   └── types.ts
│   ├── package.json
│   └── README.md
│
├── backend/src/
│   ├── services/sync/
│   │   ├── framework/
│   │   │   ├── SyncEngine.ts
│   │   │   └── ConflictResolver.ts
│   │   ├── handlers/
│   │   │   ├── BaseSyncHandler.ts
│   │   │   ├── generated/      # NEW: Generated handlers
│   │   │   │   ├── CustomerSyncHandler.ts
│   │   │   │   ├── SaleSyncHandler.ts
│   │   │   │   └── ...
│   │   │   └── index.ts        # Re-export generated
│   │   └── resolvers/
│   │       ├── generated/      # NEW: Generated resolvers
│   │       │   └── ...
│   │       └── index.ts
│   └── api/
│       └── sync.ts
│
└── app/src/
    ├── lib/
    │   ├── sync/
    │   │   ├── sync-service.ts
    │   │   └── pull-service.ts
    │   ├── generated/
    │   │   └── sync/
    │   │       ├── hooks/      # NEW: Generated hooks
    │   │       │   ├── use-customers-sync.ts
    │   │       │   ├── use-sales-sync.ts
    │   │       │   └── ...
    │   │       ├── types/      # NEW: Generated types
    │   │       └── schemas/    # NEW: Generated Zod schemas
    └── hooks/
        └── generated/          # NEW: useEntity hooks
```

---

## Generated Outputs

### 1. Backend Handler

For `customers` entity:

```typescript
// packages/backend/src/services/sync/handlers/generated/CustomerSyncHandler.ts

import { BaseSyncHandler } from '../BaseSyncHandler';
import type { SyncHandlerResult } from '../types';
import type { RequestContext } from '../../../../context/request-context';
import type { DbTransaction } from '../../../../lib/txid';
import type { SyncOperationInput } from '../../../types';
import { customers } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { customerCreateSchema, customerUpdateSchema } from '$/schemas';

export class CustomerSyncHandler extends BaseSyncHandler {
  readonly entityType = 'customers';
  readonly table = customers;
  readonly primaryKey = 'id';
  readonly conflictStrategy = 'timestamp';

  async validateBusinessRules(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
  ): Promise<void> {
    if (operation === 'create') {
      customerCreateSchema.parse(payload);
    } else if (operation === 'update') {
      customerUpdateSchema.parse(payload);
    }
  }

  protected async handleInsert(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction,
  ): Promise<SyncHandlerResult> {
    const { idempotencyKey, entityId, payload } = operation;

    const existing = await tx
      .select()
      .from(customers)
      .where(and(
        eq(customers.id, entityId),
        eq(customers.businessId, ctx.businessId),
      ))
      .limit(1);

    if (existing.length > 0) {
      return this.success(operation);
    }

    await tx.insert(customers).values({
      id: entityId,
      businessId: ctx.businessId,
      name: payload.name as string,
      dni: payload.dni as string | undefined,
      phone: payload.phone as string | undefined,
      address: payload.address as string | undefined,
      notes: payload.notes as string | undefined,
      syncStatus: 'synced',
    });

    return this.success(operation);
  }

  protected async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction,
  ): Promise<SyncHandlerResult> {
    const { idempotencyKey, entityId, payload } = operation;

    await tx
      .update(customers)
      .set({
        name: payload.name as string | undefined,
        dni: payload.dni as string | undefined,
        phone: payload.phone as string | undefined,
        address: payload.address as string | undefined,
        notes: payload.notes as string | undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(customers.id, entityId),
        eq(customers.businessId, ctx.businessId),
      ));

    return this.success(operation);
  }

  protected async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction,
  ): Promise<SyncHandlerResult> {
    const { idempotencyKey, entityId } = operation;

    await tx
      .delete(customers)
      .where(and(
        eq(customers.id, entityId),
        eq(customers.businessId, ctx.businessId),
      ));

    return this.success(operation);
  }
}
```

### 2. Conflict Resolver

```typescript
// packages/backend/src/services/sync/framework/resolvers/generated/CustomerConflictResolver.ts

import { BaseTimestampConflictResolver } from '../BaseTimestampConflictResolver';
import { customers } from '../../../../db/schema';

export class CustomerConflictResolver extends BaseTimestampConflictResolver {
  protected readonly entityName = 'Customer';
  protected readonly table = customers;
  protected readonly idField = 'id';
  protected readonly businessIdField = 'businessId';
  protected readonly updatedAtField = 'updatedAt';

  protected getServerDataFields(record: typeof customers.$inferSelect) {
    return {
      name: record.name,
      dni: record.dni,
      phone: record.phone,
      address: record.address,
      notes: record.notes,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}
```

### 3. Frontend TanStack Query Hook

```typescript
// packages/app/src/lib/generated/sync/hooks/use-customers-sync.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Customer, NewCustomer, UpdateCustomer } from '../types';
import { customerCreateSchema, customerUpdateSchema } from '../schemas';
import { syncService } from '../../sync/sync-service';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => syncService.getAll('customers'),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => syncService.get('customers', id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewCustomer) => {
      customerCreateSchema.parse(data);
      const id = crypto.randomUUID();
      await syncService.enqueue({
        entityType: 'customers',
        operation: 'create',
        entityId: id,
        payload: { ...data, id },
      });
      return id;
    },
    onMutate: async (newCustomer) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const previous = queryClient.getQueryData(['customers']);

      queryClient.setQueryData(['customers'], (old: Customer[] = []) => [
        ...old,
        { ...newCustomer, id: 'temp-' + Date.now(), syncStatus: 'pending' as const },
      ]);

      return { previous };
    },
    onError: (_err, _newCustomer, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['customers'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCustomer }) => {
      customerUpdateSchema.parse(data);
      await syncService.enqueue({
        entityType: 'customers',
        operation: 'update',
        entityId: id,
        payload: data,
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['customers', id] });
      const previous = queryClient.getQueryData(['customers', id]);

      queryClient.setQueryData(['customers', id], (old: Customer | undefined) => ({
        ...old,
        ...data,
        syncStatus: 'pending' as const,
      }));

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['customers', context.previous.id], context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['customers', vars.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await syncService.enqueue({
        entityType: 'customers',
        operation: 'delete',
        entityId: id,
        payload: {},
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['customers', id] });
      const previous = queryClient.getQueryData(['customers', id]);

      queryClient.setQueryData(['customers', id], (old: Customer | undefined) => ({
        ...old,
        syncStatus: 'pending' as const,
      }));

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['customers', context.previous.id], context.previous);
      }
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
```

### 4. Zod Schemas

```typescript
// packages/app/src/lib/generated/sync/schemas/customers.ts

import { z } from 'zod';

export const customerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  dni: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export type NewCustomer = z.infer<typeof customerCreateSchema>;
export type UpdateCustomer = z.infer<typeof customerUpdateSchema>;
```

### 5. Shared Types

```typescript
// packages/shared/src/sync-types.ts

import type { SyncEntityConfig } from '@avileo/sync-generator';

export interface SyncOperationInput {
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  localVersion?: number;
  localTimestamp: string;
  syncGroupId?: string;
  idempotencyKey?: string;
}

export interface SyncHandlerResult {
  success: boolean;
  idempotencyKey?: string;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp?: string;
}

export type SyncEntity = 'customers' | 'sales' | 'saleItems' | 'abonos' | ...;
```

---

## Generator CLI

### `packages/sync-generator/src/index.ts`

```typescript
#!/usr/bin/env node

import { parseArgs } from 'parseArgs';
import { Generator } from './generator';

const args = parseArgs({
  options: {
    watch: { type: 'boolean', short: 'w' },
    config: { type: 'string', short: 'c', default: '../../shared/src/sync.config.ts' },
    output: { type: 'string', short: 'o', default: '.' },
  },
});

const generator = new Generator({
  configPath: args.values.config,
  outputPath: args.values.output,
});

if (args.values.watch) {
  generator.watch();
} else {
  generator.generate();
}
```

### Usage

```bash
# Generate once
bunx @avileo/sync-generator generate

# Watch mode (regenerate on config change)
bunx @avileo/sync-generator generate --watch

# Custom config path
bunx @avileo/sync-generator generate --config ./my-sync-config.ts
```

---

## Handler Registration

Generated handlers are auto-registered via an index file:

```typescript
// packages/backend/src/services/sync/handlers/generated/index.ts

export { CustomerSyncHandler } from './CustomerSyncHandler';
export { SaleSyncHandler } from './SaleSyncHandler';
export { SaleItemSyncHandler } from './SaleItemSyncHandler';
export { AbonoSyncHandler } from './AbonoSyncHandler';
// ... all other generated handlers
```

```typescript
// packages/backend/src/services/sync/handlers/index.ts

import { HandlerRegistry } from '../framework/HandlerRegistry';
import * as generatedHandlers from './generated';

// Register all generated handlers
for (const handler of Object.values(generatedHandlers)) {
  HandlerRegistry.register(handler.entityType, handler);
}
```

---

## Conflict Resolver Registration

```typescript
// packages/backend/src/services/sync/framework/resolvers/generated/index.ts

export { CustomerConflictResolver } from './CustomerConflictResolver';
export { SaleConflictResolver } from './SaleConflictResolver';
// ...
```

```typescript
// packages/backend/src/services/sync/framework/ConflictResolver.ts

import { ConflictResolverRegistry } from './ConflictResolverRegistry';
import * as generatedResolvers from './resolvers/generated';

// Register all generated resolvers
for (const resolver of Object.values(generatedResolvers)) {
  ConflictResolverRegistry.register(resolver.entityType, resolver);
}
```

---

## Adding a New Entity

### Step 1: Add to `sync.config.ts`

```typescript
// packages/shared/src/sync.config.ts

export const syncEntities = {
  // ... existing entities

  suppliers: defineSyncEntity({
    name: 'suppliers',
    table: 'suppliers',
    primaryKey: 'id',
    conflictStrategy: 'timestamp',
    fields: {
      id: { primary: true },
      name: { required: true, maxLength: 255 },
      type: { maxLength: 50 },
      ruc: { maxLength: 20 },
      phone: { maxLength: 50 },
      email: { maxLength: 255 },
      isActive: { },
      updatedAt: { version: true },
    },
  }),
} as const;
```

### Step 2: Run Generator

```bash
bunx @avileo/sync-generator generate
```

### Step 3: Done

The generator creates:
- `SupplierSyncHandler.ts` in `handlers/generated/`
- `SupplierConflictResolver.ts` in `resolvers/generated/`
- `use-suppliers-sync.ts` in `hooks/generated/sync/`
- `suppliers.ts` schemas
- Types exported automatically

---

## Code Volume Comparison

| Metric | Current | With Generator | Reduction |
|--------|---------|-----------------|-----------|
| Lines per entity | ~200 | ~20 | 90% |
| Files to modify | 10 | 1 (config) | 90% |
| Manual type exports | 5+ | 0 | 100% |
| Boilerplate handlers | ~120 lines | 0 (generated) | 100% |
| Boilerplate resolvers | ~50 lines | 0 (generated) | 100% |

---

## Open Questions

1. **How to handle entity-specific business logic?**
   - Generated handlers include `// TODO` placeholders for custom logic
   - Developer extends generated class and overrides methods
   - Or uses lifecycle hooks pattern

2. **How to handle soft deletes?**
   - Add `deletedAt?: Date` field config
   - Generator creates `handleSoftDelete` instead of `handleDelete`

3. **How to handle computed fields?**
   - Mark fields as `computed: true` in config
   - These fields are excluded from sync payload

4. **How to handle relations?**
   - `relation` field in config indicates relationship
   - Could auto-generate relation resolution logic

---

## Next Steps

1. Create `packages/sync-generator/` package
2. Implement config type definitions
3. Create EJS templates
4. Implement generator CLI
5. Run generator on existing entities
6. Verify generated code compiles
7. Run integration tests
8. Update documentation

---

## Appendix: Template Examples

### Handler Template (`handler.ts.ejs`)

```ejs
import { BaseSyncHandler } from '../../BaseSyncHandler';
import type { SyncHandlerResult } from '../../types';
import type { RequestContext } from '<%= relativeToBackend(context, 'context/request-context') %>';
import type { DbTransaction } from '<%= relativeToBackend(context, 'lib/txid') %>';
import type { SyncOperationInput } from '<%= relativeToBackend(context, '../types') %>';
import { <%= tableName %> } from '<%= relativeToBackend(context, schemaPath) %>';
import { eq, and } from 'drizzle-orm';
import { <%= schemaName %>CreateSchema, <%= schemaName %>UpdateSchema } from '$/schemas';

export class <%= className %> extends BaseSyncHandler {
  readonly entityType = '<%= entityName %>';
  readonly table = <%= tableName %>;
  readonly primaryKey = '<%= primaryKey %>';
  readonly conflictStrategy = '<%= conflictStrategy %>';

  async validateBusinessRules(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
  ): Promise<void> {
    if (operation === 'create') {
      <%= schemaName %>CreateSchema.parse(payload);
    } else if (operation === 'update') {
      <%= schemaName %>UpdateSchema.parse(payload);
    }
  }

  // ... generated CRUD methods
}
```

### Hook Template (`hook.ts.ejs`)

```ejs
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { <%= typesName %> } from '../types';
import { <%= schemaName %>CreateSchema, <%= schemaName %>UpdateSchema } from '../schemas';
import { syncService } from '<%= relativeToApp(context, 'lib/sync/sync-service') %>';

export function use<%= entityName %>s() {
  return useQuery({
    queryKey: ['<%= entityName %>s'],
    queryFn: () => syncService.getAll('<%= entityName %>s'),
  });
}

export function use<%= entityName %>(id: string) {
  return useQuery({
    queryKey: ['<%= entityName %>s', id],
    queryFn: () => syncService.get('<%= entityName %>s', id),
    enabled: !!id,
  });
}

// ... CRUD mutations
```
