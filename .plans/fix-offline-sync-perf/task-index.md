# Fix Offline Sync & Performance Task Index

## Summary

- Mode: Structured
- Slug: `fix-offline-sync-perf`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` Offline push guard | `T-002` |
| `FR-002` TanStack invalidation on pull | `T-001` |
| `FR-003` Sales pagination | `T-003` |
| `FR-004` DLQ recovery UI | `T-004` |
| `FR-005` Stale pull auto-recovery | `T-002`, `T-005` |
| `NFR-001` Backward compatibility | All tasks (additive only) |
| `NFR-002` Pagination performance | `T-003` |
| `NFR-003` Zero offline noise | `T-002` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/T-001-wire-tanstack-invalidation.md` | Wire `pullService.setOnChangesApplied()` to `queryClient.invalidateQueries()` | none |
| `T-002` | `tasks/T-002-add-offline-guard-to-process-pending.md` | Add `navigator.onLine` guard to `processPending()` and reset backoff on reconnect | none |
| `T-003` | `tasks/T-003-add-pagination-to-sales-list.md` | Replace unbounded `findByBusiness()` with paginated `findPageByBusiness()` in all hooks | none |
| `T-004` | `tasks/T-004-add-dlq-recovery-ui.md` | Add DLQ section to sync debug drawer with retry/discard per operation | `T-001` |
| `T-005` | `tasks/T-005-add-stale-pull-auto-recovery.md` | Auto-recover from stale pull on online event; retry DLQ ops on reconnect | `T-002` |

## Suggested Execution Order

1. `T-002` — Foundation: offline guard and backoff reset. Independent, no deps.
2. `T-001` — TanStack invalidation: also independent, can run in parallel with T-002.
3. `T-003` — Pagination: independent of T-001 and T-002. Can run in parallel.
4. `T-005` — Stale pull auto-recovery: depends on T-002 (needs `resetBackoff()` method).
5. `T-004` — DLQ UI: depends on T-001 (needs invalidation wired for retry result).

**T-001, T-002, T-003 can all run in parallel** — no dependencies between them.

## Notes

- All tasks are frontend-only changes in `packages/app`
- No backend changes required
- No database migrations
- T-001 and T-002 are the most impactful: together they fix the core offline freeze issue
- T-003 (pagination) has the highest risk of breaking existing UI — test thoroughly
