# T-005: Update defineSyncConfig to return builder

## Objective
Modify `defineSyncConfig()` to return a `SyncConfigBuilder` instance instead of a plain object, while maintaining backward compatibility.

## Requirements
- FR-004: defineSyncConfig Returns Builder

## Files to Modify
- `packages/drizzle-sync/src/config/define-config.ts`

## Implementation Details

### Current Implementation

```typescript
export function defineSyncConfig<TEntities extends Record<string, EntitySyncConfig>>(
  config: SyncConfig<TEntities>
): SyncConfig<TEntities> {
  return config;
}
```

### New Implementation

```typescript
import { SyncConfigBuilder, SyncConfigInput } from "./builder";
import type { EntitySyncConfig } from "./types";

export function defineSyncConfig<TEntities extends Record<string, EntitySyncConfig>>(
  config: SyncConfigInput<TEntities>
): SyncConfigBuilder<TEntities> {
  return new SyncConfigBuilder(config);
}
```

### Backward Compatibility

The key challenge: existing code expects a `SyncConfig` object but now gets a `SyncConfigBuilder`.

Solutions:
1. **Proxy pattern**: SyncConfigBuilder already proxies `.entities` and `.options`
2. **Type compatibility**: Ensure `SyncConfigBuilder` is assignable to `SyncConfig` where needed
3. **Runtime checks**: Code that checks `if (config.entities)` still works

### Type Definitions

```typescript
// Add to types.ts
export interface SyncConfigInput<
  TEntities extends Record<string, EntitySyncConfig> = Record<string, EntitySyncConfig>
> extends SyncConfig<TEntities> {
  schema?: {
    output: string;
    format?: "json";
    autoBuild?: boolean;
    watch?: boolean;
  };
}
```

### Usage in Backend

```typescript
// packages/backend/src/sync.config.ts
export const syncConfig = defineSyncConfig({
  entities: { ... },
  options: { ... },
  schema: {
    output: "./src/sync.schema.json",
    autoBuild: true,
    watch: process.env.NODE_ENV === "development",
  }
});

// syncConfig is now SyncConfigBuilder
// But existing code works:
const entities = syncConfig.entities; // Works!
const options = syncConfig.options;   // Works!

// New capabilities:
await syncConfig.buildSchema();       // Manual rebuild
const schema = syncConfig.getSchema(); // Get schema
```

## Validation

- [ ] `defineSyncConfig` returns SyncConfigBuilder
- [ ] Existing property access works (.entities, .options)
- [ ] TypeScript compiles without errors in backend
- [ ] No runtime errors in existing code
- [ ] Can call new methods (.buildSchema, .getSchema)

## Notes

- The generic type parameter must be preserved for type safety
- Consider adding a deprecation warning if old API is detected
- Test with actual backend sync.config.ts
