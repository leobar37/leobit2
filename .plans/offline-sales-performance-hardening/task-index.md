# Offline Sales Performance Hardening Task Index

## Summary

- Mode: Structured
- Slug: `offline-sales-performance-hardening`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-baseline-and-instrumentation.md`, `tasks/03-pglite-worker-and-runtime.md`, `tasks/06-refresh-resilience-and-recovery.md` |
| `FR-002` | `tasks/02-create-draft-hot-path.md` |
| `FR-003` | `tasks/04-editor-mutation-cache-strategy.md` |
| `FR-004` | `tasks/05-outbox-fast-path-and-durability.md`, `tasks/06-refresh-resilience-and-recovery.md` |
| `FR-005` | `tasks/07-sales-list-search-optimization.md` |
| `FR-006` | `tasks/06-refresh-resilience-and-recovery.md` |
| `NFR-001` | `tasks/01-baseline-and-instrumentation.md`, `tasks/08-performance-validation-and-rollout.md` |
| `NFR-002` | `tasks/03-pglite-worker-and-runtime.md`, `tasks/08-performance-validation-and-rollout.md` |
| `NFR-003` | `tasks/05-outbox-fast-path-and-durability.md`, `tasks/08-performance-validation-and-rollout.md` |
| `NFR-004` | `tasks/01-baseline-and-instrumentation.md`, `tasks/08-performance-validation-and-rollout.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-baseline-and-instrumentation.md` | Establish performance baseline and durable instrumentation for sales hot paths | none |
| `T-002` | `tasks/02-create-draft-hot-path.md` | Remove redundant operations from create-draft critical path | `T-001` |
| `T-003` | `tasks/03-pglite-worker-and-runtime.md` | Move PGlite execution off main thread and optimize runtime/storage strategy | `T-001` |
| `T-004` | `tasks/04-editor-mutation-cache-strategy.md` | Replace broad invalidation with narrow cache/state updates in sales editor | `T-002` |
| `T-005` | `tasks/05-outbox-fast-path-and-durability.md` | Introduce fast enqueue path while preserving outbox durability guarantees | `T-002` |
| `T-006` | `tasks/06-refresh-resilience-and-recovery.md` | Harden recovery behavior across refresh/reopen and sync restarts | `T-003`, `T-005` |
| `T-007` | `tasks/07-sales-list-search-optimization.md` | Improve list/search scalability with query and index strategy updates | `T-001` |
| `T-008` | `tasks/08-performance-validation-and-rollout.md` | Validate improvements and define safe rollout strategy | `T-004`, `T-006`, `T-007` |

## Suggested Execution Order

1. `T-001` - Baseline first to avoid blind optimization and enable before/after comparison.
2. `T-002` - Highest immediate UX impact on create sale critical path.
3. `T-003` and `T-007` - Can proceed in parallel after baseline because one targets runtime threading and the other query scalability.
4. `T-004` and `T-005` - Build on hot-path changes to reduce editor round-trips and optimize durable enqueue behavior.
5. `T-006` - Validate and harden resilience after runtime and outbox changes.
6. `T-008` - Final verification gate and rollout criteria.

## Notes

- `T-003` and `T-007` are parallelizable with low overlap.
- `T-005` must preserve `sync_group_id` and idempotency semantics.
- Background Sync APIs are optional and should not gate completion of core tasks.
