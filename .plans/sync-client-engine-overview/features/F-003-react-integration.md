# F-003 React Integration

## Objective

Create the React integration layer for `SyncClientEngine`:
1. `SyncEngineProvider` — Replaces the current 4 nested providers with a single React context provider
2. `useSyncEngine()` hook — Gives components access to the engine instance
3. Bridge between engine events and TanStack Query invalidation
4. Lifecycle management (start/stop sync when provider mounts/unmounts)

This feature makes the engine feel native in React, following the exact same pattern as `QueryClientProvider` + `useQueryClient()`.

## Scope Boundaries

- In scope:
  - `SyncEngineProvider` component accepting `engine` prop
  - React context for engine instance (`SyncEngineContext`)
  - `useSyncEngine()` hook
  - `useSyncStatus()` hook for UI indicators (online, syncing, pending, errors)
  - Auto-invalidation bridge: engine events → `queryClient.invalidateQueries()`
  - Lifecycle: start sync on mount, stop on unmount
- Out of scope:
  - The engine class itself (F-001)
  - Generated hooks (F-002)
  - Migrating existing pages/components (F-004)
  - Complex sync UI (conflict resolver, debug panel)

## Verified Context

- Current provider stack in `app/routes/_protected.tsx`:
  ```tsx
  <EngineProvider>
    <SyncProvider>
      <ServicesProviderWrapper>
        <ServicesProvider>
          {children}
        </ServicesProvider>
      </ServicesProviderWrapper>
    </SyncProvider>
  </EngineProvider>
  ```
- Current `service-provider.tsx` creates services manually via `useMemo` and `useRef`
- `react-runtime.ts` exists as adapter between frontend sync and library's `/react` hooks
- TanStack Query's `QueryClientProvider` is already at the app root level

## Assumptions

- `SyncEngineProvider` can replace all 4 existing providers without breaking existing hooks during migration
- Engine events (`pull:complete`, `push:complete`, etc.) map cleanly to TanStack Query invalidation keys
- Provider can be placed alongside (or inside) `QueryClientProvider`

## Unknowns

- Whether `SyncEngineProvider` should wrap or be wrapped by `QueryClientProvider`
- Exact event mapping from engine to invalidation keys (may need F-005)

## Likely Files or Areas Involved

- `packages/drizzle-sync/src/react/` — **Create/Modify** — New provider + hooks
- `packages/drizzle-sync/src/react/provider.tsx` — **Create** — `SyncEngineProvider`
- `packages/drizzle-sync/src/react/context.ts` — **Create** — React context
- `packages/drizzle-sync/src/react/hooks.ts` — **Modify** — Add `useSyncEngine()`
- `packages/drizzle-sync/src/react/types.ts` — **Modify** — Engine-related types
- `packages/app/app/routes/_protected.tsx` — **Review** — Current provider nesting
- `packages/app/app/lib/sync/service-provider.tsx` — **Review** — Current service provider logic

## Feature Dependencies

- Depends on: F-001 (engine class interface must be stable)
- Blocks: F-004 (migration uses the new provider)

## Human-Owned Tracking Fields

- Status: planned
- Owner: frontend team
- Decision Notes: Provider must be drop-in replacement; test with existing `use-customers.ts` before removing old providers
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: yes
- Reason: React layer is independent of code generation (F-002); both need F-001 interface but can proceed in parallel

## Worktree Recommendation

- Recommended: yes
- Suggested branch: `feature/sync-react-integration`
- Suggested worktree path: `../wt-sync-react-integration`
- Rationale: Isolated React layer; safe to develop in parallel

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Multiple React components, hooks, lifecycle logic, and provider integration

## Suggested Next Command

- `/plan .plans/sync-client-engine-overview/features/F-003-react-integration.md`
