# T-001 — Create devtools folder structure and move UI components

## Objective

Create the `app/devtools/` folder hierarchy and move existing devtools UI components into it, establishing the new home for all devtools code.

## Requirements Covered

- `FR-002`
- `FR-006`

## Dependencies

None

## Files or Areas Involved

- `packages/app/app/devtools/` — Create — new root folder for all devtools
- `packages/app/app/devtools/components/` — Create — DebugWidget and DebugActions
- `packages/app/app/devtools/sync/` — Create — SyncDevToolsDrawer and its supporting files
- `packages/app/app/components/debug/debug-widget.tsx` — Move → `devtools/components/debug-widget.tsx`
- `packages/app/app/components/debug/debug-actions.tsx` — Move → `devtools/components/debug-actions.tsx`
- `packages/app/app/components/sync/sync-devtools/` — Move → `devtools/sync/`
- `packages/app/app/components/sync/sync-devtools-drawer.tsx` — Review — duplicate re-export, not moved (deferred cleanup)

## Actions

1. Create directory `app/devtools/components/`
2. Move `app/components/debug/debug-widget.tsx` → `app/devtools/components/debug-widget.tsx`
3. Move `app/components/debug/debug-actions.tsx` → `app/devtools/components/debug-actions.tsx`
4. Move entire `app/components/sync/sync-devtools/` directory → `app/devtools/sync/`
5. Create `app/devtools/components/index.ts` that re-exports `DebugWidget` and `DebugActions`
6. Create `app/devtools/sync/index.ts` that re-exports `SyncDevToolsDrawer` and all types from `types.ts`
7. Update all internal imports within moved files (relative paths to `~/lib/debug`, `~/components/debug`, etc. will need updating in subsequent tasks)

## Completion Criteria

- `app/devtools/components/debug-widget.tsx` exists and compiles
- `app/devtools/components/debug-actions.tsx` exists and compiles
- `app/devtools/sync/` contains all files from `app/components/sync/sync-devtools/`
- `app/devtools/components/index.ts` exports both components
- `app/devtools/sync/index.ts` exports `SyncDevToolsDrawer` and types

## Validation

- `bun run typecheck` in `packages/app` (will fail on import paths — this is expected, fixed in T-006)

## Risks or Notes

- `debug-actions.tsx` imports `~/lib/debug` — that import will break after the move; it will be fixed when `app/lib/debug.ts` is refactored in T-003
- `debug-widget.tsx` imports `~/components/debug/debug-actions` — will need path update in T-006
- `sync-devtools/drawer.tsx` has internal imports to `hooks/use-devtools-data`, `types`, `components/stat-card`, etc. — relative paths within the moved folder will remain valid since the folder structure is preserved
