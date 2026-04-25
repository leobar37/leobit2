# Task Index: Migrate to Generated Services

## Summary

- Mode: Structured
- Slug: `migrate-to-generated-services`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-fix-drizzle-sync-types.md` |
| `FR-002` | `tasks/01-fix-drizzle-sync-types.md` |
| `FR-003` | `tasks/01-fix-drizzle-sync-types.md`, `tasks/03-extend-core-services.md` |
| `FR-004` | `tasks/03-extend-core-services.md`, `tasks/04-extend-remaining-services.md` |
| `FR-005` | `tasks/03-extend-core-services.md`, `tasks/04-extend-remaining-services.md` |
| `FR-006` | `tasks/05-update-engine-and-cleanup.md` |
| `FR-007` | `tasks/05-update-engine-and-cleanup.md` |
| `FR-008` | `tasks/06-migrate-hooks-to-useengineservice.md` |
| `FR-009` | `tasks/07-update-non-hook-consumers.md` |
| `FR-010` | `tasks/08-typescript-validation.md` |
| `NFR-001` | `tasks/08-typescript-validation.md` |
| `NFR-002` | `tasks/06-migrate-hooks-to-useengineservice.md`, `tasks/08-typescript-validation.md` |
| `NFR-003` | `tasks/02-update-drizzle-sync-tests.md`, `tasks/08-typescript-validation.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-fix-drizzle-sync-types.md` | Fix drizzle-sync factory type contract to pass SyncClientEngine instead of SyncClientEngineContext | none |
| `T-002` | `tasks/02-update-drizzle-sync-tests.md` | Update drizzle-sync unit tests for new factory signature | `T-001` |
| `T-003` | `tasks/03-extend-core-services.md` | Extend CustomerService, SaleService, and PaymentService from generated bases | `T-001`, `T-002` |
| `T-004` | `tasks/04-extend-remaining-services.md` | Extend all remaining manual services (purchases, products, tags, groups, etc.) | `T-001`, `T-003` |
| `T-005` | `tasks/05-update-engine-and-cleanup.md` | Update createAvileoSyncEngine entities array and delete registerAppServices | `T-003`, `T-004` |
| `T-006` | `tasks/06-migrate-hooks-to-useengineservice.md` | Replace all engine.use() calls in hooks with useEngineService<T>() | `T-005` |
| `T-007` | `tasks/07-update-non-hook-consumers.md` | Update components and other files that access services directly | `T-006` |
| `T-008` | `tasks/08-typescript-validation.md` | Run typecheck and tests, fix all errors, perform smoke tests | `T-005`, `T-006`, `T-007` |

## Suggested Execution Order

1. `T-001` — Foundation: fix the type contract first, everything else depends on it
2. `T-002` — Validate the type change doesn't break drizzle-sync's own tests
3. `T-003` — Start with the three most critical services (customers, sales, payments)
4. `T-004` — Complete all remaining services
5. `T-005` — Wire extended services into the engine and remove redundancy
6. `T-006` — Bulk migration of hooks (can be done in batches per T-006 instructions)
7. `T-007` — Clean up any remaining direct service instantiations
8. `T-008` — Final validation and error fixing

## Notes

- `T-003` and `T-004` can be parallelized by different developers once `T-001` is done
- `T-006` is the largest task by line count (~111 replacements across 21 files)
- `T-008` may reveal cascading type errors from earlier tasks—budget time for fixes
- `SaleService` (in T-003) is the highest-risk service due to atomic multi-entity transactions
