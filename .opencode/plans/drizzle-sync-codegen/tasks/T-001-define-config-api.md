# T-001: Define Config API

## Objective

Create the `defineSyncConfig()` function and all associated TypeScript types for declarative sync entity configuration.

## Requirements

**From**: FR-001

## Implementation Details

### Files to Create

1. `packages/drizzle-sync/src/config/types.ts`
   - Core type definitions
   - EntityConfig interface
   - SyncConfig interface
   - Hook types

2. `packages/drizzle-sync/src/config/define-config.ts`
   - `defineSyncConfig()` function
   - Type inference helpers
   - Runtime validation

3. `packages/drizzle-sync/src/config/validator.ts`
   - Zod schemas for config validation
   - Error messages

### Type System Design

```typescript
// Core types
interface EntityConfig<TTable extends PgTable = PgTable> {
  table: TTable;
  syncable: boolean;
  priority?: number;
  
  // Hybrid field definition
  fields?: string[];           // Explicit whitelist
  autoFields?: boolean;      // Auto + exclude mode
  excludeFields?: string[];  // Fields to exclude in auto mode
  
  conflictResolver?: "version-based" | "last-write-wins" | "merge";
  relations?: Record<string, RelationConfig>;
  hooks?: EntityHooks;
}

interface SyncConfig {
  entities: Record<string, EntityConfig>;
  options?: {
    batchSize?: number;
    maxRetries?: number;
  };
}

// Function signature
declare function defineSyncConfig<TEntities extends Record<string, EntityConfig>>(
  config: { entities: TEntities }
): { entities: TEntities } & SyncConfig;
```

### Key Features

1. **Full Type Inference**: When passing a Drizzle table to `table`, TypeScript should infer the column names for `fields` autocomplete.

2. **Hybrid Validation**: 
   - If `fields` provided → use explicit list
   - If `autoFields: true` → use all columns except `excludeFields`
   - If neither → auto all columns (default for convenience)

3. **Runtime Validation**: Use Zod to validate config at runtime with helpful error messages.

### Example Usage

```typescript
// packages/backend/src/sync.config.ts
import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import { customers, sales } from "./db/schema";

export const syncConfig = defineSyncConfig({
  entities: {
    // Mode 1: Auto all fields
    customers: {
      table: customers,
      syncable: true,
      priority: 1,
      conflictResolver: "version-based",
    },
    
    // Mode 2: Explicit fields
    products: {
      table: products,
      syncable: true,
      fields: ["id", "name", "base_price", "sync_status"],
      priority: 1,
    },
    
    // Mode 3: Auto + exclude
    sales: {
      table: sales,
      syncable: true,
      autoFields: true,
      excludeFields: ["internal_notes"],
      priority: 1,
    },
  },
});
```

## Acceptance Criteria

- [ ] `defineSyncConfig` function exported from `@avileo/drizzle-sync/config`
- [ ] Full TypeScript type inference works
- [ ] Hybrid field modes all supported
- [ ] Runtime validation with Zod
- [ ] Helpful error messages on invalid config
- [ ] IDE autocomplete for field names

## Testing Strategy

1. Unit tests for type inference
2. Unit tests for validation logic
3. Test all three field definition modes
4. Test error cases

## Dependencies

None - this is the foundation task.

## Estimated Time

4 hours

## Notes

- The type inference from Drizzle table to column names is the hardest part
- May need to use TypeScript's infer and mapped types
- Consider using `drizzle-orm` utility types
