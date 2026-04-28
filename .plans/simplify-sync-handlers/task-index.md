# Simplify Sync Handlers Task Index

## Summary

- Mode: Structured
- Slug: `simplify-sync-handlers`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/03-migrate-sales-handler.md` |
| `FR-002` | `tasks/03-migrate-sales-handler.md` |
| `FR-003` | `tasks/03-migrate-sales-handler.md` |
| `FR-004` | `tasks/04-migrate-distribucion-handler.md` |
| `FR-005` | `tasks/05-migrate-purchase-handler.md` |
| `FR-006` | `tasks/06-move-abono-creation.md` |
| `FR-007` | `tasks/02-remove-snapshots.md` |
| `FR-008` | `tasks/07-cleanup-base-classes.md` |
| `FR-009` | `tasks/07-cleanup-base-classes.md` |
| `FR-010` | `tasks/07-cleanup-base-classes.md` |
| `FR-011` | `tasks/07-cleanup-base-classes.md` |
| `FR-012` | `tasks/05-migrate-purchase-handler.md` |
| `FR-013` | `tasks/07-cleanup-base-classes.md` |
| `FR-014` | `tasks/05-migrate-purchase-handler.md` |
| `FR-015` | `tasks/06-move-abono-creation.md` |
| `FR-016` | `tasks/03-migrate-sales-handler.md` |
| `FR-017` | `tasks/03-migrate-sales-handler.md`, `tasks/04-migrate-distribucion-handler.md`, `tasks/05-migrate-purchase-handler.md` |
| `FR-018` | `tasks/08-update-tests.md` |
| `FR-019` | `context.md`, `tasks/03-migrate-sales-handler.md`, `tasks/06-move-abono-creation.md`, `tasks/09-verify-sync-e2e.md` |
| `FR-020` | `tasks/03-migrate-sales-handler.md`, `tasks/06-move-abono-creation.md`, `tasks/09-verify-sync-e2e.md` |
| `FR-021` | `tasks/03-migrate-sales-handler.md`, `tasks/06-move-abono-creation.md`, `tasks/09-verify-sync-e2e.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-audit-usage.md` | Audit all consumers of custom handlers and transitions | none |
| `T-002` | `tasks/02-remove-snapshots.md` | Remove snapshot fields from schema and all references | `T-001` |
| `T-003` | `tasks/03-migrate-sales-handler.md` | Replace SaleSyncHandler with SyncHandlerBuilder | `T-002` |
| `T-004` | `tasks/04-migrate-distribucion-handler.md` | Replace DistribucionSyncHandler with SyncHandlerBuilder | `T-001` |
| `T-005` | `tasks/05-migrate-purchase-handler.md` | Replace PurchaseSyncHandler with SyncHandlerBuilder + inline inventory hook | `T-001` |
| `T-006` | `tasks/06-move-abono-creation.md` | Move initial payment creation from backend handler to frontend service | `T-003` |
| `T-007` | `tasks/07-cleanup-base-classes.md` | Delete StatefulSyncHandler, BaseSyncHandler, and transition infrastructure | `T-003`, `T-004`, `T-005` |
| `T-008` | `tasks/08-update-tests.md` | Update or remove tests for deleted handlers and transitions | `T-007` |
| `T-009` | `tasks/09-verify-sync-e2e.md` | End-to-end verification of sync flows for all 3 affected entities | `T-008` |

## Suggested Execution Order

1. `T-001` - Audit first to confirm all consumers and catch hidden dependencies
2. `T-002` - Remove snapshots (low risk, independent of handler migration)
3. `T-003` - Migrate sales handler (most complex, establishes the pattern)
4. `T-004` - Migrate distribucion handler (simplest, follows pattern)
5. `T-005` - Migrate purchase handler (inventory hook requires care)
6. `T-006` - Move abono creation to frontend (depends on sales handler being generic)
7. `T-007` - Clean up dead code (base classes, transitions) after all handlers migrated
8. `T-008` - Update tests after all code changes
9. `T-009` - E2E verification of complete sync flows

## Notes

- T-003, T-004, and T-005 can be parallelized once T-001 and T-002 are complete, but T-003 should be done first to establish the pattern
- T-006 (abono creation) is the main cuaderno proof point: the payment must exist locally before sync
- T-007 must be last among the code changes because it removes classes that T-003/T-004/T-005 still reference during migration
- T-009 should run against a running dev server with a test database and include an extended offline-session check
