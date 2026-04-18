# Standardize Numeric Handling - Task Index

## Summary

- Mode: Structured
- Slug: `standardize-numeric-handling`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-decimal-helpers.md` |
| `FR-002` | `tasks/02-fix-sale-handler.md` |
| `FR-003` | `tasks/03-fix-distribucion-types.md` |
| `FR-004` | `tasks/03-fix-distribucion-types.md` |
| `FR-005` | `tasks/04-precision-tests.md` |
| `NFR-001` | `tasks/01-decimal-helpers.md`, `tasks/04-precision-tests.md` |
| `NFR-002` | `tasks/04-precision-tests.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-decimal-helpers.md` | Create string-based decimal arithmetic utility | none |
| `T-002` | `tasks/02-fix-sale-handler.md` | Remove Number() casts from SaleSyncHandler | `T-001` |
| `T-003` | `tasks/03-fix-distribucion-types.md` | Align DistribucionService interface to use string | none |
| `T-004` | `tasks/04-precision-tests.md` | Add precision regression tests | `T-001`, `T-002`, `T-003` |

## Suggested Execution Order

1. `T-001` — Foundation: helpers needed by T-002 and T-004
2. `T-003` — Can run in parallel with T-001 (no dependency on helpers)
3. `T-002` — Depends on T-001 helpers
4. `T-004` — Validates all changes, depends on T-001 through T-003

## Notes

- T-001 and T-003 are independent and can be executed in parallel
- T-003 changes an exported interface (`CreateDistribucionItemInput`); check for other callers beyond the sync handler
- T-002 is the highest-risk task because SaleSyncHandler has the most complex numeric logic (balanceDue calculation, payment check)
