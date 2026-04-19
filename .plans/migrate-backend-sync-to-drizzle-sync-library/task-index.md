# Migrate Backend Sync to drizzle-sync Library — Task Index

## Summary

- Mode: Structured
- Slug: `migrate-backend-sync-to-drizzle-sync-library`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`
- Plan Created: 2026-04-18
- Basis: Audit of `packages/drizzle-sync` integration (2026-04-18)

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `T-003` (SyncEngine config), `T-005` (SyncService migration) |
| `FR-002` | `T-005` (HandlerRegistry and handler migration) |
| `FR-003` | `T-002` (BaseSyncHandler PostgreSQL error extraction) |
| `FR-004` | `T-003` (SyncPipeline decision and implementation) |
| `FR-005` | `T-004` (repository interface alignment) |
| `FR-006` | `T-005` (ConflictResolverRegistry registration) |
| `FR-007` | `T-002` (logger integration in BaseSyncHandler) |
| `FR-008` | `T-009` (duplicate file removal) |
| `NFR-001` | `T-007` (full test suite validation) |
| `NFR-003` | `T-006` (library unit tests) |
| `NFR-004` | `T-007` (performance baseline check) |
| `NFR-005` | `T-007` (validation gate before T-009) |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-audit-library-server-submodule.md` | Behavioral audit of library server/ vs. backend framework; resolve OQ-001 and OQ-002 | none |
| `T-002` | `tasks/02-reconcile-base-handler.md` | Add PostgreSQL error extraction and ISyncLogger injection to library's BaseSyncHandler | `T-001` |
| `T-003` | `tasks/03-reconcile-sync-engine-architecture.md` | Resolve SyncPipeline/middleware architecture and DbTransaction adapter strategy | `T-001`, `T-002` |
| `T-004` | `tasks/04-migrate-repositories-to-library-interfaces.md` | Refactor backend repositories to implement library interfaces | `T-003` |
| `T-005` | `tasks/05-migrate-sync-service-and-handlers.md` | Migrate SyncService, HandlerRegistry, and concrete handlers to library imports | `T-003`, `T-004` |
| `T-006` | `tasks/06-add-library-unit-tests.md` | Add unit test suite to the library package | `T-002` (can overlap with T-003) |
| `T-007` | `tasks/07-validate-full-integration.md` | Full validation: typecheck, unit tests, E2E, performance | `T-005`, `T-006` |
| `T-008` | `tasks/08-documentation-and-agents.md` | README, CHANGELOG, AGENTS.md updates | `T-005`, `T-007` |
| `T-009` | `tasks/09-remove-duplicate-framework-files.md` | Delete duplicate framework files from backend (post-validation) | `T-007` |

## Suggested Execution Order

1. **`T-001`** — Foundation. Must complete before T-002 and T-003. No code changes, only written audit findings.
2. **`T-002`** and **`T-006`** (can run in parallel after T-001) — T-002 modifies the library; T-006 adds tests to current stable code. These don't conflict.
3. **`T-003`** — Depends on T-001 (OQ resolutions) and T-002 (BaseSyncHandler changes). Most complex task; requires T-001 findings to proceed.
4. **`T-004`** — Depends on T-003 (final repository interfaces). Repository refactoring is straightforward after interfaces are stable.
5. **`T-005`** — Depends on T-003 (SyncEngine config) and T-004 (repositories). This is the main migration task.
6. **`T-007`** — Depends on T-005 and T-006. Validation gate.
7. **`T-008`** — Depends on T-005 and T-007. Documentation after API is final.
8. **`T-009`** — Depends on T-007. Only runs if validation passes completely.

## Rhythm

- **Foundation (T-001)**: 1 day — audit report, no code
- **Reconciliation (T-002, T-003)**: 2-3 days — library modifications, architectural decisions
- **Repository Migration (T-004)**: 1 day — straightforward refactoring
- **Service Migration (T-005)**: 1-2 days — main migration task
- **Testing (T-006)**: 1-2 days — can overlap with T-002/T-003
- **Validation (T-007)**: 1 day — test run, E2E, smoke test
- **Documentation (T-008)**: 0.5 day — README and AGENTS.md
- **Cleanup (T-009)**: 0.5 day — file deletion, final typecheck

**Estimated total: 7-10 days** (can be compressed with parallel work)

## Notes

- T-002 and T-006 can run in parallel after T-001 — both operate on the library but on different concerns (BaseSyncHandler vs. tests).
- T-007 is a hard gate: T-009 (file deletion) must not proceed if validation fails.
- The "rhythm" (execution pace) should be measured against the validation results in T-007. If performance regresses > 5%, pause and investigate before continuing.
- Lessons learned from this migration (document in `context.md` or a new `lessons.md`):
  1. Library extraction without integration testing is incomplete — the server/ submodule existed for months without being used
  2. A "completed" task status in a plan does not mean the migration is done — verify actual imports, not just file existence
  3. Generic library types (TTransaction, TRequestContext) require concrete Drizzle/adapter layers in the consuming application
