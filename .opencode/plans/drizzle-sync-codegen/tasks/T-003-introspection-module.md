# T-003: Drizzle Introspection Module

## Objective

Create a module that extracts column metadata from Drizzle table definitions using `getTableColumns()`.

## Requirements

**From**: FR-003

## Implementation Details

### Files to Create

1. `packages/drizzle-sync/src/config/introspect.ts`
   - `introspectTable()` function
   - Column metadata extraction
   - Type mapping utilities

2. `packages/drizzle-sync/src/config/drizzle-types.ts`
   - Drizzle-to-Zod type mapping
   - Drizzle-to-SQLite type mapping
   - Drizzle-to-TypeScript type mapping

### Introspection API

```typescript
// config/introspect.ts
import { getTableColumns, type PgTable } from "drizzle-orm/pg-core";

export interface ColumnMetadata {
  name: string;
  dataType: string;           // "string", "number", "boolean", "date", "enum", etc.
  drizzleType: string;      // Original drizzle type name
  notNull: boolean;
  default?: unknown;
  primary: boolean;
  isEnum: boolean;
  enumValues?: string[];     // For enum columns
}

export function introspectTable(table: PgTable): ColumnMetadata[] {
  const columns = getTableColumns(table);
  
  return columns.map(col => {
    // Extract base type info
    const drizzleType = getDrizzleTypeName(col);
    
    return {
      name: col.name,
      dataType: mapDrizzleToDataType(col),
      drizzleType,
      notNull: col.notNull,
      default: col.default,
      primary: col.primary,
      isEnum: isEnumColumn(col),
      enumValues: getEnumValues(col),
    };
  });
}

// Type mapping
function mapDrizzleToDataType(column: any): string {
  // Map pg-core column types to our internal types
  const columnType = column.getSQLType();
  
  if (columnType.includes("varchar") || columnType.includes("text")) {
    return "string";
  }
  if (columnType.includes("uuid")) {
    return "string";
  }
  if (columnType.includes("integer") || columnType.includes("serial")) {
    return "number";
  }
  if (columnType.includes("boolean")) {
    return "boolean";
  }
  if (columnType.includes("timestamp") || columnType.includes("date")) {
    return "date";
  }
  if (columnType.includes("json") || columnType.includes("jsonb")) {
    return "json";
  }
  
  // Handle enums
  if (isEnumColumn(column)) {
    return "enum";
  }
  
  return "unknown";
}

// Check if column is an enum
function isEnumColumn(column: any): boolean {
  // Enums in Drizzle have specific characteristics
  // Check for pgEnum or similar
  return column.enumValues !== undefined;
}

// Extract enum values
function getEnumValues(column: any): string[] | undefined {
  if (isEnumColumn(column)) {
    return column.enumValues;
  }
  return undefined;
}
```

### Type Mapping Tables

```typescript
// config/drizzle-types.ts

// Map Drizzle pg-core types to Zod
export const DRIZZLE_TO_ZOD: Record<string, string> = {
  "PgVarchar": "z.string()",
  "PgText": "z.string()",
  "PgUUID": "z.string()",
  "PgInteger": "z.number()",
  "PgBigInt": "z.bigint()",
  "PgSerial": "z.number()",
  "PgBoolean": "z.boolean()",
  "PgTimestamp": "z.coerce.date()",
  "PgDate": "z.coerce.date()",
  "PgJson": "z.record(z.unknown())",
  "PgJsonb": "z.record(z.unknown())",
  "PgEnum": "z.enum()",
};

// Map Drizzle types to SQLite types (for PGlite DDL)
export const DRIZZLE_TO_SQLITE: Record<string, string> = {
  "PgVarchar": "TEXT",
  "PgText": "TEXT",
  "PgUUID": "TEXT",
  "PgInteger": "INTEGER",
  "PgBigInt": "INTEGER",
  "PgSerial": "INTEGER",
  "PgBoolean": "INTEGER",  // SQLite uses 0/1 for booleans
  "PgTimestamp": "TEXT",  // ISO strings
  "PgDate": "TEXT",
  "PgJson": "TEXT",       // JSON string
  "PgJsonb": "TEXT",
};

// Map to TypeScript types
export const DRIZZLE_TO_TYPESCRIPT: Record<string, string> = {
  "PgVarchar": "string",
  "PgText": "string",
  "PgUUID": "string",
  "PgInteger": "number",
  "PgBigInt": "bigint",
  "PgSerial": "number",
  "PgBoolean": "boolean",
  "PgTimestamp": "Date",
  "PgDate": "Date",
  "PgJson": "Record<string, unknown>",
  "PgJsonb": "Record<string, unknown>",
};
```

### Handling Relations

```typescript
// Detect relations from Drizzle schema
export function detectRelations(table: PgTable) {
  // This is more complex - may need to analyze the table structure
  // For now, we can skip or use a manual approach in config
  return [];
}
```

## Acceptance Criteria

- [ ] `introspectTable()` extracts all columns from Drizzle table
- [ ] Correctly identifies column types
- [ ] Handles nullable vs not-null
- [ ] Extracts default values
- [ ] Identifies primary keys
- [ ] Handles enum types with values
- [ ] Type mappings cover all Drizzle types used in project

## Testing Strategy

1. Unit tests with sample Drizzle tables
2. Test all column types used in Avileo
3. Test edge cases (json, enums, defaults)

## Dependencies

- T-001: Define Config API (needs config types to know which tables to introspect)

## Estimated Time

3 hours

## Notes

- This is the most critical technical piece - if introspection doesn't work, nothing else will
- May need to import Drizzle internals
- Test with actual Avileo schema files
- Some column types may need special handling (e.g., custom types)
