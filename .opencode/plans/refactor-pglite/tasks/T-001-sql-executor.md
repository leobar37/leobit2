# T-001: Create SqlExecutor Abstraction

## Objective
Create an SqlExecutor abstraction that wraps PGlite operations, enabling dependency injection and test mocking.

## Requirements Addressed
- FR-001: SqlExecutor Abstraction

## Files to Create/Modify

### Create
- `packages/drizzle-sync/src/pglite/infra/sql-executor.ts` - Main implementation
- `packages/drizzle-sync/src/pglite/infra/index.ts` - Barrel exports

### Modify
None (new files only)

## Implementation Details

### SqlExecutor Interface
```typescript
// infra/sql-executor.ts
export interface SqlExecutor {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
}

export class PgLiteSqlExecutor implements SqlExecutor {
  constructor(private pg: PGlite) {}

  async query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    return this.pg.query(sql, params);
  }

  async exec(sql: string): Promise<void> {
    await this.pg.exec(sql);
  }
}

export function createSqlExecutor(context: SyncClientEngineContext): SqlExecutor {
  return new PgLiteSqlExecutor(context.pg);
}
```

### Key Decisions
1. Simple interface - only `query` and `exec` methods
2. Wraps PGlite directly - no additional abstraction layer needed
3. Factory function accepts context for easy instantiation
4. No transaction support in initial version (PGlite limitation)

## Verification Steps

```bash
# Build package
cd packages/drizzle-sync && bun run build

# Type check
cd packages/drizzle-sync && bun run typecheck

# Verify interface is exportable
# (Check that index.ts can re-export without errors)
```

## Dependencies
- None (foundation task)

## Deliverables
1. `infra/sql-executor.ts` with interface and implementation
2. `infra/index.ts` with exports
3. No test files needed (infra layer tested via integration)

## Acceptance Criteria
- [ ] SqlExecutor interface defined
- [ ] PgLiteSqlExecutor implements interface correctly
- [ ] createSqlExecutor factory function exported
- [ ] No TypeScript errors
- [ ] Can be imported from pglite/infra
