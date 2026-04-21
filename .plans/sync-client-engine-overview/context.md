# SyncClientEngine Overview Context

## Overview

Avileo's frontend sync logic is scattered across **48+ files** spanning 6 architectural layers (core sync, service layer, React hooks, UI components, devtools, and route providers). There is no centralized configuration point — initialization requires nesting 4 different providers (`EngineProvider` → `SyncProvider` → `ServicesProviderWrapper` → `ServicesProvider`), and every hook manually wires PGlite, sync queue, and TanStack Query cache invalidation.

This initiative creates a **centralized `SyncClientEngine`** class (inspired by TanStack Query's `QueryClient`) that consolidates all sync runtime behavior behind a single, configurable instance. The engine lives in `@avileo/drizzle-sync` as reusable core code, while Avileo's frontend instantiates and configures it exactly once.

## Background

Current state discovered through codebase analysis:

- **Backend** (`packages/backend/src/sync.config.ts`): Has centralized sync config via `defineSyncConfig()`.
- **Frontend** (`packages/app/app/lib/sync/`): No equivalent config. Sync initialization is manual, scattered, and repeated across:
  - `sync-service.ts` (push logic, 396 lines)
  - `pull-service.ts` (pull logic, 785 lines)
  - `coordinator.ts` (orchestration)
  - `service-provider.tsx` (React context + manual service instantiation)
  - `staged-pull-coordinator.ts` (3-stage loading)
  - 13 domain services extending `BaseService`
  - 6+ custom React hooks (`use-manual-sync.ts`, `use-sync-status.ts`, etc.)

The `@avileo/drizzle-sync` library already contains a complete PGlite runtime (pull service, push service, coordinator, staged pull, mutex, DLQ, conflict resolution) but **lacks a unified client-side API**. It exports ~10 separate classes that consumers must instantiate and wire manually.

## Goal

Once all features are implemented:

1. **Single instance**: `const engine = createSyncEngine({ database: pg, queryClient, config })`
2. **Single provider**: `<SyncEngineProvider engine={engine}>` replaces 4 nested providers
3. **Generated SDK**: The generator produces `engine.entities.customers.create(data)` API and `useCustomers()` hooks
4. **Manual hooks for complexity**: Complex business hooks remain manual but consume `syncEngine` instead of raw services
5. **Configurable invalidation**: Per-entity cache invalidation rules declared in config, not hardcoded in hooks

## Decomposition Rationale

This initiative was split into multiple features because:

1. **Library vs. App boundary**: Core engine class must live in `drizzle-sync` (reusable), while integration lives in `packages/app` (specific).
2. **Code generation dependency**: Typed entity APIs (`engine.entities.xxx`) require the generator to produce new artifacts, which depends on the engine's interface being stable.
3. **Migration risk**: Consolidating 4 providers and 48 files into 1 provider is high-risk and must be done after the new system is proven.
4. **React integration complexity**: The React provider, context, and hooks are a distinct layer from the core engine.

## Scope Boundaries

### In Scope
- Creating `SyncClientEngine` class in `@avileo/drizzle-sync`
- Unified configuration schema (`SyncClientEngineConfig`)
- Generator producing typed entity APIs (`engine-entities.ts`)
- Generator producing React hooks (`react-hooks.ts`)
- `SyncEngineProvider` React component
- Migration of frontend providers (4 → 1)
- Cache invalidation configuration system
- Complex manual hooks adapted to use `syncEngine`

### Out of Scope
- Backend changes (sync handlers, API routes)
- Changing sync protocol or wire format
- Replacing PGlite with another local database
- Replacing TanStack Query (the engine integrates with it)
- Mobile/Native platforms (future consideration)
- Auth changes

## Evidence Buckets

### Verified
- `packages/app/app/lib/sync/` contains 15+ core sync files and 13 domain services
- `@avileo/drizzle-sync` exports `SyncCoordinator`, `SyncService`, `PullService`, `StagedPullCoordinator`, `PgSyncQueue`, `SyncMutex` as separate classes
- Current frontend has 4 nested providers in `app/routes/_protected.tsx`
- The generator currently produces `services.ts`, `hooks.ts` (remote-first), `schemas.ts`, `types.ts`
- Manual hooks (`use-customers.ts`, `use-sales.ts`) already use PGlite local-first via `BaseService`

### Inferred
- The engine should follow TanStack Query's pattern: `new QueryClient()` → `<QueryClientProvider>` → `useQuery()`
- Invalidation rules should be configurable per entity in `sync.config.ts`
- The generator can produce both imperative entity APIs and React hooks

### Unknown
- Exact performance impact of consolidating providers (requires measurement)
- Whether all 13 domain services can be fully auto-generated or some require manual extension
- How the existing `react-runtime.ts` adapter maps to the new engine
