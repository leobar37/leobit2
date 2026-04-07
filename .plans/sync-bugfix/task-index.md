# Task Index

| ID | Task | Priority | Blocking |
|----|------|---------|----------|
| T-001 | Run baseline tests | P0 | — |
| T-002 | Remove PullSyncWrapper from _protected.tsx | P0 | — |
| T-003 | Delete use-pull-sync.ts and pull-sync-wrapper.tsx | P0 | T-002 |
| T-004 | Fix cursor advancement bug | P0 | T-001 |
| T-005 | Fix DELETE missing businessId | P0 | T-001 |
| T-006 | Add AbortController to PullService | P1 | T-001 |
| T-007 | Add AbortController to SyncService sendBatch | P1 | T-001 |
| T-008 | Make backoff cancellable | P1 | T-001 |
| T-009 | Debounce forceSync on reconnect | P1 | T-001 |
| T-010 | Add abort to staged pull | P2 | T-001 |
| T-011 | Add MSW sync handlers to e2e mocks | P1 | T-001 |
| T-012 | Test CustomerSyncHandler | P1 | T-001 |
| T-013 | Test ProductSyncHandler | P2 | T-012 |
| T-014 | Test ChangeApplier DELETE with businessId | P1 | T-005 |
| T-015 | Verify all tests pass | P0 | T-002..T-014 |

**Execution order**: T-001 first (baseline). Then T-002, T-004, T-005 in any order (critical bugs). Then T-003 after T-002. Then T-006..T-010 in any order. Then T-011, T-012, T-013, T-014 in any order. T-015 last (verification).

**Dependencies**:
- T-003 blocked by T-002
- T-014 blocked by T-005
- T-013 blocked by T-012
- T-015 blocked by all previous
