# Refactor Drizzle Sync Adoption - Task Index

## Summary

- Mode: Structured
- Slug: `refactor-drizzle-sync-adoption`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-fix-sync-config.md` |
| `FR-002` | `tasks/01-fix-sync-config.md` |
| `FR-003` | `tasks/02-refactor-payment-service.md`, `tasks/03-refactor-sale-service.md`, `tasks/04-refactor-purchase-distribucion-services.md` |
| `FR-004` | `tasks/02-refactor-payment-service.md` |
| `FR-005` | `tasks/02-refactor-payment-service.md`, `tasks/03-refactor-sale-service.md`, `tasks/04-refactor-purchase-distribucion-services.md` |
| `FR-006` | `tasks/05-validation-testing.md` |
| `NFR-001` | `tasks/05-validation-testing.md` |
| `NFR-002` | `tasks/02-refactor-payment-service.md`, `tasks/03-refactor-sale-service.md`, `tasks/04-refactor-purchase-distribucion-services.md` |
| `NFR-003` | `tasks/01-fix-sync-config.md`, `tasks/05-validation-testing.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-fix-sync-config.md` | Correct SYNC_ENTITIES, priorities, and parent/child relationships | none |
| `T-002` | `tasks/02-refactor-payment-service.md` | Replace raw SQL in payment-service.ts with Drizzle ORM | `T-001` |
| `T-003` | `tasks/03-refactor-sale-service.md` | Replace raw SQL in sale-service.ts with Drizzle ORM | `T-001` |
| `T-004` | `tasks/04-refactor-purchase-distribucion-services.md` | Replace raw SQL in purchase and distribucion services | `T-001` |
| `T-005` | `tasks/05-validation-testing.md` | Run type checks, E2E tests, and verify sync ordering | `T-002`, `T-003`, `T-004` |

## Suggested Execution Order

1. `T-001` - Must be first because sync config fixes affect FK ordering for all subsequent tasks
2. `T-002` - Payment service has the most complex SQL (CTE queries) and is a good pilot for the pattern
3. `T-003` - Sale service has many `pg.query()` calls but already uses generated services; refactor the remaining raw queries
4. `T-004` - Purchase and distribucion services have similar patterns; can be done in parallel with T-003 if desired
5. `T-005` - Final validation after all service refactors are complete

## Notes

- `T-002`, `T-003`, and `T-004` are independent of each other (all depend only on `T-001`) and can be executed in parallel by different developers
- If any task reveals additional `pg.query()` usage in other files, add them as follow-up tasks under the same plan
