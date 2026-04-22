# React Integration

## SyncProvider

Located at `provider.tsx:55`. Main entry point for React apps.

### Props

```typescript
interface SyncProviderProps {
  /** Factory: sync runtime, async factory, or promise */
  runtime: SyncReactRuntime | (() => SyncReactRuntime) | (() => Promise<SyncReactRuntime>);
  children: ReactNode;
}
```

### Initialization Flow

1. Resolve runtime (support sync factory, async factory, or promise)
2. Set runtime in context
3. Subscribe to state changes via `runtime.subscribe()`
4. On unmount: call `runtime.dispose()`

### Dual Context Pattern

```typescript
// Runtime (never changes after init)
<SyncRuntimeContext.Provider value={{ runtime }}>

// State (updates via subscription)
<SyncStateContext.Provider value={state}>
```

### Error Handling

If initialization throws → re-throws to error boundary. If runtime is not yet ready → renders `null`.

## SyncReactRuntime Interface

`react/types.ts:135`:

```typescript
interface SyncReactRuntime {
  getState(): SyncStateSnapshot;
  subscribe(listener: () => void): () => void;
  eventSource?: SyncEventSource;       // for typed events
  getLogs?(): SyncLogEntry[];
  subscribeLogs?(listener: () => void): () => void;
  getConflicts?(): SyncConflictRecord[];
  subscribeConflicts?(listener: () => void): () => void;
  dispose?(): void;
}
```

## SyncStateSnapshot

`react/types.ts:70`:

```typescript
interface SyncStateSnapshot {
  isSyncing: boolean;
  isOnline: boolean;
  isStuck: boolean;
  lastSyncTime: Date | null;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  deadLetterCount: number;
  push?: PushStateSnapshot;   // optional detailed push state
  pull?: PullStateSnapshot;  // optional detailed pull state
}
```

## 8 Hooks

| Hook | File:Line | Returns | Notes |
|------|-----------|---------|-------|
| `useSyncState` | `hooks.ts:39` | `SyncStateSnapshot` | Falls back to default if outside provider |
| `useSyncStatus` | `hooks.ts:48` | `{ isSyncing, isOnline, isStuck, hasPending, hasFailed, hasConflicts, hasDeadLetter }` | Memoized flags |
| `useSyncLifecycle` | `hooks.ts:77` | `void` | Calls `runtime.dispose()` on unmount |
| `useSyncEvent` | `hooks.ts:90` | `void` | Subscribes to typed events via `eventSource.on()` |
| `useSyncLogs` | `hooks.ts:109` | `SyncLogEntry[]` | Subscribes to log changes |
| `useSyncConflicts` | `hooks.ts:137` | `SyncConflictRecord[]` | Subscribes to conflict changes |
| `useHasPendingSync` | `hooks.ts:165` | `boolean` | `pendingCount > 0` |
| `useHasFailedSync` | `hooks.ts:173` | `boolean` | `failedCount > 0 \|\| deadLetterCount > 0` |
| `useIsSyncStuck` | `hooks.ts:181` | `boolean` | `isStuck` from state |

## SyncEventSource

`react/types.ts:12`:

```typescript
interface SyncEventSource {
  on(eventType: string, handler: (event: unknown) => void): () => void;
}
```

Connected to `SyncEventEmitter` from `core/sync-events`. Allows components to subscribe to specific sync events.

## ConflictRecord

`react/types.ts:110`:

```typescript
interface SyncConflictRecord {
  id: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localVersion: number;
  serverVersion: number;
  status: "pending" | "resolved";
  resolution: "server" | "local" | "merge" | null;
}
```

## Default State

`hooks.ts:20`:

```typescript
const DEFAULT_SYNC_STATE: SyncStateSnapshot = {
  isSyncing: false,
  isOnline: true,
  isStuck: false,
  lastSyncTime: null,
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  deadLetterCount: 0,
};
```

## Usage Example

In Avileo, the sync engine is created on the backend and passed to the frontend via the API. For frontend-only or custom setups:

```tsx
import { SyncProvider } from "@avileo/drizzle-sync/react";
import { createSyncEngine } from "@avileo/drizzle-sync";

const runtime = createSyncEngine({
  // Entity configuration with syncable entities
  entities: {
    customers: { table: customersTable, syncable: true },
    sales: { table: salesTable, syncable: true, relations: { children: [...] } },
    // ...
  },
  // ...
});

<SyncProvider runtime={runtime}>
  <App />
</SyncProvider>;

// Inside App
const { pendingCount, isSyncing } = useSyncState();
const { hasFailed } = useSyncStatus();
```
