# T-006 — Update all import paths for moved devtools components

## Objective

Update all imports across the codebase that reference the old devtools paths (`~/components/debug`, `~/lib/debug`, `~/components/sync/sync-devtools`) to point to the new `~/devtools` paths.

## Requirements Covered

- `FR-007`

## Dependencies

T-001 (folder structure created), T-003 (merged index created), T-005 (service-provider updated)

## Files or Areas Involved

- `packages/app/app/routes/_protected.tsx` — Modify — imports `DebugWidget` from `~/components/debug`; update to `~/devtools/components`
- `packages/app/app/components/layout/app-layout.tsx` — Modify — imports `DebugWidget` from `~/components/debug`; update to `~/devtools/components`
- `packages/app/app/devtools/components/debug-widget.tsx` — Modify — its internal import of `DebugActions` from `~/components/debug/debug-actions`; update to relative path
- `packages/app/app/devtools/sync/drawer.tsx` — Modify — its internal import of `useDevToolsData` from `../hooks/use-devtools-data`; verify path
- `packages/app/app/lib/sync/service-provider.tsx` — Modify — import `addServiceDebugHelpers` from `~/lib/debug`; verify path unchanged since `app/lib/debug.ts` still exists
- Any other files that import from `~/components/debug` or `~/lib/debug`

## Actions

1. Search for all imports referencing the old paths:
   ```bash
   grep -r "from \"~/components/debug\"" packages/app/app/
   grep -r "from \"~/lib/debug\"" packages/app/app/
   grep -r "from \"~/components/sync/sync-devtools\"" packages/app/app/
   ```
2. For each found import, update the path to the new location:
   - `~/components/debug/debug-widget` → `~/devtools/components/debug-widget`
   - `~/components/debug/debug-actions` → `~/devtools/components/debug-actions`
   - `~/components/debug` → `~/devtools/components`
   - `~/lib/debug` → `~/lib/debug` (unchanged — `app/lib/debug.ts` still exists)
   - `~/components/sync/sync-devtools` → `~/devtools/sync`
3. Create `app/devtools/index.ts` as the barrel export:
   ```ts
   export { DebugWidget } from "./components/debug-widget";
   export { DebugActions } from "./components/debug-actions";
   export { SyncDevToolsDrawer } from "./sync/drawer";
   export type { SyncStatus, SyncOperation, DeadLetterOperation, EntitySyncSummary, ActiveTab } from "./sync/types";
   ```
4. Optionally update consumers to import from `~/devtools` instead of deep paths

## Completion Criteria

- All imports from `~/components/debug` updated to `~/devtools/components`
- All imports from `~/components/sync/sync-devtools` updated to `~/devtools/sync`
- `app/devtools/index.ts` barrel export exists and is usable
- `bun run typecheck` passes in `packages/app`

## Validation

- `bun run typecheck` in `packages/app`

## Risks or Notes

- `app/lib/debug.ts` still exists and is imported by `service-provider.tsx` as `addServiceDebugHelpers` — this file is modified by T-005 but not deleted or moved, so imports to `~/lib/debug` remain valid
- `app/components/debug/` and `app/components/sync/sync-devtools/` folders still exist on disk but are now empty (or contain only moved files). These should be deleted after all imports are updated.
