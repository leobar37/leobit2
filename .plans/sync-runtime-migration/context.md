# Sync Runtime Migration to Framework Context

## Overview

Migrate the production-quality sync runtime from `packages/app/app/lib/sync/` into `@avileo/drizzle-sync/pglite` so the framework owns the authoritative implementation. The app should only pass configuration (entity priorities, self-heal rules, tenant column) and consume the engine.

This eliminates technical debt where the app maintains a complete duplicate sync layer that is unused when engine mode is active.

## Background

The framework's `PushSyncService` has ~40% stubs (no real backoff, no self-heal, no dead letter management, no entity status updates). Meanwhile, the app has a fully working implementation in `app/lib/sync/` that duplicates:
- `SyncAutoRunner` - backoff and timer management
- `SyncBatchProcessor` - batch sending to server
- `SyncOperationLifecycleService` - operation state machine with self-heal
- `SyncEntityStatusUpdater` - marks entities as synced after push
- `SyncMutex` - push/pull coordination

The app already uses engine mode in production (`_protected.tsx` creates `SyncClientEngine`), but relies on an incomplete framework implementation. The goal is to make the framework's implementation complete and delete the legacy duplicate code.

## Goal

When complete:
1. `@avileo/drizzle-sync/pglite` has a fully working `PushSyncService` with no stubs
2. The app no longer maintains `SyncService`, `SyncBatchProcessor`, `SyncAutoRunner`, `SyncOperationLifecycleService`, `SyncEntityStatusUpdater` locally
3. The app only passes configuration to `SyncClientEngine` and consumes domain services via the engine
4. All sync tests pass (unit tests only, no E2E)

## Key Decisions

- **No E2E tests in scope**: Unit tests only for the framework
- **Tenant column configurable**: Framework must accept `tenantColumn` (e.g., `business_id`) instead of hardcoding `tenant_id`
- **Self-heal rules configurable**: Framework accepts which entity types can convert failed `update` → `create`
- **Entity priorities configurable**: Framework accepts priority array for operation ordering
- **Preserve staged pull coordinator**: Avileo's 3-stage pull (CRITICAL → RECENT_SALES → HISTORICAL) stays in the app until a separate migration

## Scope Boundaries

- **In scope**: Push sync services (SyncAutoRunner, BatchProcessor, OperationLifecycle, EntityStatusUpdater, Mutex), completing PushSyncService stubs, deprecating legacy app sync services, unit tests
- **Out of scope**: Pull service migration, staged pull coordinator, E2E tests, React providers beyond consolidation, changing the sync HTTP API contract
