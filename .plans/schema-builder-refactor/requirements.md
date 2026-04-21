# Requirements: Schema Builder Refactor

## Functional Requirements

### FR-001: SchemaManager Class
**Priority:** High
**Description:** Create a `SchemaManager` class that encapsulates all schema-related operations: serialization, persistence, and watch mode.

**Acceptance Criteria:**
- Class accepts a `SchemaConfig` with output path, format, autoBuild, and watch options
- Can serialize `EntitySyncConfig` + Drizzle introspection into JSON-compatible format
- Handles non-serializable values (SQL defaults, field codecs) by converting to config objects
- Can save schema to disk and load from disk
- Can start/stop file watching with debouncing
- Exposes `getSchema()` to retrieve current schema object
- Exposes `getOutputPath()` to retrieve resolved output path

### FR-002: SyncConfigBuilder Class
**Priority:** High
**Description:** Create a `SyncConfigBuilder` class that wraps the sync configuration and contains a `SchemaManager` instance.

**Acceptance Criteria:**
- Constructor accepts `SyncConfigInput` with optional schema configuration
- Instantiates `SchemaManager` when schema config is provided
- Auto-builds schema on construction if `autoBuild: true`
- Auto-starts watch mode if `watch: true`
- Exposes `buildSchema()` to manually trigger schema generation
- Exposes `getSchema()` to retrieve current schema
- Exposes `getRuntimeConfig()` for backend runtime usage (with hooks, functions intact)
- Maintains backward compatibility: existing `SyncConfig` properties accessible

### FR-003: Serialized Schema Format
**Priority:** High
**Description:** Define a stable, versioned JSON schema format that captures all necessary metadata for code generation.

**Acceptance Criteria:**
- Schema has `version` field (e.g., "1.0.0")
- Schema has `generatedAt` timestamp
- Each entity includes:
  - `name`, `tableName`
  - `columns` array with all metadata (name, dataType, drizzleType, notNull, hasDefault, default, primary, isEnum, enumValues, precision, scale, length)
  - `config` object with syncable, conflictResolver, apiPath, fieldCodecs (serialized), relations, metadata
  - `graph` object with parents, children, priority
- All values are JSON-serializable (no functions, no circular references)
- Default values from Drizzle SQL are converted to `{ __type: "sql", value: "..." }`
- Field codecs are converted to `{ kind: "...", nullable: boolean }`

### FR-004: defineSyncConfig Returns Builder
**Priority:** High
**Description:** Modify `defineSyncConfig()` to return a `SyncConfigBuilder` instance instead of a plain object.

**Acceptance Criteria:**
- `defineSyncConfig()` returns `SyncConfigBuilder`
- Existing usage patterns still work (property access delegates to builder)
- TypeScript types are preserved
- Can access `.schema` property for SchemaManager operations if needed
- Can call `.buildSchema()` explicitly

### FR-005: CLI Reads Schema JSON
**Priority:** High
**Description:** Refactor CLI to read `sync.schema.json` instead of importing and executing TypeScript config files.

**Acceptance Criteria:**
- `generate` command accepts `--schema` option pointing to schema.json
- If `--schema` not provided, searches for `sync.schema.json` in current directory and parent directories
- Validates schema version is compatible
- Passes parsed `SyncSchema` to generators instead of `SyncConfig`
- All existing CLI commands still work (generate, validate, clean)
- Fast execution (no TS compilation or module loading)

### FR-006: Generators Accept Schema
**Priority:** Medium
**Description:** Update all code generators to work with `SyncSchema` instead of executing Drizzle introspection.

**Acceptance Criteria:**
- `zod-generator.ts` reads column metadata from schema instead of `introspectTable()`
- `postgres-ddl-generator.ts` reads column metadata from schema
- `service-generator.ts` reads entity config and columns from schema
- `hooks-generator.ts` reads entity config and relations from schema
- `applier-generator.ts` reads column metadata from schema
- All generators produce identical output compared to current implementation
- No Drizzle imports needed during generation (only for building schema.json)

### FR-007: Watch Mode
**Priority:** Medium
**Description:** Implement automatic schema regeneration when sync.config.ts changes.

**Acceptance Criteria:**
- Watch mode enabled via `schema.watch: true` in sync.config.ts
- Detects changes to sync.config.ts file
- Debounces rapid changes (500ms)
- Regenerates schema.json automatically
- Logs to console when schema is rebuilt
- Can be stopped with `.stopWatch()` method

### FR-008: Backend Integration
**Priority:** Medium
**Description:** Update backend sync.config.ts to use new schema configuration.

**Acceptance Criteria:**
- Backend sync.config.ts includes `schema` configuration block
- Schema output path points to `packages/backend/src/sync.schema.json`
- Auto-build enabled for development
- Generated schema.json is tracked in git (versioned contract)

## Non-Functional Requirements

### NFR-001: Backward Compatibility
- Existing `SyncConfig` type and usage patterns must still work
- Legacy `EntityConfig` API remains unchanged
- No breaking changes to generated file formats

### NFR-002: Performance
- Schema generation should complete in < 2 seconds for 20 entities
- CLI generation should complete in < 1 second (no TS execution)
- Watch mode should not impact backend startup time significantly

### NFR-003: Type Safety
- All schema types must be fully typed
- No `any` types in public API
- Generated schema.json should have TypeScript declaration file

### NFR-004: Error Handling
- Clear error messages when schema is missing or invalid
- Validation of schema.json format before generation
- Graceful handling of missing or corrupted schema files
