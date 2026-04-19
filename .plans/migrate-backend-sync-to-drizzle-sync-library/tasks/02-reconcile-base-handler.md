# T-002 — Reconcile BaseSyncHandler: Add PostgreSQL Error Extraction and Logger Integration

## Objective

Update `packages/drizzle-sync/src/server/base-handler.ts` to include all production features present in the backend's `BaseSyncHandler` that the library version lacks: PostgreSQL error extraction (`pgErrorCode`, `pgErrorDetail`, `pgErrorRoutine`), proper `ISyncLogger` integration, and correlation ID support. The result is a `BaseSyncHandler` that is truly production-ready without requiring backend-specific workarounds.

## Requirements Covered

- `FR-003` — `BaseSyncHandler` supports PostgreSQL error extraction with configurable error classifier
- `FR-007` — Library logger adapter bridges backend's `SyncLogger` to library's `ISyncLogger` interface

## Dependencies

- T-001 (must be complete: audit findings on BaseSyncHandler differences are needed before this starts)

## Files or Areas Involved

- `packages/drizzle-sync/src/server/base-handler.ts` — Modify (add PostgreSQL error extraction, logger injection)
- `packages/drizzle-sync/src/server/types.ts` — Modify (add logger to `SyncHandlerDeps`)
- `packages/drizzle-sync/src/core/interfaces.ts` — Review (confirm `ISyncLogger` interface)
- `packages/drizzle-sync/src/server/sync-logger.ts` — Review (confirm `SyncLoggerAdapter` behavior)
- `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` — Reference (source of PostgreSQL error extraction logic)

## Actions

1. **Add logger injection to `BaseSyncHandler`**:
   - Add optional `logger?: ISyncLogger` to constructor or `initialize()` method
   - If logger not provided, fall back to `console.*` (preserve current default)
   - Update `logStart`, `logSuccess`, `logError` to delegate to injected logger when available

2. **Add PostgreSQL error extraction**:
   - Extract the error chain walking logic from backend's `BaseSyncHandler`:
     ```typescript
     const pgError = (error as any).cause?.cause ?? (error as any).cause ?? error;
     const pgErrorCode = pgError.code || null;
     const pgErrorDetail = pgError.detail || null;
     const pgErrorRoutine = pgError.routine || null;
     ```
   - Add a protected `extractPostgresError(error: Error)` method to `BaseSyncHandler`
   - Use this in `logError` to attach PostgreSQL context when available
   - Make this behavior conditional: only extract when the error has a `cause` chain (avoid false positives on non-PostgreSQL errors)

3. **Add correlation ID support**:
   - Add optional `correlationId?: string` parameter to `logStart`, `logSuccess`, `logError`
   - Accept correlation ID from operation context
   - If logger is injected, pass correlation ID through the log entry

4. **Add error classification**:
   - Add a protected `classifyError(error: Error): string` method
   - Categories: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `DATABASE_ERROR`, `NETWORK_ERROR`, `UNKNOWN_ERROR`
   - Same logic as backend's `SyncLogger.classifyError` (Spanish strings: "requiere", "no encontrado")
   - This enables `SyncLogger.logError` to work correctly with categorized errors

5. **Expose `logValidationError`**:
   - Backend's `BaseSyncHandler` calls `syncLogger.logValidationError` in some handlers
   - Add `logValidationError(ctx, opContext, error, payload, validationErrors)` to the library's `BaseSyncHandler`
   - Or: ensure the logger interface supports this via a generic `log` method with a severity/type discriminator

6. **Update `SyncHandlerDeps` in `types.ts`**:
   - Confirm `SyncHandlerDeps` includes logger capability
   - If not, add optional `logger?: ISyncLogger` to `SyncHandlerDeps`

7. **Update `SyncLoggerAdapter`** (in `sync-logger.ts`):
   - Confirm the adapter properly bridges the server `SyncLogger` to `ISyncLogger`
   - Ensure `SyncLoggerAdapter` can be passed to `BaseSyncHandler` as its logger

8. **Run typecheck**:
   - `cd packages/drizzle-sync && bun run typecheck` must pass
   - Fix any type errors introduced by changes

## Completion Criteria

- Library's `BaseSyncHandler` has `extractPostgresError()`, `classifyError()`, and logger injection
- `logStart`, `logSuccess`, `logError` delegate to injected `ISyncLogger` when available
- TypeScript compiles without errors in `packages/drizzle-sync`
- Backend's concrete handlers (SaleSyncHandler, CustomerSyncHandler, etc.) can extend the updated `BaseSyncHandler` without changes to their own logging/error handling code (they already call the protected methods)

## Validation

- `bun run typecheck` in `packages/drizzle-sync` passes
- Backend concrete handler `logError` output includes `pgErrorCode`, `pgErrorDetail`, `pgErrorRoutine` when a PostgreSQL error occurs (testable via existing sync handler tests)
- Backend's existing `syncLogger.logError` continues to work via the adapter

## Risks or Notes

- This task modifies the library's public `BaseSyncHandler` API. Any frontend PGlite handlers (if they exist) that extend `BaseSyncHandler` will be affected. Check if any `pglite/` submodule handlers exist.
- The Spanish strings in error classification ("requiere", "no encontrado") are already in the library's `sync-logger.ts` — confirm they are also in the classification method being added.
