# F-005 Cache Invalidation Configuration

## Objective

Add configurable cache invalidation rules to `SyncClientEngine` so that data mutations automatically invalidate the correct TanStack Query cache keys. Rules are declared per-entity in the sync config and can be overridden per-operation.

Default behavior: mutate `customers` → invalidate `['customers']`.
Custom behavior: mutate `customers` → invalidate `['customers', 'customer-groups', 'sales']`.

## Scope Boundaries

- In scope:
  - `InvalidationConfig` interface added to `SyncClientEngineConfig`
  - Per-entity invalidation rules (`invalidateOnCreate`, `invalidateOnUpdate`, `invalidateOnDelete`)
  - Default invalidation (entity's own query key) when no rules are specified
  - Hook for customizing invalidation at the operation level
  - Integration with engine's event system to trigger invalidation
- Out of scope:
  - The engine class itself (F-001)
  - React hooks generation (F-002)
  - Frontend migration (F-004)

## Verified Context

- Current manual hooks manually call `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers })`
- `QUERY_KEYS` objects are defined in each hook file (not centralized)
- TanStack Query's `invalidateQueries` supports exact and fuzzy matching

## Assumptions

- Invalidation rules can be statically determined from entity relationships in `sync.config.ts`
- Parent-child relationships imply invalidation cascade (e.g., updating `customers` invalidates `sales` that reference it)
- Rules can be extended/overridden at runtime for complex cases

## Unknowns

- Whether invalidation should be eager (immediate) or deferred (batch)
- How to handle invalidation of paginated or filtered queries (`['customers', { page: 2 }]`)

## Likely Files or Areas Involved

- `packages/drizzle-sync/src/client/types.ts` — **Modify** — Add `InvalidationConfig`
- `packages/drizzle-sync/src/client/sync-client-engine.ts` — **Modify** — Add invalidation logic
- `packages/backend/src/sync.config.ts` — **Modify** — Add invalidation rules to entity config
- `packages/app/app/lib/sync/config.ts` — **Create** — Frontend sync config with invalidation rules

## Feature Dependencies

- Depends on: F-001 (engine class must exist to add config to)
- Blocks: none

## Human-Owned Tracking Fields

- Status: planned
- Owner: backend team
- Decision Notes: Start with simple exact-match invalidation; add fuzzy/paginated support later
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: yes
- Reason: Extends engine interface without blocking other features; can run alongside F-002 and F-003

## Worktree Recommendation

- Recommended: yes
- Suggested branch: `feature/sync-invalidation-config`
- Suggested worktree path: `../wt-sync-invalidation`
- Rationale: Low-risk configuration extension; safe in parallel worktree

## Suggested `/plan` Mode

- Mode: `simple`
- Rationale: Focused feature with clear scope (config + invalidation logic)

## Suggested Next Command

- `/plan .plans/sync-client-engine-overview/features/F-005-cache-invalidation-config.md`
