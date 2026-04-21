# T-004: Refactor Queue to Domain

## Objective
Refactor pg-sync-queue.ts into domain/queue/ using repository pattern and SqlExecutor.

## Requirements Addressed
- FR-005: Queue Operations Refactor
- Partial: FR-002: Context-based injection
- Partial: FR-003: Logger injection

## Files to Create/Modify

### Create
- `packages/drizzle-sync/src/pglite/domain/queue/types.ts` - Queue type definitions
- `packages/drizzle-sync/src/pglite/domain/queue/repository.ts` - SQL operations for queue
- `packages/drizzle-sync/src/pglite/domain/queue/coalescer.ts` - Coalescing logic
- `packages/drizzle-sync/src/pglite/domain/queue/queue.ts` - PgSyncQueue implementation
- `packages/drizzle-sync/src/pglite/domain/queue/index.ts` - Barrel exports

### Delete (after T-009)
- `packages/drizzle-sync/src/pglite/pg-sync-queue.ts`

## Implementation Details

### Repository Pattern
```typescript
// repository.ts
export class QueueRepository {
  constructor(private executor: SqlExecutor, private businessId: string) {}

  async insert(operation: SyncOperationRecord): Promise<void>;
  async findPending(limit: number): Promise<SyncOperationRecord[]>;
  async updateStatus(id: string, status: string): Promise<void>;
  async findById(id: string): Promise<SyncOperationRecord | null>;
  async delete(id: string): Promise<void>;
  async getStatus(): Promise<SyncStatus>;
  // ... all SQL operations
}
```

### Coalescer Extraction
```typescript
// coalescer.ts
export function getCoalescePlan(
  existing: SyncOperationRecord,
  incoming: EnqueueParams
): CoalescePlan;
```

### Queue Implementation
```typescript
// queue.ts
export class PgSyncQueue implements ISyncQueue {
  constructor(
    private context: SyncClientEngineContext,
    private options?: QueueOptions
  ) {
    this.repository = new QueueRepository(
      createSqlExecutor(context),
      context.businessId
    );
    this.logger = options?.logger ?? new NoOpLogger();
  }

  async enqueue(params: EnqueueParams): Promise<string>;
  async getPending(limit: number): Promise<SyncOperationRecord[]>;
  // ... all ISyncQueue methods
}
```

## Migration Notes
1. OPERATION_STATUS constants - keep as const object
2. Entity priority logic - move from SQL CASE to TypeScript sorting
3. Coalescing logic - extract from enqueue() to separate functions
4. All SQL operations move to repository

## Verification Steps
```bash
# Type check
cd packages/drizzle-sync && bun run typecheck

# Build
cd packages/drizzle-sync && bun run build
```

## Dependencies
- **T-001**: SqlExecutor
- No dependency on T-003 (can work in parallel)

## Deliverables
1. All 5 files in domain/queue/
2. QueueRepository with all SQL operations
3. Coalescer module
4. PgSyncQueue implementing ISyncQueue
5. Full type safety

## Acceptance Criteria
- [ ] Queue uses SyncClientEngineContext
- [ ] Repository pattern implemented
- [ ] Coalescing logic extracted
- [ ] Priority ordering maintained
- [ ] All ISyncQueue methods implemented
- [ ] Logger injected
- [ ] No direct PGlite in domain/queue/
