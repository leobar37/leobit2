# JUAVIK canonical dataset + client2 seed

## TL;DR
> **Summary**: Complete the JUAVIK notebook ingestion in two strict stages: generate 100 canonical JSON files from the 100 notebook images, then build a dedicated `client2` backend seed derived only from those canonical files.
> **Deliverables**:
> - 100 canonical JSON files in `data-avileo/extractions/JUAVIK/canonical/`
> - deterministic validation/audit for completeness and blocking ambiguities
> - `packages/backend/src/seed/client2-data.ts`
> - `packages/backend/src/seed/seed-client2.ts`
> - backend script `db:seed:client2`
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: Canonical contract → complete 100 canonical files → validation/audit → deterministic dataset mapping → seed-client2 entrypoint → verification

## Context
### Original Request
Analyze the `data-avileo` folder and use the 100 notebook images to build a backend seed similar to `packages/backend/src/seed/demo-user.ts`.

### Interview Summary
- User confirmed the seed must include products, variants, initial inventory, customers, sales, and abonos.
- User explicitly chose a two-stage approach: generate canonical JSON first, then build the seed.
- User chose a dedicated seed entrypoint named `seed-client2.ts`.
- Corrected credentials are fixed as `juavik@gmail.com` / `Prubea@123`.

### Metis Review (gaps addressed)
- Locked stage isolation: stage 2 may read canonical JSON only, never JPG/OCR output directly.
- Added fail-fast policy for blocking ambiguity in financial rows.
- Added deterministic completeness rules: one canonical file per image, frozen page ordering, machine-checkable validation.
- Chose explicit normalization maps for customer/product identity instead of fuzzy matching.
- Chose client-specific implementation over a generic import platform.

## Work Objectives
### Core Objective
Produce a deterministic, auditable JUAVIK ingestion pipeline that converts 100 notebook images into canonical JSON and then into a dedicated backend seed for client2.

### Deliverables
- Canonical manifest defining the 100 expected pages and their frozen order.
- Completed canonical JSON files for all 100 images, including placeholders for blank/unreadable pages.
- Validation tooling/tests for schema correctness, count completeness, blocking review flags, and deterministic ordering.
- Canonical-to-seed transformation dataset in `packages/backend/src/seed/client2-data.ts`.
- Dedicated seeding entrypoint in `packages/backend/src/seed/seed-client2.ts` using JUAVIK credentials.
- Backend package script `db:seed:client2`.
- Non-regression verification for existing seed commands.

### Definition of Done (verifiable conditions with commands)
- `cd /Users/leobar37/code/avileo/packages/backend && bun run test:run` exits 0 with the new canonical/seed tests included.
- Canonical completeness test asserts `100` JPG files and `100` canonical JSON files with one-to-one page mapping.
- Canonical validation test asserts `0` invalid canonical files and `0` duplicate page IDs.
- Seed validation test asserts stage 2 rejects blocking canonical ambiguity with non-zero exit.
- `cd /Users/leobar37/code/avileo/packages/backend && bun run db:seed:client2` exits 0 on a clean dev database.
- Seed verification asserts one business/user for `juavik@gmail.com` and non-zero counts for products, variants, inventory, customers, sales, and abonos.
- Existing commands `bun run db:seed`, `bun run db:seed:client`, and `bun run db:seed:demo` still pass their smoke verification after the work.

### Must Have
- One canonical file per source image.
- Deterministic sort order defined from a frozen manifest, not ad hoc filesystem order.
- Explicit normalization maps for customer aliases, product aliases, payment markers, and carry-over balance semantics.
- Provenance from every seeded record back to canonical source file + line/block reference.
- Dedicated `seed-client2.ts` entrypoint and backend script.
- Backfill sync execution after seed completion, matching existing dedicated seed flows.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No direct stage-2 reads from JPG images, OCR raw output, or pass-1/pass-2 folders.
- No fuzzy matching service, review UI, or generic import framework.
- No silent seeding of rows with unresolved blocking review flags.
- No changes to unrelated business logic or refactors of all seed infrastructure.
- No hidden defaults for ambiguous monetary data; every heuristic must be explicit and test-covered.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after using existing Vitest backend framework from `packages/backend/package.json:26-31`
- QA policy: Every task contains agent-executed scenarios; stage 1 and stage 2 both fail fast on blocking ambiguity.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.

Wave 1: canonical contract, completeness validation, page-by-page canonical generation foundation  
Wave 2: normalization/mapping layer, deterministic client2 dataset, dedicated seed entrypoint  
Wave 3: package script wiring, end-to-end seed verification, non-regression checks

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2-5.
- Task 2 blocks Task 3.
- Task 3 blocks Tasks 4-7.
- Task 4 blocks Task 5 and Task 6.
- Task 5 blocks Task 6.
- Task 6 blocks Tasks 7-9.
- Task 7 blocks Task 8.
- Task 8 blocks Task 9.
- Tasks 7-9 all block Final Verification Wave.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → deep / unspecified-high / quick
- Wave 2 → 3 tasks → deep / unspecified-high / quick
- Wave 3 → 3 tasks → quick / unspecified-high / deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Freeze the JUAVIK canonical contract and page manifest

  **What to do**: Create a single source of truth for JUAVIK page ordering and completeness. Define the frozen mapping from `data-avileo/JUAVIK/Cuaderno Tanchy_1.jpg` … `Cuaderno Tanchy_100.jpg` to canonical IDs `cuaderno-tanchy-1` … `cuaderno-tanchy-100`. Lock required canonical fields, required placeholder behavior for blank/unreadable pages, and blocking-vs-nonblocking review flags used by stage 2.
  **Must NOT do**: Do not invent a new schema family, do not read from stage 2 needs backwards, and do not leave any field optional when the seed depends on it.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: must remove every downstream ambiguity before data work starts.
  - Skills: [`avileo`] — why needed: project-specific seed conventions and backend context.
  - Omitted: [`avileo-sync`] — why not needed: sync implementation is unchanged here.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5 | Blocked By: none

  **References**:
  - Pattern: `data-avileo/extractions/JUAVIK/canonical/cuaderno-tanchy-1.json:1-160` — canonical schema shape already includes dates, blocks, lines, entries, items, markers, review flags, and confidence.
  - Pattern: `data-avileo/extractions/JUAVIK/canonical/cuaderno-tanchy-5.json:1-160` — shows inherited dates, carry-over sections, NP markers, and conflicting line handling.
  - Pattern: `packages/backend/src/seed/client-data.ts:25-89` — separates normalized dataset constants from executable seed logic.

  **Acceptance Criteria**:
  - [ ] A manifest/test fixture exists that enumerates all 100 expected JUAVIK pages and canonical IDs in deterministic order.
  - [ ] The canonical contract explicitly defines which review flags are blocking for stage 2.
  - [ ] The canonical contract explicitly defines placeholder behavior for blank/unreadable pages.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Manifest covers all source images
    Tool: Bash
    Steps: Run the backend test command that asserts the JUAVIK manifest count equals the JPG count (100).
    Expected: Test passes and confirms 100 unique JPG inputs and 100 unique expected canonical outputs.
    Evidence: .sisyphus/evidence/task-1-canonical-manifest.txt

  Scenario: Duplicate or missing page IDs are rejected
    Tool: Bash
    Steps: Run the backend validation test suite with a fixture containing a duplicate or missing canonical ID.
    Expected: Test fails with a machine-readable error naming the duplicate/missing page ID.
    Evidence: .sisyphus/evidence/task-1-canonical-manifest-error.txt
  ```

  **Commit**: YES | Message: `test(seed): lock juavik canonical contract` | Files: `data-avileo/**`, `packages/backend/**`

- [x] 2. Complete canonical generation for all 100 JUAVIK pages

  **What to do**: Generate canonical JSON files for the remaining 95 pages and normalize the existing 5 so all 100 files obey the frozen contract. Every source image must produce exactly one canonical file. Use placeholders with explicit status/flags for blank or unreadable pages.
  **Must NOT do**: Do not bypass the manifest, do not leave pages without canonical output, and do not embed stage-2-specific seed assumptions into canonical files.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: repetitive, accuracy-sensitive data normalization across 100 pages.
  - Skills: [] — why needed: task is project-specific data completion more than framework work.
  - Omitted: [`frontend`] — why not needed: no UI work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3 | Blocked By: 1

  **References**:
  - Pattern: `data-avileo/extractions/JUAVIK/canonical/cuaderno-tanchy-1.json:1-160` — example canonical structure for dated single-entry and multi-entry lines.
  - Pattern: `data-avileo/extractions/JUAVIK/canonical/cuaderno-tanchy-5.json:1-160` — example canonical structure for inherited-date blocks and conflicting notes.
  - Source set: `data-avileo/JUAVIK/*.jpg` — 100 image inputs frozen by Task 1 manifest.

  **Acceptance Criteria**:
  - [ ] `data-avileo/extractions/JUAVIK/canonical/` contains exactly 100 canonical JSON files.
  - [ ] Every canonical file validates against the frozen contract.
  - [ ] Placeholder pages are explicit and machine-detectable; no missing files are tolerated.

  **QA Scenarios**:
  ```
  Scenario: Canonical directory is complete
    Tool: Bash
    Steps: Run the backend validation test that compares the manifest to canonical outputs.
    Expected: Test passes with 100/100 mapped canonical files and zero missing pages.
    Evidence: .sisyphus/evidence/task-2-canonical-complete.txt

  Scenario: Invalid canonical schema is blocked
    Tool: Bash
    Steps: Run the schema validation tests with one malformed canonical fixture.
    Expected: Test fails and reports the exact canonical file and missing/invalid field.
    Evidence: .sisyphus/evidence/task-2-canonical-complete-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): complete juavik canonical dataset` | Files: `data-avileo/extractions/JUAVIK/canonical/*.json`, related validation/tests

- [x] 3. Add completeness and ambiguity validation for stage gating

  **What to do**: Implement automated gating that validates canonical schema, 100-file completeness, deterministic ordering, duplicate detection, and blocking review flags. Stage 2 must refuse to run if any blocking issue remains unresolved.
  **Must NOT do**: Do not rely on manual inspection, and do not downgrade blocking ambiguities into warnings.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: bounded validation/harness additions around already-fixed inputs.
  - Skills: [] — why needed: plain backend test/utilities work.
  - Omitted: [`bun-elysia`] — why not needed: no API routing changes.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4,5,6,7 | Blocked By: 2

  **References**:
  - Pattern: `packages/backend/package.json:13-31` — Vitest test execution commands already exist.
  - Pattern: `data-avileo/extractions/JUAVIK/canonical/cuaderno-tanchy-5.json:133-138` — existing review flags are already part of the canonical record.
  - Pattern: `packages/backend/src/seed/index.ts:207-255` — real-data seed mode already expects a stricter data path and returns machine-checkable counts.

  **Acceptance Criteria**:
  - [ ] A single validation entrypoint/test suite can fail stage 2 before any database writes.
  - [ ] Blocking review flags, duplicate page IDs, missing canonical files, and invalid totals all fail with explicit errors.
  - [ ] Deterministic ordering is asserted by test, not assumed.

  **QA Scenarios**:
  ```
  Scenario: Stage gate passes for valid canonical set
    Tool: Bash
    Steps: Run `cd /Users/leobar37/code/avileo/packages/backend && bun run test:run` with the valid JUAVIK canonical dataset.
    Expected: Validation tests pass and stage 2 remains eligible to run.
    Evidence: .sisyphus/evidence/task-3-stage-gate.txt

  Scenario: Blocking review flag prevents seed execution
    Tool: Bash
    Steps: Run the validation/seed precheck against a fixture containing an unresolved blocking review flag.
    Expected: Command exits non-zero before any seed write path runs and names the offending file/line.
    Evidence: .sisyphus/evidence/task-3-stage-gate-error.txt
  ```

  **Commit**: YES | Message: `test(seed): gate client2 on canonical validity` | Files: validation utilities/tests under `packages/backend/**`

- [x] 4. Build explicit normalization maps for customers, products, payments, and carry-over semantics

  **What to do**: Create deterministic mapping rules from canonical notebook content into seed-ready business entities. This includes customer alias resolution, product alias resolution, variant naming strategy, interpretation of `P`/`NP` markers, and explicit modeling of carry-over debt versus current sales.
  **Must NOT do**: Do not use fuzzy matching or undocumented heuristics. Do not collapse ambiguous carry-over into normal sale totals.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the highest-risk semantic transformation layer.
  - Skills: [`avileo`] — why needed: aligns notebook semantics with Avileo entities.
  - Omitted: [`fullstack-backend`] — why not needed: this task defines mapping, not repository architecture.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5,6 | Blocked By: 3

  **References**:
  - Pattern: `data-avileo/extractions/JUAVIK/canonical/cuaderno-tanchy-1.json:42-104` — single-entry sale representation.
  - Pattern: `data-avileo/extractions/JUAVIK/canonical/cuaderno-tanchy-5.json:42-138` — NP marker + inherited/carry-over semantics.
  - Pattern: `packages/backend/src/seed/demo-user.ts:239-365` — expected product, variant inventory, and customer seed shape.

  **Acceptance Criteria**:
  - [ ] Alias/normalization maps exist for all repeated customer and product identities encountered in the canonical dataset.
  - [ ] Payment marker and carry-over rules are encoded as explicit transformations with tests.
  - [ ] Any unresolved identity collision is treated as blocking, not silently merged.

  **QA Scenarios**:
  ```
  Scenario: Known aliases normalize deterministically
    Tool: Bash
    Steps: Run fixture tests covering repeated customer/product spellings from the canonical dataset.
    Expected: Tests pass with stable normalized identities and no fuzzy-match drift.
    Evidence: .sisyphus/evidence/task-4-normalization.txt

  Scenario: Unresolved identity collision is blocked
    Tool: Bash
    Steps: Run fixture tests with two conflicting aliases lacking a declared mapping.
    Expected: Test fails with an explicit collision error instead of auto-merging records.
    Evidence: .sisyphus/evidence/task-4-normalization-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add juavik normalization maps` | Files: `packages/backend/src/seed/**`, tests/fixtures

- [x] 5. Implement deterministic `client2-data.ts` derived only from canonical JSON

  **What to do**: Create `packages/backend/src/seed/client2-data.ts` that loads/derives the JUAVIK seed dataset from canonical JSON only. Export deterministic structures for user, business, products, variants, inventory assumptions, customers, sales, abonos, and any provenance metadata required by tests/logging.
  **Must NOT do**: Do not hardcode ad hoc records outside the transformation layer, and do not read pass-1/pass-2 or JPG files from this module.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: medium-sized transformation module with strict determinism requirements.
  - Skills: [`avileo`] — why needed: align exported structures with existing seed conventions.
  - Omitted: [`fullstack-auth-better`] — why not needed: auth is only seeded, not redesigned.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6,7 | Blocked By: 4

  **References**:
  - Pattern: `packages/backend/src/seed/client-data.ts:1-89` — dataset module structure with exported constants and metadata.
  - Pattern: `packages/backend/src/seed/client1-data.ts:1-104` — simpler per-client dataset shape.
  - Pattern: `packages/backend/src/seed/index.ts:316-480` — real-data seeding expects normalized arrays for products, customers, sales, and abonos.

  **Acceptance Criteria**:
  - [ ] `client2-data.ts` exposes deterministic exports for every entity required by `seed-client2.ts`.
  - [ ] The module can be evaluated without side effects and without touching the database.
  - [ ] Tests prove the exported dataset order and aggregate counts are stable across repeated runs.

  **QA Scenarios**:
  ```
  Scenario: client2 dataset is deterministic
    Tool: Bash
    Steps: Run the backend test suite twice for the client2 dataset module and compare the reported counts/hash fixture.
    Expected: Both runs produce identical ordering and aggregate values.
    Evidence: .sisyphus/evidence/task-5-client2-data.txt

  Scenario: Non-canonical read path is rejected
    Tool: Bash
    Steps: Run a fixture/test that spies on file access and attempts to resolve the dataset with pass-1/pass-2 or JPG reads.
    Expected: Test fails if any non-canonical source path is read.
    Evidence: .sisyphus/evidence/task-5-client2-data-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): derive client2 dataset from canonical json` | Files: `packages/backend/src/seed/client2-data.ts`, tests/fixtures

- [x] 6. Implement dedicated `seed-client2.ts` with JUAVIK credentials and sync backfill

  **What to do**: Create `packages/backend/src/seed/seed-client2.ts` following the dedicated-seed pattern used by `seed-client1.ts` and `demo-user.ts`. It must create or reuse the JUAVIK user/business, create a `RequestContext`, seed products, variants, inventory, customers, sales, abonos, and run sync backfill at the end.
  **Must NOT do**: Do not mutate existing client1/demo behavior, do not skip RequestContext/service patterns, and do not seed rows when stage-gate validation fails.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: critical backend seed entrypoint with database side effects.
  - Skills: [`avileo`, `bun-elysia`] — why needed: seed patterns, RequestContext, services/repositories, and backend conventions.
  - Omitted: [`frontend`] — why not needed: no frontend surface.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7,8 | Blocked By: 4,5

  **References**:
  - Pattern: `packages/backend/src/seed/seed-client1.ts:1-315` — dedicated client seed entrypoint with user/business creation and inventory seeding.
  - Pattern: `packages/backend/src/seed/demo-user.ts:102-237` — user creation, business linking, RequestContext creation, and sync backfill flow.
  - Pattern: `packages/backend/src/seed/demo-user.ts:239-449` — expected helper flow for products, inventory, customers, sales, and abonos.

  **Acceptance Criteria**:
  - [ ] `seed-client2.ts` uses `juavik@gmail.com` and `Prubea@123`.
  - [ ] On a clean dev database, the script creates one JUAVIK business/user and seeds non-zero products, variants, inventory, customers, sales, and abonos.
  - [ ] The script runs sync backfill after successful seed completion.

  **QA Scenarios**:
  ```
  Scenario: Dedicated client2 seed succeeds end to end
    Tool: Bash
    Steps: Run the dedicated client2 seed command on a clean dev database and capture stdout.
    Expected: Command exits 0 and logs successful user/business creation, seeded entity counts, and sync backfill completion.
    Evidence: .sisyphus/evidence/task-6-seed-client2.txt

  Scenario: Seed aborts when canonical stage gate fails
    Tool: Bash
    Steps: Run the client2 seed command with a fixture containing a blocking canonical ambiguity.
    Expected: Command exits non-zero before database writes for transactional entities and prints the blocking source reference.
    Evidence: .sisyphus/evidence/task-6-seed-client2-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add dedicated client2 seed` | Files: `packages/backend/src/seed/seed-client2.ts`, related helpers/tests

- [x] 7. Add backend script wiring for client2 without broad seed refactors

  **What to do**: Add a dedicated backend package script `db:seed:client2` that runs `src/seed/seed-client2.ts`. Keep the integration minimal; do not refactor `src/seed/index.ts` into a new generalized platform. If a smoke helper is needed, keep it strictly local to client2.
  **Must NOT do**: Do not rework the full seed mode system and do not change existing command semantics.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: small, isolated command-surface change.
  - Skills: [] — why needed: minimal package wiring.
  - Omitted: [`fullstack-infrastructure`] — why not needed: no monorepo architecture change.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 5,6

  **References**:
  - Pattern: `packages/backend/package.json:13-31` — existing backend seed command naming conventions.
  - Pattern: `packages/backend/src/seed/seed-client1.ts:307-315` — direct-entry script style for dedicated seeds.

  **Acceptance Criteria**:
  - [ ] `packages/backend/package.json` includes `db:seed:client2`.
  - [ ] Running `cd /Users/leobar37/code/avileo/packages/backend && bun run db:seed:client2` resolves to the dedicated client2 entrypoint.
  - [ ] Existing backend seed scripts remain unchanged and callable.

  **QA Scenarios**:
  ```
  Scenario: New client2 command resolves correctly
    Tool: Bash
    Steps: Run `cd /Users/leobar37/code/avileo/packages/backend && bun run db:seed:client2 --help` or equivalent invocation to confirm command resolution.
    Expected: Bun resolves the script to `src/seed/seed-client2.ts` without affecting other seed commands.
    Evidence: .sisyphus/evidence/task-7-client2-script.txt

  Scenario: Existing seed commands still resolve
    Tool: Bash
    Steps: Run smoke invocations for `bun run db:seed`, `bun run db:seed:client`, and `bun run db:seed:demo`.
    Expected: All existing commands still resolve successfully after adding client2.
    Evidence: .sisyphus/evidence/task-7-client2-script-error.txt
  ```

  **Commit**: YES | Message: `chore(seed): add client2 seed command` | Files: `packages/backend/package.json`

- [x] 8. Add end-to-end verification for seeded data counts, traceability, and non-regression

  **What to do**: Add integration verification that checks seeded counts, business credentials, provenance references, and non-regression for existing seed flows. Ensure every seeded sale/abono can be traced back to canonical file IDs/line references in logs or deterministic mapping artifacts.
  **Must NOT do**: Do not stop at exit-code-only verification and do not rely on manual DB inspection.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: cross-cutting validation across canonical data, seed behavior, and existing commands.
  - Skills: [`avileo`] — why needed: verification must reflect project business entities correctly.
  - Omitted: [`e2e-testing`] — why not needed: this is backend/database verification, not browser E2E.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 9 | Blocked By: 6,7

  **References**:
  - Pattern: `packages/backend/src/seed/index.ts:239-310` — seed return counts expected for machine-checkable verification.
  - Pattern: `packages/backend/src/seed/demo-user.ts:195-205` — backfill completion and credential logging pattern.
  - Pattern: `packages/backend/package.json:19-23` — seed/backfill command surface.

  **Acceptance Criteria**:
  - [ ] Tests/assertions verify JUAVIK seed produces non-zero counts for products, variants, inventory, customers, sales, and abonos.
  - [ ] Verification includes traceability from seeded transactional rows back to canonical source references.
  - [ ] Existing seed commands retain passing smoke verification after client2 integration.

  **QA Scenarios**:
  ```
  Scenario: Seeded JUAVIK dataset matches expected aggregates
    Tool: Bash
    Steps: Run the backend integration verification after seeding client2 on a clean dev database.
    Expected: Tests/logs confirm the JUAVIK business, credentials, entity counts, and provenance coverage all match expected fixtures.
    Evidence: .sisyphus/evidence/task-8-seed-verification.txt

  Scenario: Missing provenance is rejected
    Tool: Bash
    Steps: Run the integration verification against a fixture where seeded sales/abonos omit canonical source references.
    Expected: Verification fails with a clear missing-provenance error.
    Evidence: .sisyphus/evidence/task-8-seed-verification-error.txt
  ```

  **Commit**: YES | Message: `test(seed): verify client2 seed end to end` | Files: backend verification tests/fixtures

- [x] 9. Harden reset/re-run behavior for local developer execution

  **What to do**: Decide and implement the local execution contract for client2 seeding. Default is clean-reset execution: client2 is expected to run on a clean dev database, while repeat runs must either be safely idempotent for user/business bootstrap or fail with a clear message before duplicating transactional data.
  **Must NOT do**: Do not allow silent duplication on rerun and do not leave rerun semantics undefined.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: rerun semantics affect data safety and developer trust.
  - Skills: [`avileo`] — why needed: must align with existing seed/reset habits in this repo.
  - Omitted: [`avileo-sync`] — why not needed: rerun behavior concerns seeding, not sync engine changes.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 8

  **References**:
  - Pattern: `packages/backend/src/seed/demo-user.ts:105-187` — existing dedicated seed scripts reuse existing user/business when present.
  - Pattern: `packages/backend/package.json:19-24` — existing database seed/reset command surface.
  - Pattern: `packages/backend/src/seed/index.ts:163-171` — existing code already distinguishes force/reset behaviors.

  **Acceptance Criteria**:
  - [ ] The client2 seed’s rerun policy is explicit, tested, and documented in code/tests.
  - [ ] Repeat execution cannot silently duplicate business/user bootstrap or transactional records.
  - [ ] Failure mode, if rerun is disallowed past a point, is explicit and machine-checkable.

  **QA Scenarios**:
  ```
  Scenario: Clean-reset execution works predictably
    Tool: Bash
    Steps: Reset the dev database using the existing local workflow, then run `bun run db:seed:client2`.
    Expected: Client2 seed succeeds with deterministic counts on a clean database.
    Evidence: .sisyphus/evidence/task-9-rerun-policy.txt

  Scenario: Unsafe rerun is blocked or deduplicated explicitly
    Tool: Bash
    Steps: Run `bun run db:seed:client2` twice without cleanup.
    Expected: Second run either exits with a clear duplication-prevention error or proves tested idempotent behavior without duplicate transactional rows.
    Evidence: .sisyphus/evidence/task-9-rerun-policy-error.txt
  ```

  **Commit**: YES | Message: `fix(seed): harden client2 rerun policy` | Files: `packages/backend/src/seed/seed-client2.ts`, tests/fixtures

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: canonical contract + manifest + failing validation fixtures
- Commit 2: complete canonical JSON set + schema/completeness validation
- Commit 3: normalization maps + deterministic `client2-data.ts`
- Commit 4: dedicated `seed-client2.ts` + backend script wiring
- Commit 5: end-to-end verification + rerun hardening + non-regression checks

## Success Criteria
- All 100 JUAVIK images have canonical JSON outputs with deterministic IDs and validated structure.
- Stage 2 reads canonical JSON only and refuses to seed unresolved blocking ambiguity.
- `bun run db:seed:client2` succeeds on a clean dev database using `juavik@gmail.com` / `Prubea@123`.
- Seeded JUAVIK data includes products, variants, inventory, customers, sales, and abonos with machine-checkable counts.
- Existing seed commands remain operational after adding client2.
