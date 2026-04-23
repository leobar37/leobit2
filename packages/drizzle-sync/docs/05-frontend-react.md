# Frontend React Integration

Using `@avileo/drizzle-sync` in a React application.

## Overview

The React module provides:

- `SyncProvider` - Context provider for sync runtime
- `useSyncState` - Current sync state (counts, status)
- `useSyncStatus` - Boolean flags (hasPending, hasFailed)
- `useSyncEngine` - Access the engine instance
- `useSyncInit` - Initial sync progress
- `createSyncReactRuntime()` - Factory for React runtime

## Setup

### 1. Initialize the Engine

Create the sync engine once, outside React:

```typescript
// lib/sync-client.ts
import { createSyncClientEngine } from "@avileo/drizzle-sync/client";
import { initPgliteDatabase } from "@avileo/drizzle-sync/client";
import { drizzle } from "drizzle-orm/pglite";

let engine: SyncClientEngine | null = null;

export async function getSyncEngine() {
  if (engine) return engine;

  const pg = await initPgliteDatabase({
    schemaPath: "/path/to/generated/init.sql",
  });

  engine = createSyncClientEngine({
    pg,
    db: drizzle(pg),
    tenantId: businessId,
    userId: userId,
    authToken: authToken,
    apiUrl: import.meta.env.VITE_API_URL,
    entities: ["customers", "sales", "sale_items"],
  });

  await engine.initialize();
  await engine.start();

  return engine;
}
```

### 2. Wrap with SyncProvider

```tsx
// App.tsx
import { SyncProvider } from "@avileo/drizzle-sync/react";
import { getSyncEngine } from "./lib/sync-client";

function App() {
  return (
    <SyncProvider engine={getSyncEngine}>
      <YourApp />
    </SyncProvider>
  );
}
```

### 3. Use Sync Hooks

```tsx
import { useSyncState, useSyncStatus } from "@avileo/drizzle-sync/react";

function SyncIndicator() {
  const { isSyncing, isOnline, pendingCount, lastSyncTime } = useSyncState();
  const { hasPending, hasFailed, hasConflicts } = useSyncStatus();

  return (
    <div>
      {isOnline ? "🟢 Online" : "🔴 Offline"}
      {isSyncing && " ↻ Syncing..."}
      {hasPending && ` (${pendingCount} pending)`}
      {hasFailed && " ⚠️ Failed"}
      {hasConflicts && " ⚡ Conflicts"}
    </div>
  );
}
```

## Hooks Reference

### useSyncState

Returns current sync state:

```typescript
const {
  // Pull state
  pull: {
    isPulling,
    lastPullTime,
    lastError,
    cursor,
    isStuck,
  },

  // Push state
  push: {
    pending,      // Waiting to sync
    processing,   // Currently syncing
    completed,    // Successfully synced
    failed,       // Failed (may retry)
    conflict,     // Conflicts detected
    deadLetter,   // Permanently failed
    total,
  },

  // General
  isSyncing,
  isOnline,
  lastSyncTime,
  isStuck,
} = useSyncState();
```

### useSyncStatus

Returns boolean flags:

```typescript
const {
  isSyncing,
  isOnline,
  isStuck,
  hasPending,      // pending + processing > 0
  hasFailed,       // failed + deadLetter > 0
  hasConflicts,    // conflict > 0
  hasDeadLetter,   // deadLetter > 0
} = useSyncStatus();
```

### useSyncEngine

Access the engine instance:

```typescript
import { useSyncEngine } from "@avileo/drizzle-sync/react";

function ManualSyncButton() {
  const engine = useSyncEngine();

  const handleSync = async () => {
    await engine.getSyncService().processPending();
    await engine.getPullService().pull();
  };

  return <button onClick={handleSync}>Sync Now</button>;
}
```

### useSyncInit

Track initial sync progress (first-time sync):

```typescript
const {
  isInitialSync,
  stagedProgress,     // { stage, progress, total }
  currentStage,       // "CRITICAL" | "RECENT_SALES" | "HISTORICAL"
  stageProgress,      // 0-100
  isComplete,
} = useSyncInit();
```

### useSyncOperations

Query sync operations:

```typescript
const {
  operations,        // Operation records
  isLoading,
  refetch,
} = useSyncOperations({
  entityType: "sales",
  status: "pending",
});
```

### useSyncConflicts

Access conflict records:

```typescript
const {
  conflicts,
  resolveConflict,
  isResolving,
} = useSyncConflicts();

// Resolve a conflict
await resolveConflict({
  operationId: "op-123",
  resolution: "server-wins",  // | "client-wins" | "merge"
});
```

## Using Generated Services

The CLI generates service classes that wrap the sync engine:

```typescript
import { CustomerService } from "./generated/services";

function CustomerList() {
  const { customerService } = useServices();
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.findAll(),
  });
}
```

### Service Methods

Each generated service has:

```typescript
class CustomerService {
  findAll(filters?: FilterOptions): Promise<Customer[]>;
  findById(id: string): Promise<Customer | null>;
  create(data: CreateInput): Promise<Customer>;
  update(id: string, data: UpdateInput): Promise<Customer>;
  delete(id: string): Promise<void>;

  // Sync-specific
  enqueue(operation: "create" | "update" | "delete", id: string, data: any): Promise<void>;
}
```

## Offline Pattern

All writes go through local PGlite first, then sync automatically:

```typescript
async function createCustomer(data: CreateCustomerInput) {
  // Write to local PGlite
  const customer = await customerService.create(data);

  // Operation is automatically queued for sync
  // No explicit enqueue needed

  return customer; // Has temp ID until synced
}
```

## Event Handling

Subscribe to sync events:

```typescript
import { useSyncEvent } from "@avileo/drizzle-sync/react";

function SyncLogger() {
  useSyncEvent("sync:complete", (data) => {
    console.log("Sync complete:", data);
  });

  useSyncEvent("sync:error", (error) => {
    console.error("Sync error:", error);
  });

  useSyncEvent("conflict:detected", (conflict) => {
    showConflictNotification(conflict);
  });

  return null;
}
```

## DevTools

Debug sync state with the built-in devtools:

```tsx
import { SyncDevTools } from "@avileo/drizzle-sync/react/devtools";

function App() {
  return (
    <>
      <SyncProvider engine={engine}>
        <YourApp />
      </SyncProvider>

      {import.meta.env.DEV && <SyncDevTools />}
    </>
  );
}
```

## Next Steps

- [Concepts](./06-concepts.md) - Understand sync mechanics
- [API Reference](./07-api-reference.md) - All exports
- [Advanced](./08-advanced.md) - Custom codecs, resolvers
