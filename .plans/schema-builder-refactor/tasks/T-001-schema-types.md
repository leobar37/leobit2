# T-001: Create schema-types.ts with SyncSchema types

## Objective
Define TypeScript types for the serialized schema.json format that will serve as the contract between backend and frontend code generation.

## Requirements
- FR-003: Serialized Schema Format

## Files to Create
- `packages/drizzle-sync/src/config/schema-types.ts`

## Implementation Details

### Types to Define

```typescript
// Root schema object
export interface SyncSchema {
  version: string;        // e.g., "1.0.0"
  generatedAt: string;    // ISO timestamp
  entities: Record<string, SerializedEntity>;
}

// Serialized entity
export interface SerializedEntity {
  name: string;
  tableName: string;
  columns: SerializedColumn[];
  config: SerializedEntityConfig;
  graph: SerializedRelationNode;
}

// Serialized column (all JSON-serializable)
export interface SerializedColumn {
  name: string;
  dataType: "string" | "number" | "boolean" | "date" | "json" | "enum" | "unknown";
  drizzleType: string;      // "PgVarchar", "PgNumeric", etc.
  notNull: boolean;
  hasDefault: boolean;
  default?: unknown;        // Serialized default value
  primary: boolean;
  isEnum: boolean;
  enumValues?: string[];
  precision?: number;       // For decimal
  scale?: number;           // For decimal
  length?: number;          // For varchar
}

// Serialized entity config (no functions)
export interface SerializedEntityConfig {
  syncable: boolean;
  conflictResolver?: string;
  apiPath?: string;
  fieldCodecs?: Record<string, SerializedFieldCodec>;
  relations?: {
    children?: SerializedChildRelation[];
    parents?: SerializedParentRelation[];
  };
  metadata?: Record<string, unknown>;
}

export interface SerializedFieldCodec {
  kind: string;
  nullable?: boolean;
}

export interface SerializedChildRelation {
  entity: string;
  foreignKey: string;
  payloadKey?: string;
  cascade?: boolean;
}

export interface SerializedParentRelation {
  entity: string;
  foreignKey: string;
  payloadKey?: string;
  required?: boolean;
}

export interface SerializedRelationNode {
  parents: string[];
  children: string[];
  priority: number;
}
```

### Default Value Serialization

For Drizzle SQL defaults like `sql\`now()\``:
```typescript
// In JSON: { "__type": "sql", "value": "now()" }
export interface SerializedSqlDefault {
  __type: "sql";
  value: string;
}
```

## Validation

- [ ] All types compile without errors
- [ ] No `any` types used
- [ ] Types match current ColumnMetadata and EntitySyncConfig structures
- [ ] JSON-serializable types only (no functions)

## Notes

- These types will be used by both SchemaManager (to build) and CLI/generators (to read)
- Keep backward-compatible versioning in mind for future schema format changes
