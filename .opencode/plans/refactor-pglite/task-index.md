# Task Index: Refactor PGlite Architecture

## Task Overview

| ID | Task | Priority | Est. Effort | Dependencies | Status |
|----|------|----------|-------------|----------------|--------|
| T-001 | Create SqlExecutor abstraction | High | 2h | None | pending |
| T-002 | Create config/defaults.ts | High | 30m | None | pending |
| T-003 | Refactor change applier to domain/change/ | High | 4h | T-001, T-002 | pending |
| T-004 | Refactor queue to domain/queue/ | High | 4h | T-001 | pending |
| T-005 | Refactor push service to domain/push/ | High | 5h | T-001, T-004 | pending |
| T-006 | Refactor pull service to domain/pull/ | High | 4h | T-001, T-003 | pending |
| T-007 | Update SyncClientEngine | High | 3h | T-005, T-006 | pending |
| T-008 | Create new public API index.ts | High | 2h | T-003, T-004, T-005, T-006 | pending |
| T-009 | Delete old files | Medium | 30m | T-007, T-008 | pending |
| T-010 | Verify integration tests pass | High | 2h | T-009 | pending |

## Execution Order

```
Phase 1: Foundation
├── T-001: SqlExecutor
└── T-002: Config defaults

Phase 2: Domain Layer (can parallelize after Phase 1)
├── T-003: Change applier
├── T-004: Queue (depends on T-001 only)
└── T-005: Push service (depends on T-004)

Phase 3: Pull Layer
└── T-006: Pull service (depends on T-003)

Phase 4: Engine Integration
└── T-007: Update SyncClientEngine (depends on T-005, T-006)

Phase 5: API & Cleanup
├── T-008: New index.ts (depends on domain tasks)
├── T-009: Delete old files (depends on T-007, T-008)
└── T-010: Verify tests (depends on T-009)
```

## Task Files

- [T-001: Create SqlExecutor](tasks/T-001-sql-executor.md)
- [T-002: Config Defaults](tasks/T-002-config-defaults.md)
- [T-003: Change Applier](tasks/T-003-change-applier.md)
- [T-004: Queue Refactor](tasks/T-004-queue.md)
- [T-005: Push Service](tasks/T-005-push-service.md)
- [T-006: Pull Service](tasks/T-006-pull-service.md)
- [T-007: Update Engine](tasks/T-007-update-engine.md)
- [T-008: Public API](tasks/T-008-public-api.md)
- [T-009: Cleanup](tasks/T-009-cleanup.md)
- [T-010: Verification](tasks/T-010-verification.md)

## Delegation Guidelines

When delegating tasks to subagents:

1. **Always include full context**: Pass the task file + context.md + requirements.md
2. **Specify dependencies**: Subagent must verify dependencies are complete before starting
3. **Provide verification steps**: Each task file has specific verification commands
4. **No scope creep**: Subagent should stay within task boundaries - if issues found, report back do not expand scope

## Risk Tasks

High risk tasks that need extra attention:
- T-005: Push service (most complex, touches many components)
- T-007: Engine update (integration point, can break app)
- T-010: Verification (final validation of all changes)
