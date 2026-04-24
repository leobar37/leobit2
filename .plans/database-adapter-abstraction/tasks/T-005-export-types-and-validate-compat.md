# T-005: Export Types and Validate Backward Compatibility

## Objective

Export new types from `src/index.ts`, add deprecation notices to legacy APIs, and validate zero breaking changes.

## Requirements

- FR-011: Export New Types
- NFR-001: Zero Breaking Changes
- NFR-002: Type Safety
- NFR-004: Clear Deprecation Path

## Files to Modify

### 1. `packages/drizzle-sync/src/index.ts`

**Add exports after existing core exports (line ~44):**

```typescript
// ============================================================================
// Database Adapter (new — supports multiple backends)
// ============================================================================

export type { DatabaseAdapter } from "./core/database-adapter";
export { PgLiteAdapter } from "./pglite/pglite-adapter";
```

### 2. `packages/drizzle-sync/src/client/types.ts`

**Add `@deprecated` JSDoc to `pg` field in `SyncClientEngineContext`:**

```typescript
export interface SyncClientEngineContext {
  /**
   * PGlite instance for raw SQL queries.
   * @deprecated Use `adapter` for backend-agnostic access. `pg` will be removed in a future version.
   */
  pg: PGlite;
  /** Drizzle ORM instance for type-safe queries */
  db: ReturnType<typeof drizzle>;
  /** Database adapter for backend-agnostic SQL operations (preferred) */
  adapter?: DatabaseAdapter;
  // ...
}
```

**Add `@deprecated` JSDoc to `pg`/`db` fields in `SyncClientEngineConfig`:**

```typescript
export interface SyncClientEngineConfig<TStage extends string = string> {
  // ...
  /**
   * PGlite database instance (legacy mode — provide this OR adapter).
   * @deprecated Provide `adapter` instead for backend portability.
   */
  pg?: PGlite;
  /**
   * Drizzle ORM instance (legacy mode — provide this OR adapter).
   * @deprecated Provide `adapter` instead for backend portability.
   */
  db?: ReturnType<typeof drizzle>;
  // ...
}
```

### 3. `packages/drizzle-sync/src/client/sync-client-engine.ts`

**Add `@deprecated` JSDoc to `getPg()`:**

```typescript
/**
 * Get the PGlite instance.
 * @deprecated Use `getDb()` for Drizzle queries or pass a DatabaseAdapter for backend-agnostic access.
 */
getPg(): PGlite {
  // ...existing implementation
}
```

## Validation Steps

### VR-001: Browser Path Unchanged

Run the browser app and verify sync works:

```bash
cd packages/app
bun run dev
```

Verify:
- [ ] App loads without errors
- [ ] Sync operations work (create sale, pull changes)
- [ ] No console errors related to drizzle-sync

### VR-002: TypeScript Build Clean

```bash
cd packages/drizzle-sync
bun run build
```

Verify:
- [ ] Zero TypeScript errors
- [ ] Zero warnings (or only pre-existing ones)

### VR-003: App TypeScript Clean

```bash
cd packages/app
bun run typecheck  # or equivalent
```

Verify:
- [ ] Zero new TypeScript errors
- [ ] Zero new warnings

### VR-004: Consumer Code Unchanged

Check that no files in `packages/app/app/lib/services/` or `packages/app/app/lib/sync/` needed modification:

```bash
grep -r "getPg()" packages/app/app/lib/services/ || echo "No direct getPg usage in services"
grep -r "context.pg" packages/app/app/lib/services/ || echo "No direct context.pg in services"
```

## Acceptance Criteria

- [ ] `DatabaseAdapter` and `PgLiteAdapter` exported from `src/index.ts`
- [ ] `@deprecated` JSDoc added to `pg`, `db` config fields and `getPg()`
- [ ] `packages/drizzle-sync` builds clean
- [ ] `packages/app` type-checks clean (no new errors)
- [ ] Browser app runs correctly with zero visible changes
- [ ] No modifications needed in `packages/app` service files

## Notes

- Deprecation notices are JSDoc-only — no runtime warnings yet. Runtime deprecation warnings can be added later.
- If `packages/app` uses `getPg()` directly anywhere, document it as known tech debt for future migration.
