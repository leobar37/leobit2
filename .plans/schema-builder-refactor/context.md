# Context: Schema Builder Refactor for drizzle-sync

## Overview

Refactor `@avileo/drizzle-sync` to separate schema serialization concerns into a dedicated `SchemaManager` class that is instantiated within a `SyncConfigBuilder`. This enables automatic generation of a `sync.schema.json` file (similar to GraphQL schema) that serves as a static contract between backend and frontend code generation.

## Current Architecture

Currently, `@avileo/drizzle-sync` has:
- `defineSyncConfig()` returns a plain `SyncConfig` object
- `generateAll()` reads the config and generates files directly
- CLI imports and executes the sync.config.ts to get entities
- Generators introspect Drizzle tables at generation time

## Proposed Architecture

```
Backend sync.config.ts
    ↓
SyncConfigBuilder (with SchemaManager instance)
    ↓
Builds sync.schema.json (static contract)
    ↓
CLI reads sync.schema.json (no TS execution)
    ↓
Generates frontend/backend code
```

## Key Design Decisions

1. **SchemaManager is encapsulated within SyncConfigBuilder**, not exposed directly
2. **Schema output path is configured in sync.config.ts**, not in a separate CLI config
3. **Auto-build and watch mode** are configured in the sync.config.ts schema settings
4. **CLI only reads the generated JSON**, never executes TS files
5. **All Drizzle introspection happens at build time** (when schema.json is generated), not at generation time

## Files and Modules Involved

### To Create
- `src/config/schema-manager.ts` - SchemaManager class
- `src/config/builder.ts` - SyncConfigBuilder class
- `src/config/schema-types.ts` - Types for serialized schema.json
- `src/config/serializer.ts` - Serialization utilities
- `src/cli/schema-loader.ts` - CLI schema loading

### To Modify
- `src/config/define-config.ts` - Return SyncConfigBuilder instead of plain object
- `src/config/types.ts` - Add schema configuration types
- `src/config/index.ts` - Export new classes
- `src/config/generator.ts` - Accept SyncSchema instead of SyncConfig
- `src/cli.ts` - Use schema.json instead of importing TS
- `src/config/validator.ts` - Validate schema config
- `package.json` - Add CLI exports if needed
- `tsup.config.ts` - Ensure CLI builds correctly

### To Update (Usage)
- `packages/backend/src/sync.config.ts` - Add schema configuration

## Dependencies

The schema.json must capture:
- All column metadata (name, type, constraints, defaults)
- Entity configuration (syncable, conflict resolver, relations, codecs)
- Relation graph (parents, children, priorities)
- Table names and mappings

## Non-Goals

- Do not change the runtime SyncEngine API
- Do not remove existing legacy config support
- Do not modify generated file formats (only how they're triggered)
- Do not add new peer dependencies
