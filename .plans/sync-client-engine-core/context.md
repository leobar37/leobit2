# SyncClientEngine Core Class — Context

## Overview

Create a `SyncClientEngine` class inside `@avileo/drizzle-sync` that serves as the single, unified entry point for all client-side sync operations. The engine encapsulates PGlite initialization, sync queue management, push/pull coordination via the existing `SyncCoordinator`, staged loading via `StagedPullCoordinator`, and a service registry for domain services. It is framework-agnostic (no React dependency) and accepts a `QueryClient` instance only via optional callbacks for cache invalidation.

This plan covers **F-001** of the broader sync-client-engine initiative. It is the foundation feature — all subsequent features (F-002 code generation, F-003 React integration, F-004 provider migration, F-005 cache invalidation rules) depend on this engine's public API being stable.

## Background

The frontend sync layer in `packages/app/app/lib/sync/` consists of 15+ files with no centralized configuration. Initialization requires nesting 4 providers and manually wiring PGlite, sync queue, sync service, pull service, coordinator, staged pull coordinator, and 12+ domain services. The `@avileo/drizzle-sync` library already exports all the building blocks (`SyncService`, `PullService`, `SyncCoordinator`, `PgSyncQueue`, `StagedPullCoordinator`, `SyncMutex`, `SyncAutoRunner`, `SyncEventEmitter`) but lacks a unified client-side composition root.

The library's existing `createSyncEngine()` + `SyncEngineInstance` is **server-side only** — it validates entity configs, registers handlers and conflict resolvers for processing inbound sync operations on the backend. The client-side engine is a completely separate construct.

## Goal

A `SyncClientEngine` class that:

1. Accepts a `SyncClientEngineConfig` with PGlite instance, auth context, entity definitions, and optional callbacks
2. Internally composes `PgSyncQueue`, `SyncService`, `PullService`, `SyncCoordinator`, and `StagedPullCoordinator`
3. Exposes lifecycle methods: `initialize()`, `start()`, `stop()`
4. Provides a service registry: `getService(name)` returns domain service instances
5. Bridges `SyncEventEmitter` events to external listeners (e.g., TanStack Query invalidation)
6. Is exported via a new `@avileo/drizzle-sync/client` entry point

## Key Decisions

- **Framework-agnostic**: The engine itself has zero React imports. React integration is F-003.
- **Composition over inheritance**: The engine composes existing library classes; it does not subclass them.
- **Config-driven**: All behavior (intervals, stages, entity definitions) flows through `SyncClientEngineConfig`.
- **Event bridge**: The engine exposes the library's `ISyncEventEmitter` for external listeners. It does not re-implement event dispatching.
- **Service registry**: Domain services are registered by name. The engine constructs them given entity config and provides `getService<T>(name)` for typed access.
- **QueryClient decoupled**: The engine does not import `@tanstack/react-query`. It accepts an optional `onPullComplete` callback that the caller uses for cache invalidation.

## Scope Boundaries

- In scope:
  - `SyncClientEngine` class with constructor accepting `SyncClientEngineConfig`
  - Config type definition (`SyncClientEngineConfig`, `EntityServiceDefinition`)
  - Integration of existing `SyncCoordinator`, `SyncService`, `PullService`, `PgSyncQueue`, `StagedPullCoordinator`
  - Lifecycle methods: `initialize()`, `start()`, `stop()`
  - Service registry for domain services (`getService(name)`)
  - Event emitter bridge for external listeners
  - Factory function `createSyncClientEngine(config)`
  - New `@avileo/drizzle-sync/client` entry point in package.json
- Out of scope:
  - React-specific code (hooks, providers, context) → F-003
  - Code generation of entity APIs → F-002
  - Cache invalidation rules engine → F-005
  - Frontend provider migration → F-004
  - Changes to existing library classes (`SyncService`, `PullService`, `SyncCoordinator`, etc.)
