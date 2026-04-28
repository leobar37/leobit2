# Online-First Sync Removal

## TL;DR
> **Summary**: Remove Avileo's offline-first/drizzle-sync architecture with a clean cut, while preserving the already-online sales flow and simplifying session/business state to live API refetch behavior.
> **Deliverables**:
> - Delete `packages/drizzle-sync` and all workspace/build/config references.
> - Remove backend sync configs, schema JSON, sync tables, sync metrics/cursor utilities, and public-sale pull-sync insertion.
> - Remove shared sync config and frontend PGlite/offline cache remnants.
> - Add online-first sale confirmation guard that blocks offline confirmation with Spanish UX copy.
> - Clean obsolete tests/docs/scripts and verify with build/typecheck + agent QA.
> **Effort**: Large
> **Parallel**: YES - 5 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 6 → Task 9 → Final Verification

## Context

### Original Request
The user wants to eliminate the offline-first category to think in online-first terms, remove `packages/drizzle-sync` and its app-wide usage, delete `packages/backend/src/sync.config.ts` and `packages/backend/src/sync.schema.json`, preserve current business functionality especially sales, delegate former client/offline responsibilities to the backend, and refactor the hard-to-maintain session/business preservation cache.

### Interview Summary
- Online-first behavior: sale confirmation is blocked when offline.
- Migration style: clean cut, no compatibility bridge.
- Sales priority: preserve complete sale flow: cart, optional customer, items, totals, distribution/payment where currently applicable, backend persistence, and UI confirmation.
- Pending local PGlite/sync data: ignore; no drain/export migration.
- Backend sync tables: remove `sync_operations` and `sync_dead_letter` with a DB migration.
- Session/business cache: remove persistence/cache concepts rather than replacing with another persistent cache.
- Public-sale update after pull-sync removal: use API refetch/polling, not SSE/WebSocket.
- `packages/shared/src/sync-config.ts`: delete completely, do not rename.
- Test strategy: no broad new unit/integration mandate; build/typecheck plus agent-executed manual QA. Existing tests may be updated/removed only where they block migration.

### Research Findings
- Production sales is already online-first via `packages/app/app/hooks/use-sales.ts`, `packages/app/app/hooks/use-sales-db.ts`, sales components, and sales routes. `useSaleSyncStatus` is already a stub returning synced.
- Main `@avileo/drizzle-sync` production surface: `packages/backend/src/sync.config.ts`, `packages/backend/package.json`, `turbo.json`, root `drizzle-sync.config.ts`, schema JSON files, and tests/docs. App production code does not list `@avileo/drizzle-sync` as a dependency.
- Sync router exists inside `packages/drizzle-sync/src/server/adapters/elysia.ts`, but is not mounted in `packages/backend/src/app.ts`.
- Backend sync remnants include `packages/backend/src/db/schema/sync-operations.ts`, `packages/backend/src/db/schema/sync-dead-letter.ts`, `packages/backend/src/api/sync-cursor.ts`, `packages/backend/src/services/business/sync-metrics.service.ts`, manual `syncOperations` insertion in `packages/backend/src/api/public-sales.ts`, and `RequestContext.tenantId` compatibility comments.
- Frontend offline/PGlite remnants include `packages/app/app/lib/cache.ts`, `packages/app/app/hooks/use-cached-business.ts`, `packages/app/app/lib/session-storage.ts`, `packages/app/app/lib/query/client.ts`, migration scripts, PGlite mocks, sync tests/docs, and entity mapper.
- Test infrastructure exists: Vitest for app/backend/drizzle-sync, Playwright for app E2E, MSW integration tests. Many E2E sales tests are skipped due to PGlite init and several integration tests are excluded from app Vitest config.

### Metis Review (gaps addressed)
- Added hard guardrail: do not replace offline-first with a half-online/half-cached architecture.
- Added requirement for an actual Drizzle migration dropping sync tables, not only deleting schema files.
- Added static acceptance checks for no obsolete imports/references.
- Added manual QA gates for login, business context, sales, offline blocked sale confirmation, and public sale refetch/polling.
- Added scope guardrails against SSE/WebSocket, new sync queues, local data drain/export, broad test rewrites, or unrelated sales UX redesign.

## Work Objectives

### Core Objective
Convert Avileo to a clean online-first architecture by deleting sync/offline infrastructure and simplifying frontend state while keeping sales fully functional through backend API calls.

### Deliverables
- Removed `packages/drizzle-sync/` workspace package and all references.
- Removed sync codegen artifacts/configs including `drizzle-sync.config.ts`, `packages/backend/src/sync.config.ts`, `packages/backend/src/sync.schema.json`, `packages/drizzle-sync/src/sync.schema.json`, and root `src/sync.schema.json` if present.
- Removed `packages/shared/src/sync-config.ts` and all consumers.
- Removed backend sync tables from schema exports and added a migration dropping `sync_operations` and `sync_dead_letter`.
- Removed backend sync metrics/cursor/dead-letter usage and public-sale `syncOperations` insertion.
- Removed frontend PGlite/offline cache remnants and query `offlineFirst` behavior.
- Added offline guard for sale confirmation with Spanish copy: `Necesitas conexión a internet para confirmar la venta.`
- Updated or deleted obsolete tests/docs/scripts that refer to removed sync/PGlite artifacts.

### Definition of Done (verifiable conditions with commands)
- `bun run build` from repo root passes.
- `cd packages/backend && bun run build` passes if the script exists.
- `cd packages/app && bun run build` passes if the script exists.
- Static search finds no `@avileo/drizzle-sync` references outside historical lockfile diff/migration notes generated during the implementation.
- Static search finds no `packages/shared/src/sync-config.ts` import or `SYNC_ENTITIES`/`ENTITY_PRIORITIES` consumer.
- Static search finds no production frontend `PGlite` usage.
- Static search finds no backend runtime `sync_operations` / `sync_dead_letter` references except in the new drop migration.
- Agent Playwright QA evidence exists for online sale creation and offline sale blocked behavior.

### Must Have
- Preserve online sale flow behavior and UI confirmation.
- Preserve auth/protected-route/business context loading through backend API refetch.
- Ensure backend starts without `@avileo/drizzle-sync` and without sync config/schema imports.
- Ensure DB migration explicitly drops sync tables.
- Remove active offline-first product/technical language from code/docs touched by this migration.

### Must NOT Have
- Must not introduce a new sync queue, compatibility bridge, local write queue, or data drain/export.
- Must not preserve offline sale creation/confirmation.
- Must not introduce SSE/WebSocket or real-time transport.
- Must not add new persistent business/session cache or caching library.
- Must not redesign sales UX beyond the offline-blocking message.
- Must not remove unrelated shared schema/types or business modules.
- Must not require human verification as acceptance criteria.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: manual agent QA + build/typecheck only. No broad TDD or mandatory new unit/integration tests.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Required commands:
  - `bun run build`
  - `cd packages/backend && bun run build` if present in `packages/backend/package.json`
  - `cd packages/app && bun run build` if present in `packages/app/package.json`
  - Static reference checks using repo search tools or equivalent read-only commands.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan uses smaller waves because package deletion, schema migration, and frontend cleanup have real dependency ordering.

Wave 1: Task 1 (inventory/guardrail baseline), Task 2 (remove package/build/codegen references), Task 3 (backend DB/schema sync removal)
Wave 2: Task 4 (backend runtime sync remnants), Task 5 (shared sync config deletion), Task 6 (frontend PGlite/session cache cleanup)
Wave 3: Task 7 (sales online/offline guard), Task 8 (public sale refetch/polling), Task 9 (tests/docs/scripts cleanup)
Wave 4: Task 10 (build/static verification remediation)
Wave 5: Final Verification Wave

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2-10 by establishing reference inventory and search baseline.
- Task 2 blocks Task 10 because workspace/build references must be removed before final build.
- Task 3 blocks Task 4 and Task 10 because backend schema exports and DB migration must be reconciled.
- Task 4 depends on Task 3 for schema/runtime sync reference cleanup.
- Task 5 depends on Task 1 only and can run after inventory.
- Task 6 depends on Task 1 only and can run parallel with backend cleanup.
- Task 7 depends on Task 6 if session/query online state changes affect offline detection, otherwise can run in Wave 3.
- Task 8 depends on Task 4 because public-sale sync insertion must be removed before refetch/polling behavior is finalized.
- Task 9 depends on Tasks 2, 5, 6, 7, 8 because tests/docs must reflect final code shape.
- Task 10 depends on all implementation cleanup tasks.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → `deep`, `unspecified-high`, `fullstack-backend`
- Wave 2 → 3 tasks → `fullstack-backend`, `quick`, `visual-engineering`
- Wave 3 → 3 tasks → `visual-engineering`, `fullstack-backend`, `unspecified-high`
- Wave 4 → 1 task → `deep`
- Final → 4 review tasks → oracle, unspecified-high, unspecified-high, deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Establish sync/offline removal baseline

  **What to do**: Before deleting anything, create a focused inventory inside the agent's working notes (not a committed app file) of current references to `@avileo/drizzle-sync`, `packages/drizzle-sync`, `drizzle-sync.config`, `sync.schema.json`, `sync-config`, `SYNC_ENTITIES`, `ENTITY_PRIORITIES`, `PGlite`, `offlineFirst`, `syncOperations`, `syncDeadLetter`, `sync_metrics`, and `sync-cursor`. Use this inventory only to drive deletions and final static checks.
  **Must NOT do**: Do not create source documentation files. Do not alter code in this task except if implementing later tasks in same agent session is explicitly requested by executor workflow.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: cross-package reference mapping with architecture-level risk.
  - Skills: [`avileo-sync`] - Needed to understand current sync/offline terms and avoid deleting unrelated business code.
  - Omitted: [`frontend`] - No UI implementation in this inventory task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 2-10 | Blocked By: none

  **References**:
  - Pattern: `packages/backend/src/sync.config.ts` - main backend drizzle-sync config to remove.
  - Pattern: `packages/app/app/lib/session-storage.ts` - session/offline key surface.
  - Pattern: `packages/app/app/lib/query/client.ts` - current TanStack Query network mode.
  - Pattern: `packages/backend/src/api/public-sales.ts` - manual `syncOperations` insertion requiring refactor.

  **Acceptance Criteria**:
  - [ ] Executor has a complete reference list before deletion work begins.
  - [ ] Reference list includes backend, app, shared, root config, tests, docs, lock/build config, and generated schema artifacts.
  - [ ] No source code is changed solely by this inventory task.

  **QA Scenarios**:
  ```
  Scenario: Inventory catches known critical references
    Tool: Bash / Grep
    Steps: Search for @avileo/drizzle-sync, sync.config.ts, syncOperations, PGlite, offlineFirst.
    Expected: Findings include packages/backend/src/sync.config.ts, packages/backend/src/api/public-sales.ts, packages/app/app/lib/query/client.ts, and frontend cache/session files.
    Evidence: .sisyphus/evidence/task-1-baseline-search.txt

  Scenario: Inventory does not include unrelated sales API hooks as sync blockers
    Tool: Read / Grep
    Steps: Inspect packages/app/app/hooks/use-sales.ts and packages/app/app/hooks/use-sales-db.ts for direct PGlite or @avileo/drizzle-sync imports.
    Expected: No direct PGlite or @avileo/drizzle-sync import is found in production sales hooks.
    Evidence: .sisyphus/evidence/task-1-sales-online-baseline.txt
  ```

  **Commit**: NO | Message: n/a | Files: none

- [x] 2. Remove `packages/drizzle-sync` workspace package and codegen/build references

  **What to do**: Delete `packages/drizzle-sync/`. Remove workspace references from root/package workspace config if present, `turbo.json`, `bun.lock` via dependency regeneration, `packages/backend/package.json`, root `drizzle-sync.config.ts`, root `src/sync.schema.json` if present, `packages/backend/src/sync.schema.json`, and any generated sync schema JSON that belongs to the deleted package. Ensure no package imports `@avileo/drizzle-sync` after this task.
  **Must NOT do**: Do not keep a compatibility package stub. Do not preserve codegen configs. Do not delete unrelated packages.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: destructive cleanup across workspace/build/lock files.
  - Skills: [`avileo-sync`] - Needed to distinguish sync package artifacts from shared app code.
  - Omitted: [`fullstack-backend`] - Backend runtime refactor is handled separately.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 10 | Blocked By: Task 1

  **References**:
  - Pattern: `packages/drizzle-sync/package.json` - package name `@avileo/drizzle-sync`.
  - Pattern: `turbo.json` - remove `@avileo/drizzle-sync#build` task.
  - Pattern: `packages/backend/package.json` - remove workspace dependency.
  - Pattern: `drizzle-sync.config.ts` - root codegen config to delete.

  **Acceptance Criteria**:
  - [ ] `packages/drizzle-sync/` no longer exists.
  - [ ] `packages/backend/package.json` no longer depends on `@avileo/drizzle-sync`.
  - [ ] `turbo.json` no longer references `@avileo/drizzle-sync#build`.
  - [ ] Root `drizzle-sync.config.ts` and sync schema JSON artifacts are removed.
  - [ ] Static search returns no active `@avileo/drizzle-sync` reference outside lockfile changes that will be regenerated.

  **QA Scenarios**:
  ```
  Scenario: Workspace package is fully removed
    Tool: Bash / Glob
    Steps: Verify packages/drizzle-sync does not exist and workspace/build configs no longer reference it.
    Expected: No package directory and no workspace/turbo reference remains.
    Evidence: .sisyphus/evidence/task-2-package-removal.txt

  Scenario: Backend cannot import deleted package
    Tool: Bash
    Steps: Run static search for '@avileo/drizzle-sync' after dependency cleanup.
    Expected: Zero active source/config references remain.
    Evidence: .sisyphus/evidence/task-2-no-drizzle-sync-imports.txt
  ```

  **Commit**: YES | Message: `refactor(sync): remove drizzle sync workspace package` | Files: `packages/drizzle-sync/**`, `turbo.json`, `packages/backend/package.json`, `bun.lock`, `drizzle-sync.config.ts`, sync schema JSON artifacts

- [x] 3. Remove backend sync tables and add drop migration

  **What to do**: Remove backend schema files for `sync_operations` and `sync_dead_letter` from `packages/backend/src/db/schema/` and from `packages/backend/src/db/schema/index.ts`. Add a Drizzle migration that drops `sync_dead_letter` first if it depends on `sync_operations`, then drops `sync_operations`. Ensure migration is idempotent or follows project migration conventions. Update imports in backend code that depended on these tables so Task 4 can remove runtime services cleanly.
  **Must NOT do**: Do not drop unrelated audit/business tables. Do not leave schema exports for dropped tables. Do not skip the migration.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: database schema and migration cleanup affects production data shape.
  - Skills: [`fullstack-backend`, `bun-elysia`] - Drizzle schema/migration and backend conventions.
  - Omitted: [`frontend`] - No UI changes.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 4, 10 | Blocked By: Task 1

  **References**:
  - Pattern: `packages/backend/src/db/schema/sync-operations.ts` - table to remove.
  - Pattern: `packages/backend/src/db/schema/sync-dead-letter.ts` - table to remove.
  - Pattern: `packages/backend/src/db/schema/index.ts` - schema export aggregator currently opened by user.
  - Pattern: `packages/backend/AGENTS.md` - backend Drizzle conventions.

  **Acceptance Criteria**:
  - [ ] Backend schema index no longer exports sync operation/dead-letter tables.
  - [ ] A migration exists that drops both tables in safe order.
  - [ ] Static search finds no runtime schema import for `syncOperations` or `syncDeadLetter` except the migration file.
  - [ ] Migration does not touch unrelated business/auth tables.

  **QA Scenarios**:
  ```
  Scenario: Schema exports no dropped sync tables
    Tool: Read / Grep
    Steps: Inspect packages/backend/src/db/schema/index.ts and search backend schema imports for syncOperations/syncDeadLetter.
    Expected: No schema export or runtime import remains outside migration.
    Evidence: .sisyphus/evidence/task-3-schema-exports.txt

  Scenario: Migration drops only sync tables
    Tool: Read
    Steps: Inspect generated/manual migration SQL.
    Expected: Migration drops sync_dead_letter and sync_operations only, in safe order.
    Evidence: .sisyphus/evidence/task-3-drop-migration.txt
  ```

  **Commit**: YES | Message: `refactor(backend): drop sync operation tables` | Files: `packages/backend/src/db/schema/sync-operations.ts`, `packages/backend/src/db/schema/sync-dead-letter.ts`, `packages/backend/src/db/schema/index.ts`, backend migrations

- [x] 4. Remove backend runtime sync remnants

  **What to do**: Delete `packages/backend/src/sync.config.ts`, `packages/backend/src/api/sync-cursor.ts`, and `packages/backend/src/services/business/sync-metrics.service.ts`. Remove imports/exports/routes/services depending on those files. In `packages/backend/src/api/public-sales.ts`, remove the manual `syncOperations` insertion used for pull-sync updates and replace the behavior with no sync side effect; public-sale changes must be visible through normal API refetch/polling. In `packages/backend/src/context/request-context.ts`, remove drizzle-sync compatibility wording while keeping `tenantId` only if still used by non-sync code; delete it if truly unused and build-safe.
  **Must NOT do**: Do not mount new `/sync` routes. Do not add SSE/WebSocket. Do not preserve sync metrics under another name.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: backend runtime cleanup and business flow side-effect removal.
  - Skills: [`fullstack-backend`, `bun-elysia`] - Backend API/service patterns and RequestContext conventions.
  - Omitted: [`avileo-sync`] - Removal is already decided; avoid redesigning sync.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 8, 10 | Blocked By: Tasks 1, 3

  **References**:
  - Pattern: `packages/backend/src/api/public-sales.ts` - remove sync operation insertion after public sale confirmation.
  - Pattern: `packages/backend/src/app.ts` - verify no sync router is mounted.
  - Pattern: `packages/backend/src/context/request-context.ts` - compatibility alias/comment cleanup.
  - Pattern: `packages/backend/src/services/business/sync-metrics.service.ts` - delete service.

  **Acceptance Criteria**:
  - [ ] Backend has no `sync.config.ts`, `sync.schema.json`, `sync-cursor.ts`, or `sync-metrics.service.ts` runtime dependency.
  - [ ] `public-sales.ts` no longer imports/inserts `syncOperations`.
  - [ ] `packages/backend/src/app.ts` has no `/sync` router mount.
  - [ ] Backend build/typecheck passes after cleanup.

  **QA Scenarios**:
  ```
  Scenario: Public sale confirmation has no sync side effect
    Tool: Read / Grep
    Steps: Inspect packages/backend/src/api/public-sales.ts and search for syncOperations/sync operation insertion.
    Expected: No syncOperations insertion remains; sale update path still persists through normal backend service/repository behavior.
    Evidence: .sisyphus/evidence/task-4-public-sales-no-sync.txt

  Scenario: Backend sync routes are absent
    Tool: Read / Grep
    Steps: Inspect packages/backend/src/app.ts and search backend API registration for sync router/cursor routes.
    Expected: No sync router or cursor route is mounted.
    Evidence: .sisyphus/evidence/task-4-no-sync-routes.txt
  ```

  **Commit**: YES | Message: `refactor(backend): remove sync runtime remnants` | Files: `packages/backend/src/sync.config.ts`, `packages/backend/src/sync.schema.json`, `packages/backend/src/api/sync-cursor.ts`, `packages/backend/src/services/business/sync-metrics.service.ts`, `packages/backend/src/api/public-sales.ts`, `packages/backend/src/context/request-context.ts`

- [x] 5. Delete shared sync config and update consumers

  **What to do**: Delete `packages/shared/src/sync-config.ts`. Remove or replace all imports of `SYNC_ENTITIES`, `ENTITY_PRIORITIES`, `SELF_HEAL_INSERTABLE`, or other sync config exports. If a consumer only existed for sync/offline logic, delete that consumer. If a consumer is still needed for business logic, replace with local non-sync constants only inside that feature, but do not recreate a shared sync/entity config.
  **Must NOT do**: Do not rename `sync-config.ts` to `entity-config.ts`. Do not reintroduce global entity priority concepts. Do not delete unrelated shared schema exports.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused deletion and import cleanup.
  - Skills: [`avileo`] - Project import conventions.
  - Omitted: [`fullstack-backend`] - No schema/API design required.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 10 | Blocked By: Task 1

  **References**:
  - Pattern: `packages/shared/src/sync-config.ts` - delete completely.
  - Pattern: `packages/shared/src/AGENTS.md` - shared package conventions.

  **Acceptance Criteria**:
  - [ ] `packages/shared/src/sync-config.ts` no longer exists.
  - [ ] Static search finds no `SYNC_ENTITIES`, `ENTITY_PRIORITIES`, `SELF_HEAL_INSERTABLE`, or `sync-config` import.
  - [ ] Shared package exports do not reference deleted sync config.

  **QA Scenarios**:
  ```
  Scenario: Shared sync config is gone
    Tool: Glob / Grep
    Steps: Verify packages/shared/src/sync-config.ts is absent and search for sync-config imports.
    Expected: File absent; zero imports remain.
    Evidence: .sisyphus/evidence/task-5-shared-sync-config.txt

  Scenario: Shared business schema remains intact
    Tool: Bash
    Steps: Run shared package build if script exists, or root build later.
    Expected: Shared exports compile without sync-config.
    Evidence: .sisyphus/evidence/task-5-shared-build.txt
  ```

  **Commit**: YES | Message: `refactor(shared): remove sync entity config` | Files: `packages/shared/src/sync-config.ts`, shared export/consumer files

- [x] 6. Remove frontend PGlite cache and offline-first session/business persistence

  **What to do**: Remove PGlite-backed cache and local DB namespace concepts from frontend. Delete or refactor `packages/app/app/lib/cache.ts` and `packages/app/app/hooks/use-cached-business.ts` so business/session state is fetched live from API and not persisted as offline bootstrap data. Simplify `packages/app/app/lib/session-storage.ts` to keep only required auth/session values if still used by Better Auth/protected route flow; remove sync cursor keys, schema hash/version keys, local DB namespace, PGlite/Electric/TanStackDB IndexedDB cleanup, and calculator/offline keys if they only exist for offline persistence. Change `packages/app/app/lib/query/client.ts` from `networkMode: "offlineFirst"` to default/online behavior. Keep `packages/app/app/lib/query/persister.ts` only if it remains necessary for non-offline UI cache; do not use it for business/session preservation.
  **Must NOT do**: Do not introduce new persistent business/session cache. Do not add IndexedDB/local queue replacement. Do not remove auth token handling unless protected routes still pass.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: frontend behavior/state cleanup affects UX and protected routes.
  - Skills: [`frontend`, `avileo`] - React Router/TanStack Query/project frontend patterns.
  - Omitted: [`avileo-sync`] - Sync deletion is already decided; avoid preserving offline logic.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 7, 10 | Blocked By: Task 1

  **References**:
  - Pattern: `packages/app/app/lib/cache.ts` - PGlite `app_cache` table, remove/replace with no persistence.
  - Pattern: `packages/app/app/hooks/use-cached-business.ts` - remove PGlite business user cache.
  - Pattern: `packages/app/app/lib/session-storage.ts` - remove namespace/sync/IndexedDB cleanup keys.
  - Pattern: `packages/app/app/lib/query/client.ts` - remove `networkMode: "offlineFirst"`.
  - Pattern: `packages/app/app/routes/_protected.tsx` - preserve protected route auth/business behavior.
  - Pattern: `packages/app/app/hooks/use-business.ts` - preserve API refetch business context behavior.

  **Acceptance Criteria**:
  - [ ] Production frontend code has no PGlite import/reference.
  - [ ] `use-cached-business.ts` is deleted or no longer uses persistent/PGlite cache.
  - [ ] `session-storage.ts` no longer stores local DB namespace, sync cursors, schema hash/version, or IndexedDB DB names.
  - [ ] Query client no longer sets `networkMode: "offlineFirst"` globally.
  - [ ] Login/protected route/business load still works through API refetch.

  **QA Scenarios**:
  ```
  Scenario: Business context loads after login without PGlite cache
    Tool: Playwright
    Steps: Start app/backend using project dev command, login with demo user, navigate to protected home/sales page.
    Expected: Protected page loads business context from API; no PGlite cache error appears in console.
    Evidence: .sisyphus/evidence/task-6-business-context.png

  Scenario: Reload does not depend on local DB namespace
    Tool: Playwright
    Steps: Login, open sales page, reload browser tab, inspect UI and console.
    Expected: Session/business refetch succeeds or redirects through normal auth flow; no local_db_namespace/PGlite/IndexedDB error.
    Evidence: .sisyphus/evidence/task-6-reload-no-namespace.png
  ```

  **Commit**: YES | Message: `refactor(app): remove offline business cache` | Files: `packages/app/app/lib/cache.ts`, `packages/app/app/hooks/use-cached-business.ts`, `packages/app/app/lib/session-storage.ts`, `packages/app/app/lib/query/client.ts`, affected auth/business route files

- [x] 7. Preserve sales flow and add online-only sale confirmation guard

  **What to do**: Keep existing API-based sales hooks and UI behavior. Add an explicit offline guard at the sale confirmation/final submit path so a disconnected seller cannot confirm/register a sale. Use user-facing Spanish copy exactly: `Necesitas conexión a internet para confirmar la venta.` The guard may use `navigator.onLine`, an existing connectivity hook if present, or a small local check; it must not queue a sale. Ensure cart, optional customer, item totals, distribution/payment behavior, backend persistence, and success confirmation remain unchanged online.
  **Must NOT do**: Do not rewrite sales around local storage/PGlite. Do not redesign calculator/cart UX beyond the offline-blocking message. Do not make draft/cart persistence a new offline feature.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI behavior and sale confirmation UX.
  - Skills: [`frontend`, `avileo`, `e2e-testing`] - Sales frontend patterns and QA flows.
  - Omitted: [`fullstack-backend`] - Backend sale APIs already exist unless build reveals otherwise.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 9, 10 | Blocked By: Task 6

  **References**:
  - Pattern: `packages/app/app/hooks/use-sales.ts` - existing Eden Treaty API sales mutations.
  - Pattern: `packages/app/app/hooks/use-sales-db.ts` - wrapper hooks used by sales UI.
  - Pattern: `packages/app/app/components/sales/new-sale.tsx` - sale submit UI path.
  - Pattern: `packages/app/app/routes/_protected.ventas.$id.editar.calculadora.tsx` - item update/add path.

  **Acceptance Criteria**:
  - [ ] Online sale creation/confirmation still calls backend API and succeeds.
  - [ ] Optional customer selection still works.
  - [ ] Item quantities/totals remain correct.
  - [ ] Payment/distribution behavior remains as currently implemented.
  - [ ] Offline final confirmation is blocked with exact Spanish message.
  - [ ] No local sync operation or local sale is queued when offline.

  **QA Scenarios**:
  ```
  Scenario: Online complete sale succeeds
    Tool: Playwright
    Steps: Login with demo user, open sales/new flow, add at least one product/item, optionally select a customer if available, confirm sale.
    Expected: Backend persistence succeeds; UI shows sale confirmation/success state; sale appears in sales list/detail after refetch.
    Evidence: .sisyphus/evidence/task-7-online-sale.png

  Scenario: Offline sale confirmation is blocked
    Tool: Playwright
    Steps: Login, open sales/new flow, add item, set browser offline via Playwright context, click final confirm/register sale.
    Expected: UI shows `Necesitas conexión a internet para confirmar la venta.`; no success confirmation appears; no queued sync/local sale side effect exists.
    Evidence: .sisyphus/evidence/task-7-offline-blocked.png
  ```

  **Commit**: YES | Message: `feat(sales): require connection for sale confirmation` | Files: `packages/app/app/components/sales/new-sale.tsx`, `packages/app/app/hooks/use-sales.ts`, `packages/app/app/hooks/use-sales-db.ts`, any minimal connectivity helper

- [x] 8. Replace public-sale pull-sync update path with API refetch/polling behavior

  **What to do**: After removing `syncOperations` insertion in backend, ensure the vendor-facing sale list/detail can see public sale changes through normal API refetch/polling. Prefer TanStack Query invalidation/refetch on focus/route entry and modest polling only on pages that need it. Use no SSE/WebSocket. If polling is needed, use a conservative interval of 30 seconds unless an existing project pattern specifies otherwise. Ensure public sale confirmation backend behavior still updates the authoritative sale state.
  **Must NOT do**: Do not add real-time infrastructure. Do not reintroduce pull sync, cursor sync, or a local queue.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-check backend public sale state and frontend refetch behavior.
  - Skills: [`frontend`, `fullstack-backend`, `avileo`] - Needs both API and UI query behavior.
  - Omitted: [`fullstack-inngest`] - No background jobs/queues.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 9, 10 | Blocked By: Task 4

  **References**:
  - Pattern: `packages/backend/src/api/public-sales.ts` - authoritative public sale confirmation/update route.
  - Pattern: `packages/app/app/hooks/use-sales.ts` - sale list/detail query invalidation/refetch behavior.
  - Pattern: `packages/app/app/routes/_protected.ventas._index.tsx` - sales list page.
  - Pattern: `packages/app/app/routes/_protected.ventas.$id._index.tsx` - sale detail page.

  **Acceptance Criteria**:
  - [ ] Public sale state change persists in backend without sync table insertion.
  - [ ] Vendor sale list/detail refetches state from API on navigation/focus or via 30s polling where needed.
  - [ ] Static search confirms no sync cursor/pull-sync dependency for public-sale updates.
  - [ ] No SSE/WebSocket code is introduced.

  **QA Scenarios**:
  ```
  Scenario: Vendor sees public sale update after refetch
    Tool: Playwright / Bash
    Steps: Create or identify sale with public link/test token, perform public confirmation/update through existing public sale route/API, then navigate vendor sale list/detail or wait for configured polling/refetch.
    Expected: Vendor UI shows updated sale state from backend API without sync operation records.
    Evidence: .sisyphus/evidence/task-8-public-sale-refetch.png

  Scenario: No real-time transport introduced
    Tool: Grep
    Steps: Search changed files for EventSource, WebSocket, SSE, sync cursor, and pull-sync references.
    Expected: No new real-time or pull-sync mechanism is present.
    Evidence: .sisyphus/evidence/task-8-no-realtime.txt
  ```

  **Commit**: YES | Message: `refactor(sales): use api refetch for public sale updates` | Files: `packages/backend/src/api/public-sales.ts`, `packages/app/app/hooks/use-sales.ts`, sales route files if needed

- [x] 9. Remove obsolete sync/PGlite scripts, tests, mocks, docs, and route artifacts

  **What to do**: Delete or update obsolete scripts/tests/docs that only exist for offline-first/PGlite/drizzle-sync. Remove app migration scripts such as `migrate-to-pglite.ts`, `rollback-migration.ts`, `verify-migration.ts`, `migrate-tanstack-to-pglite.ts` if present. Delete PGlite mocks if no longer used. Delete sync E2E/integration tests and docs that target removed sync architecture, or rewrite only the minimal pieces needed to stop build/test failures. Remove React Router sync route/types only if an actual sync page route exists and is obsolete. Remove active README/docs claims that Avileo is offline-first in touched docs; do not perform a broad docs rewrite beyond obsolete claims.
  **Must NOT do**: Do not rewrite the entire skipped E2E suite. Do not create new test infrastructure. Do not delete tests for online sales/auth/business behavior.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: broad repo cleanup with risk of deleting useful tests.
  - Skills: [`avileo`, `e2e-testing`] - Project docs/tests and Playwright conventions.
  - Omitted: [`writing`] - This is technical cleanup, not prose rewrite.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 10 | Blocked By: Tasks 2, 5, 6, 7, 8

  **References**:
  - Pattern: `packages/app/tests/integration/sync/` - sync integration tests to delete/update.
  - Pattern: `packages/app/e2e/tests/sync-tests.spec.ts` - sync E2E test to delete/update.
  - Pattern: `packages/app/tests/mocks/pglite-mock.ts` - PGlite test mock to delete if unused.
  - Pattern: `packages/app/scripts/migrate-to-pglite.ts` and related migration scripts - delete if present.
  - Pattern: `packages/app/docs/SYNC_TESTING.md` - obsolete sync testing doc.
  - Pattern: `README.md`, `AGENTS.md` - offline-first claims may remain as docs debt unless touched by this migration; update only if build/docs references break or active guidance is misleading for agents.

  **Acceptance Criteria**:
  - [ ] Obsolete sync/PGlite tests/docs/scripts do not reference deleted packages/files.
  - [ ] No active test config includes deleted sync/PGlite test files.
  - [ ] Sales/auth/business tests are not deleted unless they are purely sync/PGlite obsolete.
  - [ ] Active technical docs touched by the migration no longer claim offline-first as current architecture.

  **QA Scenarios**:
  ```
  Scenario: Removed tests do not leave config holes
    Tool: Bash / Read
    Steps: Inspect packages/app/vitest.config.ts, Playwright configs, and package scripts for references to deleted sync/PGlite test files.
    Expected: No config points to deleted files; online sales/auth/business tests remain discoverable.
    Evidence: .sisyphus/evidence/task-9-test-config-cleanup.txt

  Scenario: Obsolete docs/scripts are gone
    Tool: Glob / Grep
    Steps: Search for SYNC_TESTING, migrate-to-pglite, pglite-mock, sync-tests, and @avileo/drizzle-sync in docs/scripts/tests.
    Expected: No active obsolete files/reference remains except intentionally retained historical notes if any are outside build/runtime scope.
    Evidence: .sisyphus/evidence/task-9-docs-scripts-cleanup.txt
  ```

  **Commit**: YES | Message: `chore(sync): remove obsolete offline tests and docs` | Files: sync/PGlite tests, mocks, scripts, docs, route artifacts

- [x] 10. Run build/static verification and remediate leftovers

  **What to do**: Run final build/typecheck commands and static searches. Fix any compile errors or leftover references caused by prior tasks. Required static checks: `@avileo/drizzle-sync`, `packages/drizzle-sync`, `drizzle-sync.config`, `sync.schema.json`, `sync-config`, `SYNC_ENTITIES`, `ENTITY_PRIORITIES`, `PGlite` in production frontend code, `offlineFirst`, `syncOperations`, `syncDeadLetter`, `sync_metrics`, `sync-cursor`, `sync_operations`, `sync_dead_letter`. Only allow `sync_operations`/`sync_dead_letter` in the new drop migration if migration naming/content requires it.
  **Must NOT do**: Do not add compatibility shims to satisfy build. Do not weaken the migration decisions to pass compile faster.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: repo-wide final remediation after cross-package deletion.
  - Skills: [`avileo`, `frontend`, `fullstack-backend`] - Needs all package conventions.
  - Omitted: [`avileo-sync`] - The goal is absence of sync, not sync repair.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: Tasks 2-9

  **References**:
  - Pattern: root `package.json` - root build command.
  - Pattern: `packages/backend/package.json` - backend build command if present.
  - Pattern: `packages/app/package.json` - app build command if present.
  - Pattern: `packages/shared/package.json` - shared build command if present.

  **Acceptance Criteria**:
  - [ ] `bun run build` passes.
  - [ ] Package-level builds pass where scripts exist.
  - [ ] Static searches return zero active forbidden references.
  - [ ] Any remaining references are only inside generated migration history and are documented in evidence.
  - [ ] No source file imports a deleted path.

  **QA Scenarios**:
  ```
  Scenario: Build passes cleanly
    Tool: Bash
    Steps: Run bun run build from repo root, then package-level builds if scripts exist.
    Expected: All required build commands exit 0.
    Evidence: .sisyphus/evidence/task-10-build.log

  Scenario: Forbidden references absent
    Tool: Bash / Grep
    Steps: Search repository for forbidden sync/offline terms listed in this task.
    Expected: Zero active runtime/source/config references remain, except allowed drop migration terms.
    Evidence: .sisyphus/evidence/task-10-static-search.txt
  ```

  **Commit**: YES | Message: `chore: verify online first sync removal` | Files: any residual fixes from build/static verification

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Verify every confirmed decision was implemented: clean cut, no drain/export, sync tables dropped, no cache replacement, public-sale refetch/polling, offline sale blocked.
  - Evidence: `.sisyphus/evidence/f1-plan-compliance.md`
- [x] F2. Code Quality Review — unspecified-high
  - Review for dead imports, compatibility shims, half-online cache leftovers, unnecessary broad refactors, and AI slop.
  - Evidence: `.sisyphus/evidence/f2-code-quality.md`
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Execute Playwright QA: login, business context load, online sale creation, optional customer if test data exists, sale totals/items, success confirmation, offline sale blocked, public sale refetch/polling.
  - Evidence: `.sisyphus/evidence/f3-manual-qa.md` plus screenshots/videos.
- [x] F4. Scope Fidelity Check — deep
  - Confirm no SSE/WebSocket, no new sync queue, no new persistent business/session cache, no unrelated sales UX redesign, no broad test rewrite beyond cleanup.
  - Evidence: `.sisyphus/evidence/f4-scope-fidelity.md`

## Commit Strategy
- Prefer one commit per major wave if executor workflow supports it:
  1. `refactor(sync): remove drizzle sync workspace package`
  2. `refactor(backend): remove sync persistence and runtime`
  3. `refactor(app): remove offline cache and require online sales`
  4. `chore(sync): remove obsolete tests and docs`
  5. `chore: verify online first sync removal`
- Do not push unless explicitly requested by the user.
- Do not commit secrets or environment files.

## Success Criteria
- Avileo builds without `packages/drizzle-sync`.
- Backend schema/migrations no longer include active sync operation/dead-letter tables.
- Frontend production code no longer uses PGlite/offline-first persistence for business/session state.
- Sales remains fully usable online and is explicitly blocked offline at final confirmation.
- Public sale updates are visible through API refetch/polling, not pull sync.
- Static checks show no active offline-first/drizzle-sync runtime references.
- Final verification agents approve and the user explicitly okays the consolidated verification results.
