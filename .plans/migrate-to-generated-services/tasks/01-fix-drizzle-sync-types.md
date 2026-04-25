# T-001 Fix drizzle-sync Type Contract

## Objective

Fix the `drizzle-sync` type system so that `EntityServiceDefinition.factory` receives the full `SyncClientEngine` instance instead of an incompatible `SyncClientEngineContext`.

## Requirements Covered

- `FR-001`
- `FR-002`
- `FR-003`

## Dependencies

- none

## Files or Areas Involved

- `packages/drizzle-sync/src/client/types.ts` — Modify `EntityServiceDefinition` interface
- `packages/drizzle-sync/src/client/sync-client-engine.ts` — Modify `instantiateServices()` method

## Actions

1. In `client/types.ts`, change `EntityServiceDefinition.factory` signature:
   ```typescript
   // FROM:
   factory: (context: SyncClientEngineContext) => T;
   // TO:
   factory: (engine: SyncClientEngine) => T;
   ```

2. In `client/sync-client-engine.ts`, modify `instantiateServices()` method (around line 681):
   ```typescript
   // FROM:
   const instance = definition.factory(context);
   // TO:
   const instance = definition.factory(this);
   ```

3. Remove the now-unused `context` variable construction from `instantiateServices()` (lines 672-678) if it's no longer used elsewhere in the method.

4. Verify `SyncClientEngine` implements all methods expected by `SyncClientEngineLike`:
   - `getPg(): PGlite`
   - `getDb(): ReturnType<typeof drizzle>`
   - `getSyncOperations(): SyncWritePort | null`
   - `getConfig(): { tenantId: string; userId: string }`
   - `tables: Record<string, unknown>`

## Completion Criteria

- `EntityServiceDefinition.factory` signature accepts `SyncClientEngine` parameter
- `instantiateServices()` passes `this` to `definition.factory()`
- `SyncClientEngine` type-checks as implementing `SyncClientEngineLike`

## Validation

- Run `bun test` in `packages/drizzle-sync/` (some tests will fail until T-002)
- Verify TypeScript compilation: `cd packages/drizzle-sync && bun run build` or `bun run typecheck`

## Risks or Notes

- `SyncClientEngineContext` is still used by push/pull services and queue internally. Do not remove the interface or its usages in those areas—only change the factory contract.
- The `context` variable in `instantiateServices()` might still be needed for other purposes; verify before removing.
