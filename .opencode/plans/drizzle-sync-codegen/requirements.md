# Requirements

## Functional Requirements

### FR-001: Define Sync Config API
**Priority**: High  
Create a type-safe `defineSyncConfig()` function that accepts entity definitions with hybrid field configuration.

**Acceptance Criteria**:
- [ ] Support `table` property referencing Drizzle table
- [ ] Support optional `fields` array for explicit whitelist
- [ ] Support `autoFields: true` with `excludeFields` array
- [ ] Support `syncable: boolean` flag
- [ ] Support `priority: number` for operation ordering
- [ ] Support `conflictResolver` enum
- [ ] Support optional `hooks` object (beforeSync, afterSync, onConflict)
- [ ] Full TypeScript type inference from Drizzle schema

### FR-002: CLI Tool Infrastructure
**Priority**: High  
Create a CLI tool that can be invoked via `bun run sync:generate`.

**Acceptance Criteria**:
- [ ] CLI entry point in `packages/drizzle-sync/src/cli.ts`
- [ ] Load and parse `sync.config.ts` from backend
- [ ] Execute introspection on Drizzle schema
- [ ] Generate all output files
- [ ] Report progress and changes
- [ ] Exit with error code on failure
- [ ] bin entry in package.json for `drizzle-sync` package

### FR-003: Drizzle Introspection Module
**Priority**: High  
Extract column metadata from Drizzle table definitions.

**Acceptance Criteria**:
- [ ] Use `getTableColumns()` from drizzle-orm
- [ ] Extract: name, dataType, notNull, default, primary
- [ ] Map Drizzle types to internal type system
- [ ] Handle all Drizzle pg-core column types used in project
- [ ] Support relations detection (optional for v1)

### FR-004: Zod Schema Generator
**Priority**: High  
Generate Zod schemas from Drizzle column definitions.

**Acceptance Criteria**:
- [ ] Map pg UUID → z.string()
- [ ] Map pg varchar/text → z.string()
- [ ] Map pg integer → z.number()
- [ ] Map pg boolean → z.boolean()
- [ ] Map pg timestamp → z.coerce.date()
- [ ] Map pg enum → z.enum()
- [ ] Handle nullable columns with .nullable()
- [ ] Handle default values
- [ ] Add syncStatus enum field automatically
- [ ] Generate TypeScript types from schemas

### FR-005: PGlite DDL Generator
**Priority**: High  
Generate SQL CREATE TABLE statements for PGlite.

**Acceptance Criteria**:
- [ ] Generate valid SQLite-compatible SQL
- [ ] Map Drizzle types to SQLite types
- [ ] Include primary key definitions
- [ ] Include NOT NULL constraints
- [ ] Add sync_status column if not present
- [ ] Add sync_attempts column if not present
- [ ] Include indexes for sync_status and business_id

### FR-006: Change Applier Config Generator
**Priority**: High  
Generate column whitelist configuration for the change applier.

**Acceptance Criteria**:
- [ ] Generate VALID_TABLES set
- [ ] Generate TABLE_COLUMNS whitelist per table
- [ ] Include relation field detection
- [ ] Generate DEFAULTS for required columns
- [ ] Support hybrid field definition resolution
- [ ] Output TypeScript file with exports

### FR-007: React Hooks Generator
**Priority**: Medium  
Generate React Query hooks for entities using **CUID2 frontend-generated IDs**.

**Acceptance Criteria**:
- [ ] Generate useQuery hook for list (use{Entity}List)
- [ ] Generate useQuery hook for single item (use{Entity})
- [ ] Generate useMutation hook for create (useCreate{Entity}) with CUID2
- [ ] Generate useMutation hook for update (useUpdate{Entity})
- [ ] Generate useMutation hook for delete (useDelete{Entity})
- [ ] Use generated Zod schemas for validation
- [ ] Include proper query key structure
- [ ] **Use `createId()` from @paralleldrive/cuid2 for ID generation**
- [ ] **Return real ID immediately (no temp→real mapping)**
- [ ] **Support cascade create for parent-child with real IDs**
- [ ] Include optimistic updates

### FR-007-B: CUID2 ID Architecture
**Priority**: High  
Implement CUID2 frontend ID generation for stable URLs and simple sync.

**Acceptance Criteria**:
- [ ] Frontend generates IDs using `createId()` from @paralleldrive/cuid2
- [ ] Backend accepts client-provided IDs (no defaultRandom())
- [ ] Same ID used in: frontend, URL, PGlite, PostgreSQL
- [ ] No temp→real ID mapping required
- [ ] URLs stable from entity creation
- [ ] No post-sync redirects needed
- [ ] References use direct real IDs (no @ref: placeholders)

### FR-008: Backend Integration
**Priority**: High  
Create the sync.config.ts file in backend and wire up the system.

**Acceptance Criteria**:
- [ ] Create `packages/backend/src/sync.config.ts`
- [ ] Define all existing syncable entities
- [ ] Use hybrid field definition appropriately
- [ ] Configure conflict resolvers
- [ ] Add sync:generate script to backend package.json
- [ ] Add sync:validate script to backend package.json

### FR-009: Frontend Integration
**Priority**: High  
Update frontend to use generated code.

**Acceptance Criteria**:
- [ ] Add `generated/` directory to .gitignore
- [ ] Update collections.ts to import from generated
- [ ] Update hooks to use generated hooks
- [ ] Ensure build fails gracefully if generated files missing
- [ ] Document migration path from manual schemas

### FR-010: CLI Validation Command
**Priority**: Medium  
Add `bun run sync:validate` command.

**Acceptance Criteria**:
- [ ] Validate sync.config.ts without generating
-- [ ] Check all referenced tables exist
- [ ] Check all field names are valid columns
- [ ] Report errors with line numbers
- [ ] Exit with appropriate status code

### FR-011: CLI Diff Command
**Priority**: Low  
Add `bun run sync:diff` command.

**Acceptance Criteria**:
- [ ] Compare current generated files with schema
- [ ] Show which entities have changed
- [ ] Show which fields were added/removed
- [ ] Color-coded output (green=added, red=removed, yellow=modified)

## Non-Functional Requirements

### NFR-001: Type Safety
**Priority**: High  
All generated code must be fully typed with TypeScript.
- No `any` types in generated code
- Generated types must match runtime behavior
- Config must have full type inference

### NFR-002: Performance
**Priority**: Medium  
Code generation should complete in under 5 seconds.
- Introspection must be efficient
- File I/O should be batched
- No unnecessary AST parsing

### NFR-003: Backward Compatibility
**Priority**: High  
Migration path from manual schemas to generated.
- Manual schemas continue to work during transition
- Gradual migration possible entity by entity
- Clear documentation on how to migrate

### NFR-004: Developer Experience
**Priority**: High  
Clear error messages and helpful output.
- Validation errors show file and line
- Generation shows progress
- Diff shows clear changes
- IDE autocomplete for config

### NFR-005: Maintainability
**Priority**: Medium  
Code generators should be maintainable.
- Modular generator functions
- Tested with snapshots
- Clear separation of concerns

## Dependencies

### Technical Dependencies
- `drizzle-orm` - Schema introspection
- `zod` - Schema generation target
- `@electric-sql/pglite` - DDL generation target
- `commander` or `clack` - CLI framework

### Project Dependencies
- Existing Drizzle schema files
- Existing sync architecture
- Existing change applier

## Constraints

1. **No Drizzle in Frontend** - Keep SQL raw approach for change applier
2. **Backend is Source of Truth** - Config lives only in backend
3. **Manual Generation** - No watch mode in v1
4. **Hybrid Field Definition** - Must support all three modes
5. **Type Safety** - No runtime errors from generated code
6. **CUID2 Frontend IDs** - Use @paralleldrive/cuid2 for ID generation, no temp→real mapping
7. **Backend Accepts Client IDs** - Remove defaultRandom(), store client-provided CUID2 as PK

## Architecture Decision: CUID2 Frontend IDs

### Rationale

| Approach | Complexity | URL Stability | Offline Support | Redirects |
|----------|-----------|---------------|-----------------|-----------|
| Backend UUID + Mapping | High (temp→real layer) | Post-sync redirects | Complex | Required |
| **CUID2 Frontend** | **Low** | **Stable from start** | **Simple** | **None** |

### Trade-offs

**Pros:**
- URLs work immediately and forever
- No complex ID mapping layer
- 100% offline capable
- Simple sync (same ID everywhere)
- 128-bit collision resistance (practically unique)

**Cons:**
- Must update backend to accept client IDs
- IDs are predictable (not security risk, but less opaque than UUIDv4)
- 25 chars vs 36 chars (UUID) - slightly longer

### Decision

Use **CUID2 frontend-generated IDs** for all entities. Backend accepts and stores these IDs as-is.
