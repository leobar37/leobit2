# T-009: Worker and Debug Follow-up

## Objective

Resolve or explicitly bound remaining migration gaps for worker generation and debug console integration.

## Requirements Covered

- `FR-009`

## Dependencies

- `T-000`

## Files or Areas Involved

- `packages/drizzle-sync/src/cli.ts` — **Review/Modify** worker generation workflow
- Generator/CLI output paths for worker artifacts — **Review/Modify**
- `packages/app/app/lib/debug.ts` and `packages/app/app/lib/debug/console/*` — **Review/Modify**
- `packages/drizzle-sync/src/react/hooks.ts` / react exports if debug integration touches framework API — **Review/Modify**
- Documentation for debug/worker integration boundary — **Update**

## Actions

1. Decide and implement (or formally defer) how `pglite.worker.ts` is generated/managed in framework pipeline.
2. Align debug API transition so `window.avileoDebug` behavior is either integrated in framework or explicitly documented as app-owned.
3. Add compatibility notes for consumers if behavior changed post-migration.

## Completion Criteria

- Worker generation path is no longer ambiguous.
- Debug API ownership and compatibility are clearly implemented or documented.
- No hidden runtime dependency remains on removed legacy debug files.

## Validation

- Run generation/build commands that should produce worker artifacts (or verify documented non-goal path).
- Manual check of debug entry points in development mode.

## Risks or Notes

- This task is medium priority and should not block core identity/decoupling work unless runtime stability depends on it.
