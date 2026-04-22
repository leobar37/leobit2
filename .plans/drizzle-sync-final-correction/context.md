# Drizzle Sync Final Correction — Context

## Overview

Finalize the `@avileo/drizzle-sync` architecture so it is truly reusable and consistently driven by `sync.config.ts` and `sync.schema.json`.

This plan targets the final correction phase after earlier migrations introduced a mixed state (part generic, part Avileo-specific).

## Background

Current state observations:

- `packages/backend/src/sync.config.ts` is the authored source of truth.
- `packages/backend/src/sync.schema.json` serializes `tableName`, columns, relations, graph priority, and tenancy.
- App migration to framework-based runtime is already in progress/completed for major paths:
  - app `engine/` and `devtools/` legacy folders were removed.
  - `SyncClientEngine` now supports auto-init via `databaseConfig`.
  - new React hook flow includes `useSyncEngineInit()` and `resetAndLogout()` wiring.
  - app uses `app/lib/sync/db-config.ts` for database init config.
- Remaining technical gaps still block final correction:
  - app build error related to sourcemap/rollup and `drizzle-sync/dist/client/index.js`.
  - `generated/applier.ts` is still not the canonical runtime source for pull/apply validation.
  - client pull/apply still has dependency on hardcoded mapper behavior via `packages/drizzle-sync/src/pglite/schema-mapper.ts` and app-level allowlists.
  - server/core still expose or consume legacy contracts from `@avileo/shared` in generic library paths.
  - identifier drift still exists between config keys (`productVariants`) and runtime entity/table names (`product_variants`).
  - worker generation for `pglite.worker.ts` is not yet integrated in CLI output.
  - debug console API (`window.avileoDebug`) has been moved but not fully absorbed in framework contracts.

## Goal

Establish a single, consistent sync identity and remove Avileo domain coupling from generic library runtime/codegen paths.

Primary decision accepted for this initiative:

- Canonical sync identity uses `entityType` in snake_case.
- For syncable entities in this repo, `entityType === tableName`.

## Key Decisions

- `sync.config.ts` remains the only handwritten sync configuration.
- `sync.schema.json` remains the serialized contract.
- Runtime apply configuration must come from generated schema artifacts, not hardcoded mapper constants.
- Consumer wiring (service factories, repository bindings, custom handler logic) remains in app/backend.
- No adapter package is required; migration is done in-monorepo.
- Preserve pending operations/conflicts through explicit data migration (no reset-only strategy).

## Scope Boundaries

- In scope:
  - stabilization after framework migration (build/runtime baseline)
  - identity normalization (`entityType`, `tableName`)
  - generator correctness (`applier`, schema-driven outputs)
  - client apply runtime wiring from generated config
  - server/core decoupling from `@avileo/shared` in generic paths
  - migration of persisted sync metadata values
  - introspection heuristic cleanup and validation hardening
- Out of scope:
  - new product features unrelated to sync internals
  - redesign of business repositories/handlers behavior
  - changes to public app UX beyond required integration updates

## Risks

- Renaming entity identifiers affects persisted queue/conflict data.
- Temporary dual-name compatibility may be needed during migration window.
- Generator changes can silently break runtime if artifact contracts are not validated end-to-end.
- Removing shared legacy types may ripple through backend sync schemas and tests.
- Existing workspace-level TypeScript errors can hide initiative-specific regressions if validation scope is not explicit.
