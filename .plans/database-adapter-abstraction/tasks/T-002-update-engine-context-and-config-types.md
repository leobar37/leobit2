# T-002: Update Engine Context and Config Types for Adapter

## Objective

Add `adapter?: DatabaseAdapter` to `SyncClientEngineContext` and `SyncClientEngineConfig`, and update `SyncClientEngine` to auto-create `PgLiteAdapter` when running in legacy mode (pg+db provided).

## Requirements

- FR-003: Engine Context Supports Adapter
- FR-004: Engine Config Supports Adapter
- FR-005: Auto-Creation on Legacy Config
- NFR-001: Zero Breaking Changes

## Files to Modify

### 1. `packages/drizzle-sync/src/client/types.ts`

**Add to `SyncClientEngineContext` (line ~74):**

```typescript
export interface SyncClientEngineContext {
  /** PGlite instance for raw SQL queries (deprecated — use adapter) */
  pg: PGlite;
  /** Drizzle ORM instance for type-safe queries */
  db: ReturnType<typeof drizzle>;
  /** Database adapter for backend-agnostic SQL operations (preferred) */
  adapter?: DatabaseAdapter;
  /** Business/tenant ID for multi-tenancy */
  tenantId: string;
  /** Tenant partition column for scoped entities */
  tenantColumn: string;
  /** Business user ID for audit trails */
  userId: string;
  /** Sync service for enqueuing operations */
  syncService: SyncWritePort;
}
```

**Add to `SyncClientEngineConfig` (line ~272):**

```typescript
export interface SyncClientEngineConfig<TStage extends string = string> {
  /**
   * Database adapter (new mode — provide this OR pg/db).
   * When provided, the engine uses this adapter directly without PGlite-specific initialization.
   */
  adapter?: DatabaseAdapter;

  /**
   * PGlite database instance (legacy mode — provide this OR adapter).
   * ...existing JSDoc...
   */
  pg?: PGlite;

  /**
   * Drizzle ORM instance (legacy mode — provide this OR adapter).
   * ...existing JSDoc...
   */
  db?: ReturnType<typeof drizzle>;

  // ... rest of config remains unchanged
}
```

### 2. `packages/drizzle-sync/src/client/sync-client-engine.ts`

**Update `doInitialize()` method (line ~203):**

```typescript
private async doInitialize(): Promise<void> {
  // NEW: adapter-first initialization
  if (this.config.adapter) {
    this.pg = null; // No direct PGlite in adapter mode
    this.db = this.config.adapter.getDb() as ReturnType<typeof drizzle>;
  }
  // Auto-initialize database if databaseConfig is provided (PGlite mode)
  else if (this.config.databaseConfig) {
    const result = await initPgliteDatabase({
      ...this.config.databaseConfig,
      storageAdapter: this.storageAdapter,
    });
    this.pg = result.pg;
    this.db = result.db;
  }
  // Legacy mode: pg + db provided directly
  else if (this.config.pg && this.config.db) {
    this.pg = this.config.pg;
    this.db = this.config.db;
  }
  else {
    throw new Error(
      "SyncClientEngine requires 'adapter', 'databaseConfig', or both 'pg' and 'db'."
    );
  }

  // ... rest of initialization
}
```

**Update `instantiateServices()` method (line ~649):**

```typescript
private instantiateServices(): void {
  const { tenantId, userId, tenantColumn } = this.config;

  const context: SyncClientEngineContext = {
    pg: this.getPg(),
    db: this.getDb(),
    adapter: this.config.adapter, // NEW: pass adapter to context
    tenantId,
    tenantColumn: tenantColumn ?? "tenant_id",
    userId,
    syncService: this.syncService!,
  };

  for (const definition of this.config.entities) {
    const instance = definition.factory(context);
    this.services.set(definition.name, instance);
  }
}
```

**Update `getPg()` method (line ~174):**

```typescript
getPg(): PGlite {
  if (!this.pg) {
    if (this.config.adapter) {
      throw new Error(
        "getPg() is not available when running with a custom DatabaseAdapter. " +
        "Use getDb() for Drizzle queries or provide a PGlite adapter."
      );
    }
    throw new Error("PGlite not initialized. Call initialize() first.");
  }
  return this.pg;
}
```

## Acceptance Criteria

- [ ] `SyncClientEngineContext` has optional `adapter?: DatabaseAdapter` field
- [ ] `SyncClientEngineConfig` has optional `adapter?: DatabaseAdapter` field
- [ ] When `adapter` is provided, `doInitialize()` uses it directly (no PGlite init)
- [ ] When `pg`+`db` is provided (legacy), engine works identically to before
- [ ] When `databaseConfig` is provided, engine auto-inits PGlite as before
- [ ] `instantiateServices()` passes `adapter` to context
- [ ] `getPg()` throws clear error in adapter mode
- [ ] TypeScript builds clean

## Validation

```bash
cd packages/drizzle-sync
bun run build
```

Verify no TypeScript errors in modified files.

## Notes

- The `adapter` field in context is optional to maintain backward compat with existing service factories that destructure `context.pg` and `context.db`.
- Do NOT mark `pg` as optional in `SyncClientEngineContext` yet — that would break existing service factories. Deprecation happens in T-005.
