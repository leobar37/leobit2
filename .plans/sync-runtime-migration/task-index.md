# Sync Runtime Migration to Framework Task Index

## Summary

- Mode: Structured
- Slug: `sync-runtime-migration`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-extract-infrastructure-services.md`, `tasks/03-complete-push-service.md` |
| `FR-002` | `tasks/01-extract-infrastructure-services.md` |
| `FR-003` | `tasks/01-extract-infrastructure-services.md` |
| `FR-004` | `tasks/02-migrate-operation-lifecycle.md`, `tasks/03-complete-push-service.md` |
| `FR-005` | `tasks/04-migrate-batch-processor.md` |
| `FR-006` | `tasks/03-complete-push-service.md`, `tasks/06-unit-tests-framework.md` |
| `FR-007` | `tasks/01-extract-infrastructure-services.md`, `tasks/04-migrate-batch-processor.md` |
| `FR-008` | `tasks/04-migrate-batch-processor.md` |
| `FR-009` | `tasks/02-migrate-operation-lifecycle.md` |
| `FR-010` | `tasks/05-deprecate-legacy-services.md` |
| `NFR-001` | `tasks/05-deprecate-legacy-services.md` |
| `NFR-002` | All task files |
| `NFR-003` | All task files |
| `NFR-004` | `tasks/05-deprecate-legacy-services.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-extract-infrastructure-services.md` | Move SyncAutoRunner, SyncMutex, SyncEntityStatusUpdater to framework | none |
| `T-002` | `tasks/02-migrate-operation-lifecycle.md` | Move SyncOperationLifecycleService with configurable self-heal | `T-001` |
| `T-003` | `tasks/03-complete-push-service.md` | Replace all PushSyncService stubs with real implementations | `T-001`, `T-002` |
| `T-004` | `tasks/04-migrate-batch-processor.md` | Move SyncBatchProcessor with configurable priorities | `T-001`, `T-002` |
| `T-005` | `tasks/05-deprecate-legacy-services.md` | Delete legacy app sync services and consolidate to engine-only | `T-001`, `T-002`, `T-003`, `T-004` |
| `T-006` | `tasks/06-unit-tests-framework.md` | Write unit tests for all migrated framework sync services | `T-001`, `T-002`, `T-003`, `T-004` |

## Suggested Execution Order

1. `T-001` - Foundation: move generic infrastructure first. Low risk, validates migration pattern.
2. `T-002` - State machine: move operation lifecycle with self-heal config. Builds on T-001.
3. `T-003` - Core: complete PushSyncService. Uses T-001 and T-002 services.
4. `T-004` - Batch: move batch processor. Uses T-001 and T-002, integrates with T-003.
5. `T-006` - Tests: write comprehensive unit tests for all framework services. Validates T-001 through T-004.
6. `T-005` - Cleanup: delete legacy app services. Only after all framework services are tested and verified.

## Parallelization Notes

- `T-001` and `T-002` can be done in parallel if two agents are available, but T-002 depends on T-001 services.
- `T-003` and `T-004` can be done in parallel after T-001 and T-002 are complete.
- `T-006` should ideally start as soon as each service is implemented (test as you go) but the comprehensive suite runs after T-003/T-004.
- `T-005` must be last.

## Notes

- Each task should be a single delegable unit. An agent can pick up a task file and execute it independently.
- Before starting T-005, run the app in dev mode with only engine mode for a full smoke test session.
- Keep a backup branch until T-005 is complete.
