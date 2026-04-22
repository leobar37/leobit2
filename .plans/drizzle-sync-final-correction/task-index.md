# Task Index: Drizzle Sync Final Correction

## Summary

- Mode: Structured
- Slug: `drizzle-sync-final-correction`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-008` | `tasks/T-000-post-migration-stabilization.md` |
| `FR-001` | `tasks/T-001-canonical-entity-identity.md` |
| `FR-002` | `tasks/T-002-schema-driven-applier-generation.md` |
| `FR-003` | `tasks/T-003-runtime-apply-integration.md` |
| `FR-004` | `tasks/T-004-decouple-generic-library-from-shared.md` |
| `FR-005` | `tasks/T-005-persisted-entitytype-migration.md` |
| `FR-006` | `tasks/T-006-introspection-and-validation-hardening.md` |
| `FR-007` | `tasks/T-007-consumer-alignment.md` |
| `FR-009` | `tasks/T-009-worker-and-debug-follow-up.md` |
| `NFR-001` | `tasks/T-005-persisted-entitytype-migration.md`, `tasks/T-007-consumer-alignment.md` |
| `NFR-002` | `tasks/T-004-decouple-generic-library-from-shared.md` |
| `NFR-003` | `tasks/T-002-schema-driven-applier-generation.md` |
| `NFR-004` | `tasks/T-008-validation-and-regression-coverage.md` |
| `NFR-005` | `tasks/T-008-validation-and-regression-coverage.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-000` | `tasks/T-000-post-migration-stabilization.md` | Stabilize app build/runtime baseline after framework migration | none |
| `T-001` | `tasks/T-001-canonical-entity-identity.md` | Normalize entity identity to canonical snake_case runtime naming | none |
| `T-002` | `tasks/T-002-schema-driven-applier-generation.md` | Fix generation so applier artifacts are schema-driven and runtime-ready | `T-000`, `T-001` |
| `T-003` | `tasks/T-003-runtime-apply-integration.md` | Wire client apply path to generated applier config | `T-000`, `T-002` |
| `T-004` | `tasks/T-004-decouple-generic-library-from-shared.md` | Remove generic runtime coupling to `@avileo/shared` | `T-001`, `T-003` |
| `T-005` | `tasks/T-005-persisted-entitytype-migration.md` | Migrate persisted sync metadata entity names safely | `T-001` |
| `T-006` | `tasks/T-006-introspection-and-validation-hardening.md` | Remove domain inference heuristics and enforce graph correctness | `T-001` |
| `T-007` | `tasks/T-007-consumer-alignment.md` | Align backend/app consumers with canonical identity and generated contracts | `T-003`, `T-004`, `T-005`, `T-006` |
| `T-008` | `tasks/T-008-validation-and-regression-coverage.md` | Validate end-to-end behavior and add anti-regression checks | `T-000`, `T-002`, `T-003`, `T-004`, `T-005`, `T-006`, `T-007`, `T-009` |
| `T-009` | `tasks/T-009-worker-and-debug-follow-up.md` | Resolve worker/debug migration gaps or formalize non-blocking boundary | `T-000` |

## Suggested Execution Order

1. `T-000` — stabilize post-migration build/runtime baseline
2. `T-001` — canonical identity baseline
3. `T-002` — generation correctness for runtime artifacts
4. `T-003` — client runtime apply integration
5. `T-004` + `T-005` + `T-006` + `T-009` — decoupling, migration, introspection hardening, and follow-up gaps
6. `T-007` — consumer alignment after foundation settles
7. `T-008` — full validation and guardrails

## Notes

- `T-004`, `T-005`, `T-006`, and `T-009` can proceed in parallel after `T-003` starts stabilizing.
- `T-008` is mandatory before considering the correction complete.
- This initiative intentionally avoids introducing a separate adapter package.
