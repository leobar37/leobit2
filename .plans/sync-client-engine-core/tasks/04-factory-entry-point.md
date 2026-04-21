# T-004 Create Factory Function and Client Entry Point

## Objective

Create the `createSyncClientEngine(config)` factory function and wire it as the new `@avileo/drizzle-sync/client` entry point in the package build configuration.

## Requirements Covered

- `FR-008`
- `FR-011`
- `NFR-001`

## Dependencies

- `T-001` (config types)
- `T-002` (engine class)
- `T-003` (service registry)

## Files or Areas Involved

- `packages/drizzle-sync/src/client/create-sync-client-engine.ts` — **Create** — Factory function
- `packages/drizzle-sync/src/client/index.ts` — **Create** — Client barrel export
- `packages/drizzle-sync/package.json` — **Modify** — Add `/client` entry to exports
- `packages/drizzle-sync/tsup.config.ts` — **Modify** — Add client entry point to build config
- `packages/drizzle-sync/src/index.ts` — **Review** — Verify no conflicts with existing exports

## Actions

1. Create `create-sync-client-engine.ts` with the factory function:
   - Accept `SyncClientEngineConfig`
   - Optionally validate required fields (pg, db, businessId, authToken)
   - Return `new SyncClientEngine(config)`
2. Create `client/index.ts` barrel export:
   - Export `SyncClientEngine` class
   - Export `createSyncClientEngine` factory
   - Re-export all config types from `types.ts`
   - Re-export `SyncEventEmitter`, `ISyncEventEmitter`, `SyncEventType` from core for convenience
3. Add to `package.json` exports:
   ```json
   "./client": {
     "types": "./dist/client/index.d.ts",
     "import": "./dist/client/index.js"
   }
   ```
4. Add to `tsup.config.ts` entry points:
   - Add `client` entry pointing to `src/client/index.ts`
5. Verify the build produces `dist/client/index.js` and `dist/client/index.d.ts`.
6. Verify `import { createSyncClientEngine } from '@avileo/drizzle-sync/client'` resolves without pulling in server or React code.

## Completion Criteria

- `createSyncClientEngine(config)` returns a valid `SyncClientEngine` instance
- `import { createSyncClientEngine, SyncClientEngine, type SyncClientEngineConfig } from '@avileo/drizzle-sync/client'` works
- The client bundle does not include server-side handlers, conflict resolvers, or React components
- `bun run build` in `packages/drizzle-sync` succeeds with the new entry point
- All existing tests pass

## Validation

- `cd packages/drizzle-sync && bun run build` succeeds
- Verify dist output: `ls packages/drizzle-sync/dist/client/`
- Verify bundle doesn't include React: `grep -r "react" packages/drizzle-sync/dist/client/index.js` should return nothing (or only comments)
- Import test: create a small script that imports from `@avileo/drizzle-sync/client` and verify no React dependency errors

## Risks or Notes

- tsup may tree-shake differently for the client entry. Verify that re-exported types from `core` are included in the declaration files.
- The existing `createSyncEngine` in the main entry (`src/index.ts`) is the server-side factory. Naming must be clearly distinct (`createSyncClientEngine` vs `createSyncEngine`).
- Ensure `peerDependencies` in `package.json` still list `@electric-sql/pglite` and `drizzle-orm` but NOT `react` for the client entry.
