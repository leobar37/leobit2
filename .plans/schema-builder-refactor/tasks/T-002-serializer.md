# T-002: Create serializer.ts with serialization utilities

## Objective
Create utility functions that convert Drizzle introspection results and EntitySyncConfig into JSON-serializable format.

## Requirements
- FR-003: Serialized Schema Format

## Files to Create
- `packages/drizzle-sync/src/config/serializer.ts`

## Implementation Details

### Functions to Implement

```typescript
/**
 * Serialize a Drizzle table into column metadata
 */
export function serializeColumns(columns: ColumnMetadata[]): SerializedColumn[]

/**
 * Serialize a single default value
 * - Primitive values: pass through
 * - SQL functions: { __type: "sql", value: "..." }
 * - Other objects: try to stringify or null
 */
export function serializeDefaultValue(defaultValue: unknown): unknown

/**
 * Extract SQL string from Drizzle SQL object
 */
export function extractSqlString(sqlObj: unknown): string | null

/**
 * Serialize field codecs map
 * - Converts codec instances to plain config objects
 */
export function serializeFieldCodecs(codecs?: FieldCodecMap): Record<string, SerializedFieldCodec> | undefined

/**
 * Serialize entity configuration (removes functions, keeps data)
 */
export function serializeEntityConfig(config: EntitySyncConfig): SerializedEntityConfig

/**
 * Serialize relation graph node
 */
export function serializeRelationNode(node: RelationNode): SerializedRelationNode
```

### Key Implementation Notes

**Default Value Serialization:**
```typescript
export function serializeDefaultValue(defaultValue: unknown): unknown {
  if (defaultValue === null || defaultValue === undefined) {
    return null;
  }
  
  // Handle Drizzle SQL objects
  if (isDrizzleSql(defaultValue)) {
    const sqlStr = extractSqlString(defaultValue);
    return sqlStr ? { __type: "sql", value: sqlStr } : null;
  }
  
  // Primitives pass through
  if (typeof defaultValue === "string" || 
      typeof defaultValue === "number" || 
      typeof defaultValue === "boolean") {
    return defaultValue;
  }
  
  // Arrays (e.g., enum values)
  if (Array.isArray(defaultValue)) {
    return defaultValue;
  }
  
  // Fallback
  return null;
}
```

**Field Codec Serialization:**
```typescript
export function serializeFieldCodecs(codecs?: FieldCodecMap) {
  if (!codecs) return undefined;
  
  return Object.entries(codecs).reduce((acc, [key, codec]) => {
    acc[key] = { 
      kind: codec.kind, 
      nullable: codec.isNullable 
    };
    return acc;
  }, {} as Record<string, SerializedFieldCodec>);
}
```

## Validation

- [ ] All Drizzle SQL defaults are handled (now(), gen_random_uuid(), etc.)
- [ ] All codec types serialize correctly
- [ ] No circular references or functions in output
- [ ] Output is valid JSON after JSON.stringify

## Notes

- This module is used by SchemaManager during schema build
- Must handle edge cases: missing defaults, custom SQL expressions, etc.
