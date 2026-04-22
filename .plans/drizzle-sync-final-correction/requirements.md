# Requirements: Drizzle Sync Final Correction

## Objective

Complete the final correction of `@avileo/drizzle-sync` so runtime and generation are schema-driven, reusable, and free of Avileo-specific coupling in generic paths.

## Scope

- In scope:
  - Build/runtime stabilization after framework migration
  - Canonical sync identity (`entityType`) normalization to snake_case table names
  - Schema/generator alignment for applier/runtime artifacts
  - Client runtime apply configuration injection
  - Server/core generic decoupling from `@avileo/shared`
  - Persisted sync metadata migration for renamed entity identifiers
  - Introspection/validation cleanup to avoid inferred ghost entities
- Out of scope:
  - unrelated feature work
  - full rewrite of sync domain handlers
  - fixing all pre-existing workspace TypeScript errors unrelated to sync correction

## Baseline Constraints

- App currently has a known build issue involving sourcemap/rollup and `drizzle-sync/dist/client/index.js`; this must be resolved before final validation gate.
- Workspace has pre-existing TypeScript error debt; validation for this initiative must use targeted package scopes and regression-focused checks.

## Functional Requirements

### FR-001: Canonical Entity Identity
**Priority:** High
**Description:** Establish a canonical entity identity where sync `entityType` equals physical `tableName` in snake_case for syncable entities.

**Acceptance Criteria:**
- `packages/backend/src/sync.config.ts` uses canonical entity keys/types for syncable entities.
- Child/parent relations reference canonical names only.
- `sync.schema.json` serializes canonical identity consistently.
- No generated artifact emits camelCase logical keys as runtime `entityType`.

### FR-002: Schema-Driven Applier Generation
**Priority:** High
**Description:** Make applier generation consume serialized schema identity and emit runtime-ready mappings.

**Acceptance Criteria:**
- Generated applier output uses canonical snake_case table/entity names.
- Generated output includes explicit mapping/sets required by runtime apply (valid entities/tables, columns, defaults, apply order).
- `applier-generator` uses serialized `tableName` where applicable.

### FR-003: Runtime Apply Uses Generated Config
**Priority:** High
**Description:** Replace hardcoded runtime table metadata in client apply path with injected generated applier config.

**Acceptance Criteria:**
- `change-applier` and change strategies read table/column validation from injected config.
- Runtime no longer depends on Avileo-specific hardcoded table lists in hot path.
- App bootstraps engine with generated applier config.

### FR-004: Generic Library Decoupled From @avileo/shared
**Priority:** High
**Description:** Remove imports of `@avileo/shared` from generic `drizzle-sync` runtime/config paths.

**Acceptance Criteria:**
- No `@avileo/shared` imports under generic paths in `packages/drizzle-sync/src` (excluding optional explicit compat wrappers if retained).
- Server sorting/prioritization operates using config-injected metadata rather than shared hardcoded maps.
- Public generic exports compile without shared-domain type dependencies.

### FR-005: Persisted EntityType Migration
**Priority:** High
**Description:** Migrate persisted sync rows that still use legacy camelCase entity identifiers.

**Acceptance Criteria:**
- Backend migration updates legacy `entity_type`/`entity` values to canonical snake_case in sync metadata tables.
- Client-side local PGlite migration normalizes pending/dead-letter rows.
- Migration is idempotent.
- Pending operations/conflicts remain processable after migration.

### FR-006: Introspection and Graph Validation Hardening
**Priority:** Medium
**Description:** Remove domain heuristics from introspection and enforce strict graph validity.

**Acceptance Criteria:**
- Heuristic domain plural maps are removed or disabled for canonical graph creation.
- Validator fails when graph references entities not declared in config.
- Serialized graph no longer introduces undeclared entities.

### FR-007: Consumer Alignment
**Priority:** Medium
**Description:** Align app/backend consumers to canonical entity naming and schema-derived sets.

**Acceptance Criteria:**
- Backend sync schemas/types validate canonical entity names.
- App sync helpers that classify/prioritize entities consume schema-derived data or canonical constants from generated artifacts.
- Service registry mappings remain stable at API/service-name level while using canonical `entityType` values.

### FR-008: Post-Migration Stabilization
**Priority:** High
**Description:** Stabilize the new framework-based app runtime baseline so the correction plan can be validated reliably.

**Acceptance Criteria:**
- App build error caused by sourcemap/rollup with `drizzle-sync/dist/client/index.js` is resolved.
- `SyncClientEngine` auto-init flow remains functional in app routes using `databaseConfig`.
- Removed legacy folders (`app/engine`, `app/devtools`) do not leave broken imports or dead runtime dependencies.

### FR-009: Worker and Debug Integration Follow-up
**Priority:** Medium
**Description:** Close migration gaps that affect operability but are not core identity/decoupling logic.

**Acceptance Criteria:**
- CLI/framework story for `pglite.worker.ts` generation is documented and either implemented or explicitly tracked with a non-blocking follow-up path.
- Debug API transition (`window.avileoDebug` relocation) is integrated or has clear compatibility boundary/documentation.

## Non-Functional Requirements

### NFR-001: Backward Safety During Migration
- Migration path supports legacy entity names for one compatibility window while data is normalized.
- No destructive reset is required to recover from identifier mismatch.

### NFR-002: Reusability
- Generic library runtime is domain-agnostic and can operate with non-Avileo schemas.

### NFR-003: Determinism
- Generated artifacts from identical schema input are stable/deterministic.

### NFR-004: Verification Coverage
- Add tests for identity normalization, applier generation, runtime apply, sorter behavior, and migration correctness.

### NFR-005: Targeted Validation Discipline
- Validation commands must distinguish pre-existing baseline errors from new regressions introduced by this initiative.

## Acceptance Criteria

- End-to-end flow works with canonical snake_case entity names only.
- App build passes with the framework migration baseline (including `drizzle-sync/client` bundle usage).
- `sync:build-schema` and generation pipeline produce runtime-consumable artifacts without manual patching.
- Client pull/apply path validates tables/columns via generated config, not hardcoded mapper constants.
- Generic `drizzle-sync` runtime paths compile without `@avileo/shared` imports.
- Existing pending sync operations and conflicts survive migration and continue processing.
