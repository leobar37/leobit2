---
name: drizzle-sync
description: Understand, debug, extend, and integrate the @avileo/drizzle-sync offline-first sync library. Use when working with packages/drizzle-sync, sync batch processing, conflict resolution, PGlite pull/push, React sync hooks, or the sync engine. Triggers: "drizzle-sync", "sync engine", "pull service", "change applier", "sync conflict", "offline sync", "coalescing", "sync provider", "sync hooks".
---

# Drizzle Sync Library

Offline-first sync library for PostgreSQL (backend) + PGlite (frontend). Provides batch sync, conflict resolution, operation coalescing, and React integration.

## Quick Mental Model

```
packages/drizzle-sync/src/
├── core/       # Runtime-agnostic: types, interfaces, backoff, coalesce, events
├── server/     # Backend: SyncEngine (batch processing), handlers, conflict resolvers
├── pglite/     # Frontend: PullService, ChangeApplier, schema mapper
├── react/      # React: SyncProvider, hooks (8 total)
├── config/     # Config types, validators, codegen generators
└── shared/     # Constants
```

## Key Entry Points

| Purpose | Path |
|---------|------|
| Main exports | `packages/drizzle-sync/src/index.ts` |
| SyncEngine (server) | `packages/drizzle-sync/src/server/sync-engine.ts` |
| PullService (client) | `packages/drizzle-sync/src/pglite/pull-service.ts` |
| ChangeApplier (client) | `packages/drizzle-sync/src/pglite/change-applier.ts` |
| BaseSyncHandler | `packages/drizzle-sync/src/server/base-handler.ts` |
| SyncProvider (React) | `packages/drizzle-sync/src/react/provider.tsx` |
| Sync config (Avileo) | `packages/backend/src/sync.config.ts` |

## Architecture Patterns

- **Dual API**: Coexists static legacy (`HandlerRegistry`, `ConflictResolverRegistry`) and generic instance-based APIs. New code should prefer generic.
- **Per-operation savepoints**: `SyncEngine.processBatch()` creates a savepoint per operation — one failure rolls back just that operation.
- **Schema mismatch**: `change-applier` uses raw SQL because `@avileo/shared` uses camelCase but PGlite schema uses snake_case.
- **Stale pull detection**: PullService tracks two failure modes — cursor stuck (5 max) and empty pulls with hasMore (3 max).
- **Coalescing rules**: create+create → merge payloads; create+delete → cancel; update+delete → replace with delete.

For detailed docs, see:
- [references/architecture.md](references/architecture.md) — 8 subpaths, dual API, key classes
- [references/sync-engine.md](references/sync-engine.md) — batch processing, handlers, events
- [references/pglite-layer.md](references/pglite-layer.md) — pull service, change applier, schema mapper
- [references/react-integration.md](references/react-integration.md) — provider, hooks, context
