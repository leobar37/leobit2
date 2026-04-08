# Devtools Consolidation — Requirements

## Objective

Consolidate all devtools into `app/devtools/`, fix the `window.avileoDebug` double-write collision, and extract debug code from `provider.tsx` so the engine provider contains only engine initialization logic.

## Scope

- In scope: `packages/app` frontend only; `window.avileoDebug` global; `provider.tsx` refactor; devtools folder reorganization; all import path updates
- Out of scope: tree-shaking / production bundle optimization; backend changes; ElectricSQL sync changes

## Functional Requirements

- `FR-001` — `window.avileoDebug` is set exactly once, merging both engine-level (PGlite raw query) helpers and service-level helpers without collision
- `FR-002` — `app/devtools/` is the single home for all devtools code; no devtools code remains in `provider.tsx`
- `FR-003` — All existing `window.avileoDebug` methods continue to work after refactor: `getProducts`, `checkAllTables`, `copyDiagnosticReport`, `forceResync`, `checkLocalStorage`, `query`, `purchases`, `drafts`, `suppliers`, `syncQueue`, `products`, `customers`, `sales`, `checkDuplicates`, `cleanupDuplicateProducts`, `clearIndexedDB`
- `FR-004` — `SyncDevToolsDrawer` continues to call `avileoDebug.copyDiagnosticReport()` successfully
- `FR-005` — `DebugActions` duplicate-check buttons continue to work
- `FR-006` — `DebugWidget` (floating FAB) continues to render and function
- `FR-007` — All existing import paths are updated; no broken imports after move

## Non-Functional Requirements

- `NFR-001` — All devtools code is gated behind `import.meta.env.DEV` in `app/devtools/index.ts` (so the module is a no-op in production)
- `NFR-002` — `provider.tsx` line count reduced by ~133 lines (debug code removed)

## Acceptance Criteria

- `provider.tsx` contains no `window.avileoDebug` assignment code
- `window.avileoDebug` has all methods from both engine and service helpers
- `SyncDevToolsDrawer.copyReport` successfully calls and executes `avileoDebug.copyDiagnosticReport()`
- `DebugActions.checkDuplicates` calls succeed (or are fixed to use correct API)
- All imports from `~/components/debug`, `~/lib/debug`, `~/components/sync/sync-devtools` resolve to new paths
- `bun run typecheck` passes in `packages/app`

## Constraints

- `window.avileoDebug` must be available in browser console in dev mode
- Devtools UI components must remain accessible from their current consumption points (`_protected.tsx`, `app-layout.tsx`)
- `pgRef.current` must be available when `initDevTools` is called (called after `initDatabase()` resolves)

## Open Questions

- Should `DebugActions` be fixed to stop using `avileoDebug.productService` (which was never actually exposed)? This is a pre-existing bug, not introduced by this refactor. Defer to a separate issue.
- The duplicate re-export at `app/components/sync/sync-devtools-drawer.tsx` — should it be removed as part of this work or left? (Leave for a separate cleanup task to keep scope focused.)
