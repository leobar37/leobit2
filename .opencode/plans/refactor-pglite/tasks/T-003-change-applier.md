# T-003: Refactor Change Applier

## Objective
Refactor change-applier.ts into domain/change/ with strategies, using SqlExecutor and context-based dependencies.

## Requirements Addressed
- FR-004: Change Application Refactor
- Partial: FR-002: Context-based injection
- Partial: FR-003: Logger injection

## Files to Create/Modify

### Create
- `packages/drizzle-sync/src/pglite/domain/change/types.ts` - Type definitions
- `packages/drizzle-sync/src/pglite/domain/change/strategies.ts` - Insert/Update/Delete strategies
- `packages/drizzle-sync/src/pglite/domain/change/conflict-checker.ts` - Conflict detection
- `packages/drizzle-sync/src/pglite/domain/change/applier.ts` - Main ChangeApplier class
- `packages/drizzle-sync/src/pglite/domain/change/index.ts` - Barrel exports

### Delete (after T-009)
- `packages/drizzle-sync/src/pglite/change-applier.ts`

## Implementation Details

### types.ts
```typescript
export interface ApplyResult {
  success: boolean;
  operation: 'insert' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  durationMs: number;
  conflictDetected?: boolean;
  error?: Error;
}

export interface BatchApplyResult {
  results: ApplyResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
    totalDurationMs: number;
  };
  entityTypesAffected: Set<string>;
}

export interface ApplierOptions {
  maxRetries?: number;
  checkConflicts?: boolean;
  conflictStrategy?: 'pre-computed-set' | 'check-db' | 'none';
  logger?: ISyncLogger;
}
```

### strategies.ts
```typescript
// Each strategy receives SqlExecutor, not PGlite
export async function executeInsert(
  executor: SqlExecutor,
  tableName: string,
  data: Record<string, unknown>,
  id: string,
  businessId: string
): Promise<void>;

export async function executeUpdate(
  executor: SqlExecutor,
  tableName: string,
  data: Record<string, unknown>,
  id: string,
  businessId: string
): Promise<void>;

export async function executeDelete(
  executor: SqlExecutor,
  tableName: string,
  id: string,
  businessId: string
): Promise<void>;
```

### applier.ts
```typescript
export class ChangeApplier {
  constructor(
    private context: SyncClientEngineContext,
    private options?: ApplierOptions
  ) {
    this.executor = createSqlExecutor(context);
    this.logger = options?.logger ?? new NoOpLogger();
  }

  async apply(change: PullChange): Promise<ApplyResult>;
  async applyBatch(changes: PullChange[]): Promise<BatchApplyResult>;
}
```

### Key Migration Notes
1. Move `toSnakeCase` and `filterValidColumns` from schema-mapper.ts (copy for now, delete original in T-009)
2. Use REQUIRED_COLUMN_DEFAULTS from config/defaults.ts
3. Use withRetry from core/backoff.ts (keep existing)
4. Conflict detection uses pre-computed set strategy (most efficient)

## Verification Steps
```bash
# Type check
cd packages/drizzle-sync && bun run typecheck

# Build
cd packages/drizzle-sync && bun run build

# Run tests if they exist
cd packages/drizzle-sync && bun test 2>/dev/null || echo "No tests to run"
```

## Dependencies
- **T-001**: SqlExecutor must exist
- **T-002**: Config defaults must exist

## Deliverables
1. All 5 files in domain/change/
2. ChangeApplier class with context-based constructor
3. Strategies for insert/update/delete
4. Conflict checker module
5. Full TypeScript types

## Acceptance Criteria
- [ ] ChangeApplier uses SyncClientEngineContext
- [ ] No direct PGlite dependency in domain/change/
- [ ] SqlExecutor used for all SQL operations
- [ ] Logger injected via options
- [ ] All SQL from original change-applier.ts migrated
- [ ] Upsert behavior preserved
- [ ] Retry logic preserved
- [ ] Conflict detection preserved
