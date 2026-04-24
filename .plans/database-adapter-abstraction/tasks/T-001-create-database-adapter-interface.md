# T-001: Create DatabaseAdapter Interface and PgLiteAdapter

## Objective

Create the core database abstraction (`DatabaseAdapter` interface) and its PGlite implementation (`PgLiteAdapter`). This is a pure addition — no existing files are modified.

## Requirements

- FR-001: DatabaseAdapter Interface
- FR-002: PgLiteAdapter Implementation

## Files to Create

### 1. `packages/drizzle-sync/src/core/database-adapter.ts`

Create the `DatabaseAdapter` interface in the `core/` module (runtime-agnostic):

```typescript
/**
 * DatabaseAdapter
 * Abstraction for SQL execution and Drizzle ORM access.
 * Enables the sync engine to work with multiple database backends
 * (PGlite, SQLite, PostgreSQL, etc.).
 */
export interface DatabaseAdapter {
  /**
   * Execute a SELECT query and return rows.
   * Must return an object with a `rows` array.
   */
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;

  /**
   * Execute a non-SELECT statement (INSERT, UPDATE, DELETE, DDL).
   */
  exec(sql: string, params?: unknown[]): Promise<void>;

  /**
   * Get the Drizzle ORM instance associated with this adapter.
   * The return type is intentionally generic — consumers should use
   * their schema-specific Drizzle instance type.
   */
  getDb(): unknown;
}
```

### 2. `packages/drizzle-sync/src/pglite/pglite-adapter.ts`

Create the PGlite implementation:

```typescript
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { DatabaseAdapter } from "../core/database-adapter";

/**
 * PGlite implementation of DatabaseAdapter.
 * Wraps a PGlite instance and its Drizzle ORM companion.
 */
export class PgLiteAdapter implements DatabaseAdapter {
  constructor(
    private readonly pg: PGlite,
    private readonly db: ReturnType<typeof drizzle>
  ) {}

  async query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    return this.pg.query<T>(sql, params);
  }

  async exec(sql: string, params?: unknown[]): Promise<void> {
    if (params) {
      await this.pg.query(sql, params);
    } else {
      await this.pg.exec(sql);
    }
  }

  getDb(): ReturnType<typeof drizzle> {
    return this.db;
  }
}
```

## Acceptance Criteria

- [ ] `packages/drizzle-sync/src/core/database-adapter.ts` exists and exports `DatabaseAdapter`
- [ ] `packages/drizzle-sync/src/pglite/pglite-adapter.ts` exists and exports `PgLiteAdapter`
- [ ] `PgLiteAdapter` correctly implements `DatabaseAdapter`
- [ ] TypeScript builds clean on these new files
- [ ] No existing files modified

## Validation

```bash
cd packages/drizzle-sync
bunx tsc --noEmit src/core/database-adapter.ts src/pglite/pglite-adapter.ts
```

## Notes

- Keep `getDb()` returning `unknown` (or `any` if needed for Drizzle compatibility) to avoid coupling the interface to a specific Drizzle import. Consumers can cast as needed.
- `PgLiteAdapter.exec()` mirrors the existing `PgLiteSqlExecutor.exec()` behavior exactly.
