# T-004 Migrate Batch Processor to Framework

## Objective

Move `SyncBatchProcessor` from the app into `@avileo/drizzle-sync/pglite` with configurable entity priorities and batch size, making batch sending a framework-owned service.

## Requirements Covered

- `FR-005` - Batch processing with configurable priorities
- `FR-007` - Configurable tenantColumn
- `FR-008` - Configurable entity priorities
- `NFR-002` - Unit tests
- `NFR-003` - Type checking

## Dependencies

- `T-001` (Extract Generic Sync Infrastructure) - Needs SyncAutoRunner for backoff recording
- `T-002` (Migrate Operation Lifecycle Service) - Needs OperationLifecycleService for status updates

## Files or Areas Involved

- `packages/app/app/lib/sync/sync-batch-processor.ts` - Read | Migrate
- `packages/drizzle-sync/src/pglite/` - Create:
  - `batch-processor.ts`
- `packages/drizzle-sync/src/pglite/push-service.ts` - Modify | Use BatchProcessor
- `packages/drizzle-sync/src/pglite/index.ts` - Modify | Export BatchProcessor
- `packages/drizzle-sync/src/core/` - Review | Batch response types

## Actions

1. **Migrate core batch logic**
   - Copy `sync-batch-processor.ts` to `pglite/batch-processor.ts`
   - Keep all methods: `processPending()`, `processBatch()`, `syncOperation()`, `fetchPendingOperations()`
   - Constructor dependencies: `pg`, `tenantId`, `httpClient`, `lifecycleService`, `autoRunner`

2. **Make entity priorities configurable**
   - Replace hardcoded `ENTITY_PRIORITIES` from `@avileo/shared` with constructor option: `entityPriorities: string[]`
   - Default to empty array (no priority ordering)
   - Document that consumers pass their ordered entity list
   - Example: `['customer_groups', 'customer_group_members', 'customers', 'sales', ...]`

3. **Make tenantColumn configurable**
   - Parameterize SQL queries to use configurable `tenantColumn` (default: `tenant_id`)
   - Ensure `WHERE ${tenantColumn} = $1` pattern

4. **Make batch size configurable**
   - Accept `batchSize` in constructor (default: 50)
   - Use `BATCH_SIZE` from shared as default if available

5. **Integration with PushSyncService**
   - Update `PushSyncService` to create/use `BatchProcessor` internally
   - `processPending()` delegates to `BatchProcessor.processPending()`
   - This simplifies PushSyncService and makes batch logic testable independently

6. **Unit tests**
   - Create `packages/drizzle-sync/src/pglite/__tests__/batch-processor.test.ts`
   - Test priority ordering: entities with higher priority come first
   - Test batch chunking: operations split into batches of correct size
   - Test success path: all operations marked completed
   - Test partial failure: some failed, some completed
   - Test conflict path: operations marked conflict
   - Test backoff recording: success/failure recorded in autoRunner
   - Mock HTTP client and PGlite for isolated testing

7. **Update app**
   - Change `sync-service.ts` to not create local `SyncBatchProcessor`
   - Remove local `sync-batch-processor.ts`
   - Pass Avileo's entity priorities via engine configuration

## Completion Criteria

- `pglite/batch-processor.ts` exists with full implementation
- Entity priorities are configurable via constructor
- Batch size is configurable
- Tenant column is parameterized
- Unit tests cover ordering, chunking, success, failure, conflict
- App no longer has local `sync-batch-processor.ts`
- `bun test` passes in `packages/drizzle-sync`
- `bun run typecheck` passes in both packages

## Validation

- Run `cd packages/drizzle-sync && bun test` - batch processor tests pass
- Run `cd packages/app && bun run typecheck` - no errors
- Verify `PushSyncService` correctly integrates BatchProcessor

## Risks or Notes

- **Risk**: Priority ordering is critical for foreign key constraints (parent before child). Tests must verify ordering is preserved.
- **Risk**: The SQL query for fetching pending operations with priority ordering uses a complex ORDER BY clause. Ensure it works across different PGlite versions.
- **Note**: This is the service that actually talks to the backend. HTTP client mocking in tests is essential.
