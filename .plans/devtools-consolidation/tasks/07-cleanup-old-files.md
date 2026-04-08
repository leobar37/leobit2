# T-007 — Delete old devtools folders and run final verification

## Objective

Remove the now-empty old devtools folders (`app/components/debug/`, `app/components/sync/sync-devtools/`) and run a full typecheck + lint verification to confirm the refactor is clean.

## Requirements Covered

- `FR-002`
- `FR-007`

## Dependencies

T-006 (all imports updated)

## Files or Areas Involved

- `packages/app/app/components/debug/` — Delete — should be empty after moves
- `packages/app/app/components/sync/sync-devtools/` — Delete — moved to `app/devtools/sync/`
- `packages/app/app/components/sync/sync-devtools-drawer.tsx` — Delete — duplicate re-export

## Actions

1. Verify `app/components/debug/` is empty (all files moved in T-001):
   - `debug-widget.tsx` → moved
   - `debug-actions.tsx` → moved
   - `index.ts` → moved
   - Any remaining files: move or delete
2. Verify `app/components/sync/sync-devtools/` is empty (all files moved in T-001):
   - All files in `app/devtools/sync/` should have corresponding originals in `app/components/sync/sync-devtools/`
3. Delete both empty folders
4. Delete `app/components/sync/sync-devtools-drawer.tsx` (duplicate re-export)
5. Run full verification:
   ```bash
   cd packages/app && bun run typecheck
   ```
6. Verify `window.avileoDebug` is accessible in dev mode by checking:
   - `provider.tsx` calls `initEngineDebug` after pg init
   - `ServicesProvider` calls `addServiceDebugHelpers` which merges

## Completion Criteria

- `app/components/debug/` folder deleted
- `app/components/sync/sync-devtools/` folder deleted
- `app/components/sync/sync-devtools-drawer.tsx` deleted
- `bun run typecheck` passes without errors
- No broken imports anywhere in `packages/app`

## Validation

- `bun run typecheck` in `packages/app`
- Manual: open browser devtools, confirm `window.avileoDebug.help()` works and lists all methods

## Risks or Notes

- If any file was missed in T-001 (not moved), deleting the folder will break imports. Verify the folder is empty before deleting.
- The `sync-devtools-drawer.tsx` deletion removes the re-export — if anything imports from that specific path (not via the sync-devtools folder), it will break. Search for imports of `sync-devtools-drawer` before deleting.
