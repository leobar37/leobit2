# T-000: Post-Migration Stabilization

## Objective

Stabilize the app/framework baseline after migration to `@avileo/drizzle-sync` so the final correction tasks can be validated without environmental noise.

## Requirements Covered

- `FR-008`

## Dependencies

- none

## Files or Areas Involved

- `packages/drizzle-sync/tsup.config.ts` — **Review/Modify**
- `packages/drizzle-sync/package.json` — **Review/Modify** export/build fields
- `packages/drizzle-sync/src/client/index.ts` and related entry files — **Review/Modify**
- `packages/app` build config/import paths consuming `@avileo/drizzle-sync/client` — **Review/Modify**
- `packages/app/app/routes/_protected.tsx` — **Review** auto-init usage
- `packages/app/app/lib/sync/db-config.ts` — **Review**

## Actions

1. Reproduce and fix app build failure tied to sourcemap/rollup and `drizzle-sync/dist/client/index.js`.
2. Verify package export map and built artifacts match app import expectations.
3. Confirm `SyncClientEngine` auto-init mode using `databaseConfig` boots correctly in app route flow.
4. Confirm removed legacy folders do not leave stale imports/references.

## Completion Criteria

- App build succeeds with current framework migration state.
- Engine auto-init flow remains functional with `databaseConfig`.
- No broken imports remain from removed legacy folders.

## Validation

- `cd packages/drizzle-sync && bun run build`
- `cd packages/app && bun run build`
- Targeted smoke for protected route boot and engine initialization path.

## Risks or Notes

- Do not widen scope into unrelated TypeScript debt; keep this task focused on migration baseline stability.
