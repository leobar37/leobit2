# F-004 Frontend Migration

## Objective

Migrate the Avileo frontend from the scattered provider + manual service architecture to the centralized `SyncClientEngine`:
1. Replace 4 nested providers with `SyncEngineProvider`
2. Adapt manual hooks (`use-customers.ts`, `use-sales.ts`, etc.) to use `syncEngine`
3. Remove obsolete files: `service-provider.tsx`, `react-runtime.ts`, `coordinator.ts` (frontend copies), custom sync hooks
4. Keep complex business hooks but refactor them to consume the engine

This is the integration wave that delivers the user-facing simplification.

## Scope Boundaries

- In scope:
  - Replace provider stack in `app/routes/_protected.tsx`
  - Refactor `use-customers.ts`, `use-sales.ts`, and other manual hooks
  - Remove `service-provider.tsx`, `ServicesProviderWrapper`, `ServicesProvider`
  - Remove `react-runtime.ts` adapter
  - Remove frontend copies of `coordinator.ts`, `sync-service.ts`, `pull-service.ts` if engine replaces them
  - Keep complex hooks (`useSaleWithItems`, `useSaleSyncStatus`) but adapt to engine
  - Update devtools/debug panels to use engine API
- Out of scope:
  - Backend changes
  - Rewriting business logic (only adapter/wiring changes)
  - Removing generated files (`services.ts`, `schemas.ts`)

## Verified Context

- 48 files touch sync across 6 layers
- Manual hooks already use local-first pattern (PGlite + `queueSync`)
- Current hooks import from `~/lib/sync/service-provider` to get services
- `use-customers.ts` has ~50 lines of sync-agnostic business logic + 20 lines of sync wiring
- `use-sales.ts` is more complex with `useSaleSyncStatus` helper

## Assumptions

- Generated hooks (F-002) and React provider (F-003) are ready before migration starts
- Manual hooks can be adapted incrementally (one at a time)
- The engine's `entities.xxx` API has parity with current service methods

## Unknowns

- Whether some manual hooks rely on implementation details not exposed by the engine
- Exact number of files to delete vs. modify (requires detailed audit)

## Likely Files or Areas Involved

- `packages/app/app/routes/_protected.tsx` — **Modify** — Replace provider stack
- `packages/app/app/hooks/use-customers.ts` — **Modify** — Use `syncEngine.entities.customers`
- `packages/app/app/hooks/use-sales.ts` — **Modify** — Use `syncEngine.entities.sales`
- `packages/app/app/hooks/use-manual-sync.ts` — **Delete** — Replaced by engine methods
- `packages/app/app/hooks/use-sync-status.ts` — **Delete** — Replaced by `useSyncStatus()`
- `packages/app/app/lib/sync/service-provider.tsx` — **Delete** — Replaced by `SyncEngineProvider`
- `packages/app/app/lib/sync/react-runtime.ts` — **Delete** — Replaced by engine
- `packages/app/app/lib/sync/coordinator.ts` — **Delete** — Engine has its own
- `packages/app/app/lib/sync/sync-service.ts` — **Delete** — Engine has its own
- `packages/app/app/lib/sync/pull-service.ts` — **Delete** — Engine has its own
- `packages/app/app/components/sync/sync-debug-panel.tsx` — **Modify** — Use engine API
- `packages/app/app/devtools/sync/drawer.tsx` — **Modify** — Use engine API

## Feature Dependencies

- Depends on: F-002 (generated entity APIs), F-003 (React provider)
- Blocks: none (final integration)

## Human-Owned Tracking Fields

- Status: planned
- Owner: frontend team
- Decision Notes: Migrate incrementally; keep old providers until all hooks are verified
- Manual Overrides: Do NOT delete old files until migration is complete and tested

## Parallelization Notes

- Parallelizable: no
- Reason: Integration feature; must wait for F-002 and F-003

## Worktree Recommendation

- Recommended: no
- Suggested branch: `feature/sync-frontend-migration`
- Suggested worktree path: n/a
- Rationale: High integration risk; requires frequent testing against main tree with F-002 and F-003 merged

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Large migration with many files, high risk, requires careful sequencing

## Suggested Next Command

- `/plan .plans/sync-client-engine-overview/features/F-004-frontend-migration.md`
