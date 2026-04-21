# T-010: Update generators to accept SyncSchema

## Objective
Update all code generators to work with `SyncSchema` instead of requiring Drizzle table introspection at generation time.

## Requirements
- FR-006: Generators Accept Schema

## Files to Modify
- `src/config/generators/zod-generator.ts`
- `src/config/generators/postgres-ddl-generator.ts`
- `src/config/generators/service-generator.ts`
- `src/config/generators/hooks-generator.ts`
- `src/config/generators/applier-generator.ts`

## Implementation Details

### Pattern Change

Current:
```typescript
export function generateZodSchema(
  entityName: string,
  config: EntitySyncConfig  // Contains Drizzle table reference
): ZodSchemaOutput {
  const columns = introspectTable(config.table);  // Introspects Drizzle
  // ...
}
```

New:
```typescript
export function generateZodSchema(
  entityName: string,
  entity: SerializedEntity  // Contains pre-computed column metadata
): ZodSchemaOutput {
  const columns = entity.columns;  // Already serialized
  // ...
}
```

### Changes per Generator

#### zod-generator.ts
- Replace `introspectTable(config.table)` with `entity.columns`
- Replace `resolveColumns(columns, config)` with direct column filtering using serialized config

#### postgres-ddl-generator.ts
- Same pattern: use `entity.columns` directly
- Already uses `ColumnMetadata`, just switch source

#### service-generator.ts
- Use `entity.columns` for column metadata
- Use `entity.config` for entity configuration
- Use `entity.graph` for relation info

#### hooks-generator.ts
- Use `entity.config` for relations
- Use `entity.graph` for dependency ordering

#### applier-generator.ts
- Use `entity.columns` for column names and defaults

### Shared Utilities

Create helper to convert `SerializedColumn` back to generator-friendly format:

```typescript
// src/config/generators/schema-adapter.ts
import { SerializedColumn } from "../schema-types";
import { ColumnMetadata } from "../types";

/**
 * Adapt serialized columns back to ColumnMetadata format
 * for generators that expect the old interface
 */
export function adaptColumns(serialized: SerializedColumn[]): ColumnMetadata[] {
  return serialized.map(col => ({
    ...col,
    // Ensure all required fields are present
    hasDefault: col.hasDefault ?? (col.default !== undefined),
  }));
}
```

### Validation

- [ ] All generators compile without errors
- [ ] Generated output matches current output (regression test)
- [ ] No Drizzle imports needed in generator files
- [ ] Generators work with SyncSchema input

## Notes

- This is the biggest change in terms of lines modified
- Each generator file needs careful review
- Consider creating adapter layer to minimize changes
- Test with actual Avileo entities to ensure output parity
