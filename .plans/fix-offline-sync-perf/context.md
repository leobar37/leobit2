# Fix Offline Sync & Performance Context

## Overview

Fix 5 critical/high issues in the PGlite offline-first sync system that cause: (1) the app to freeze when offline, (2) UI showing stale data after server-side changes, (3) unbounded memory growth at 1000+ sales, (4) invisible dead-letter queue growth, and (5) permanently stopped sync after stale pull detection.

## Background

Avileo uses PGlite (PostgreSQL in WASM via IndexedDB) for offline-first local storage. A custom REST sync layer handles push (client→server via `sync_operations` queue) and pull (server→client via `/sync/changes` cursor). At 1000+ sales, the app becomes slow because `findByBusiness()` returns all records unbounded. When offline, `processPending()` runs every 5 seconds and hammers the network. TanStack Query caches are never invalidated when server-pull delivers changes, making the UI show stale data.

## Goal

After all tasks complete:
- Vendor sales work correctly offline (writes queue, sync on reconnect)
- UI reflects server changes immediately after pull (no stale cache)
- Sales list stays fast at 1000+ records (pagination)
- Dead-letter queue operations are visible and recoverable
- Sync auto-resumes after transient network failures without manual intervention

## Key Decisions

- Offline detection: `processPending()` will check `navigator.onLine` before attempting network I/O
- TanStack invalidation: `onChangesApplied` callback will be wired in `ServicesProvider` to call `queryClient.invalidateQueries()` per entity type
- Pagination: `findByBusiness()` will be replaced with `findPageByBusiness()` everywhere; `useSales()` will use paginated query
- DLQ UI: New `/sync` debug panel section will list DLQ operations with retry/discard actions
- No architectural changes: All fixes are additive and backward-compatible

## Scope Boundaries

- **In scope**: Frontend sync engine, TanStack Query hooks, sale list pagination, DLQ recovery UI
- **Out of scope**: Backend sync handlers, schema migration strategy, Electric SQL integration, multi-device conflict resolution UX
