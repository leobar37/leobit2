# T-004 — Migrate Backend Repositories to Implement Library Interfaces

## Objective

Refactor `packages/backend/src/services/sync/framework/SyncOperationRepository.ts`, `SyncConflictRepository.ts`, and `SyncDeadLetterRepository.ts` to explicitly implement the corresponding `ISyncOperationRepository`, `ISyncConflictRepository`, and `ISyncDeadLetterRepository` interfaces from `@avileo/drizzle-sync/server`. The repository implementations remain in the backend package (Drizzle schema bindings are app-specific), but their public APIs are governed by the library interfaces.

## Requirements Covered

- `FR-005` — Backend's repositories implement the library's repository interfaces using Drizzle

## Dependencies

- T-003 (repository interface alignment must be complete before implementing — interfaces must be final)

## Files or Areas Involved

- `packages/backend/src/services/sync/framework/SyncOperationRepository.ts` — Modify (implement `ISyncOperationRepository`)
- `packages/backend/src/services/sync/framework/SyncConflictRepository.ts` — Modify (implement `ISyncConflictRepository`)
- `packages/backend/src/services/sync/framework/SyncDeadLetterRepository.ts` — Modify (implement `ISyncDeadLetterRepository`)
- `packages/drizzle-sync/src/server/operation-repository.ts` — Review (confirm interface)
- `packages/drizzle-sync/src/server/conflict-repository.ts` — Review (confirm interface)
- `packages/drizzle-sync/src/server/dead-letter-repository.ts` — Review (confirm interface)
- `packages/backend/src/services/sync/types.ts` — Review (backend-specific types used in repositories)

## Actions

1. **Import library interfaces** in each repository file:
   ```typescript
   import type { ISyncOperationRepository } from "@avileo/drizzle-sync/server";
   ```

2. **Update class declaration** to implement the interface:
   ```typescript
   export class SyncOperationRepository implements ISyncOperationRepository<RequestContext, DbTransaction>
   ```

3. **Align method signatures** with the library interface — check each method's parameters, return types, and generic constraints. Fix any mismatches:
   - `findByIdempotencyKey(ctx, key, tx)` — confirm signature matches
   - `insertOrUpdate(ctx, operation, tx)` — confirm return type (`"inserted" | "updated" | "already-processed"`)
   - `updateStatus(ctx, key, status, error, tx, payload)` — confirm parameter order and optionality
   - Add any missing methods that the interface declares but the implementation lacks

4. **Keep Drizzle-specific internals**:
   - The `sql` templates, `drizzle-orm` imports, and table references stay in the backend
   - Only the public interface (method signatures, return types) must align with the library

5. **SyncOperationRepository specific**:
   - Confirm `findById`, `findProcessedAfter`, `deleteOldProcessed` are NOT in the library interface
   - If they exist in the backend implementation but not the library interface: keep them as backend-specific extensions (not required by the library contract)
   - If the library interface needs them: add them to the library interface first (T-003), then implement here

6. **SyncConflictRepository specific**:
   - Confirm `findById`, `findByOperationId`, `findPendingByBusiness`, `findByBusiness`, `countPending`, `resolve`, `delete`, `deleteByOperationId`
   - All should be in the library interface already (from T-003 alignment)

7. **SyncDeadLetterRepository specific**:
   - Confirm `create`, `findById`, `findByBusiness`, `findByEntity`, `countByBusiness`, `delete`, `deleteOld`
   - All should be in the library interface

8. **Run typecheck**:
   - `cd packages/backend && bun run typecheck` must pass with no errors related to repository interface conformance

## Completion Criteria

- `SyncOperationRepository` implements `ISyncOperationRepository<RequestContext, DbTransaction>`
- `SyncConflictRepository` implements `ISyncConflictRepository<RequestContext, DbTransaction>`
- `SyncDeadLetterRepository` implements `ISyncDeadLetterRepository<RequestContext, DbTransaction>`
- All method signatures match the library interfaces exactly
- Backend `bun run typecheck` passes without repository-related errors

## Validation

- `cd packages/backend && bun run typecheck` — zero errors
- Existing repository tests in `packages/backend/src/services/sync/framework/__tests__/` pass (if any exist)
- Backend `bun test` passes for sync-related tests

## Risks or Notes

- The `RequestContext` and `DbTransaction` generic types must match between the library interface and the backend's concrete type aliases. If T-003's DbTransaction adapter strategy uses different generics, update here accordingly.
- Some backend repository methods may not exist in the library interface (e.g., `deleteOldProcessed`). These are kept as backend-specific extensions and do not violate the interface contract.
