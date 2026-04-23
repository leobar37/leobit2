# Advanced Topics

Advanced usage patterns for `@avileo/drizzle-sync`.

## Custom Field Codecs

Create custom codecs for special field types.

### Codec Structure

```typescript
interface FieldCodec<TInput, TOutput = TInput> {
  name: string;
  encode(value: TInput): TOutput;
  decode(value: TOutput): TInput;
}
```

### Example: Phone Number Codec

```typescript
import type { FieldCodec } from "@avileo/drizzle-sync/config";

const phoneCodec: FieldCodec<string, string> = {
  name: "phone",
  encode: (value: string) => {
    // Remove formatting
    return value.replace(/\D/g, "");
  },
  decode: (value: string) => {
    // Add formatting
    if (value.length === 9) {
      return `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
    }
    return value;
  },
};

// Usage
const config = {
  entities: {
    customers: {
      table: customers,
      fieldCodecs: {
        phone: phoneCodec,
      },
    },
  },
};
```

### Example: JSON Codec

```typescript
const jsonCodec: FieldCodec<Record<string, unknown>, string> = {
  name: "json",
  encode: (value) => JSON.stringify(value),
  decode: (value) => JSON.parse(value),
};
```

## Custom Conflict Resolvers

Implement your own conflict resolution logic.

### Interface

```typescript
interface IConflictResolver {
  detect(local: EntityData, server: EntityData): ConflictDetection;

  resolve(
    conflict: BackendConflict,
    strategy: "server-wins" | "client-wins" | "merge",
    context?: ResolutionContext
  ): ResolutionResult;
}
```

### Example: Timestamp-Based Resolution

```typescript
class TimestampConflictResolver implements IConflictResolver {
  detect(local: EntityData, server: EntityData): ConflictDetection {
    if (local.version !== server.version) {
      return { hasConflict: true, reason: "version_mismatch" };
    }
    return { hasConflict: false };
  }

  resolve(
    conflict: BackendConflict,
    strategy: string
  ): ResolutionResult {
    const localTime = new Date(conflict.local_data.updated_at).getTime();
    const serverTime = new Date(conflict.server_data.updated_at).getTime();

    if (strategy === "last-write-wins") {
      return {
        resolvedData: localTime > serverTime ? conflict.local_data : conflict.server_data,
        resolution: "applied",
      };
    }

    // Default to server
    return {
      resolvedData: conflict.server_data,
      resolution: "applied",
    };
  }
}
```

### Register Custom Resolver

```typescript
// On server
const engine = createSyncEngine({
  config: syncConfig,
  conflictResolver: new TimestampConflictResolver(),
});
```

## Manual Sync Control

Control sync behavior programmatically.

### Process Pending Immediately

```typescript
const syncService = engine.getSyncService();

// Process all pending operations
const result = await syncService.processPending();
console.log(`Processed: ${result.processed}, Failed: ${result.failed}`);
```

### Force Pull

```typescript
const pullService = engine.getPullService();

// Force pull latest changes
const result = await pullService.pull({ force: true });
console.log(`Pulled: ${result.changes.length} changes`);
```

### Stop/Start Auto-Sync

```typescript
const coordinator = engine.getCoordinator();

// Stop auto-sync
coordinator.stop();

// ... do manual operations ...

// Resume auto-sync
coordinator.start();
```

### Custom Sync Intervals

```typescript
const engine = createSyncClientEngine({
  // ... base config
  options: {
    syncInterval: 60000,    // Push every 60s (default: 30s)
    pullInterval: 30000,    // Pull every 30s (default: 10s)
  },
});
```

## Offline Detection

Handle network transitions gracefully.

### Online Status

```typescript
const { isOnline } = useSyncStatus();

// Show offline indicator
if (!isOnline) {
  return <OfflineBanner />;
}
```

### Disable Sync When Offline

```typescript
const coordinator = engine.getCoordinator();

// Listen for online/offline
window.addEventListener("online", () => {
  coordinator.start();
});

window.addEventListener("offline", () => {
  coordinator.stop();
});
```

### Queue Operations When Offline

Operations are automatically queued. When back online:

```typescript
coordinator.on("resume", async () => {
  // Sync queued operations
  await syncService.processPending();
  await pullService.pull();
});
```

## Schema Migrations

Handle schema changes across versions.

### Adding a New Entity

```typescript
// 1. Add to sync.config.ts
export const syncConfig = defineSyncConfig({
  entities: {
    // ... existing entities
    new_entity: {
      table: newTable,
      syncable: true,
    },
  },
});

// 2. Rebuild schema
drizzle-sync build-schema

// 3. Regenerate frontend
drizzle-sync generate
```

### Adding a New Field

```typescript
// 1. Add field to Drizzle schema (backend)

// 2. Update sync config if field needs special handling
products: {
  table: products,
  fieldCodecs: {
    new_field: currency(),  // If monetary
  },
}

// 3. Rebuild and regenerate
drizzle-sync build-schema && drizzle-sync generate
```

### Field Renaming

Field renames require migration:

```typescript
// In config
products: {
  table: products,
  // Old name → new name mapping
  fieldMapping: {
    old_name: "new_name",
  },
}
```

## Batch Processing

Fine-tune batch behavior.

### Custom Batch Size

```typescript
// Per-operation batch sizing
await syncService.processPending({
  batchSize: 100,  // Default: 50
});
```

### Batch Results

```typescript
const result = await syncService.processPending();

interface BatchResult {
  processed: number;
  failed: number;
  conflicts: number;
  errors: Array<{
    operationId: string;
    error: string;
  }>;
}
```

## Event System

Subscribe to sync lifecycle events.

### Available Events

```typescript
// Push events
"sync:start"           // Sync batch started
"sync:complete"        // Sync batch completed
"sync:error"           // Sync batch failed

// Pull events
"pull:start"          // Pull started
"pull:complete"       // Pull completed
"pull:error"          // Pull failed

// Operation events
"operation:enqueued"  // New operation added
"operation:completed"  // Operation succeeded
"operation:failed"     // Operation failed
"operation:conflict"   // Conflict detected

// Conflict events
"conflict:detected"    // New conflict
"conflict:resolved"    // Conflict resolved
```

### Subscribe to Events

```typescript
import { useSyncEvent } from "@avileo/drizzle-sync/react";

function SyncLogger() {
  useSyncEvent("sync:complete", (data) => {
    console.log("Synced:", data.processed, "operations");
  });

  useSyncEvent("conflict:detected", (conflict) => {
    analytics.track("sync_conflict", conflict);
  });

  return null;
}
```

## Performance Tips

### Reduce Sync Frequency

```typescript
// Instead of syncing every 5s
options: {
  syncInterval: 30000,  // 30s
  pullInterval: 60000,  // 60s
}
```

### Batch More Operations

```typescript
// Increase batch size
options: {
  batchSize: 100,  // Default: 50
}
```

### Use Fast-Path

For simple operations without conflict risk:

```typescript
await syncService.enqueue({
  entity_type: "logs",
  entityId: generateId(),
  operation: "create",
  data: { message: "User action" },
  fastPath: true,  // Skip conflict check
});
```

### Lazy Load Entities

Only sync what's needed:

```typescript
createSyncClientEngine({
  entities: ["customers", "products"],  // Only these
  // Not: sales, historical_data, etc.
});
```

## Troubleshooting

### Operations Stuck in Pending

```typescript
// Check queue state
const pending = await syncService.getPending();
console.log("Pending:", pending.length);

// Force reprocess
await syncService.processPending({ force: true });
```

### Pull Not Fetching Changes

```typescript
// Check cursor
const pullService = engine.getPullService();
console.log("Cursor:", pullService.getCursor());

// Force fresh pull
await pullService.pull({ force: true });
```

### Conflicts Not Resolving

```typescript
// Check conflict records
const { conflicts } = useSyncConflicts();
console.log("Unresolved:", conflicts.length);

// Manual resolution
await resolveConflict(operationId, "server-wins");
```

## Next Steps

- [API Reference](./07-api-reference.md) - Complete API docs
- [Configuration](./09-configuration.md) - Full config reference
