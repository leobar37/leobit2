---
name: cleanup-worker
description: Remove legacy code, perform final validation, and ensure codebase consistency after sync migration.
---

# Cleanup Worker

## When to Use This Skill

Use this skill for features in Milestone 6 (Cleanup & Final Validation) that involve:
- Removing legacy sync_group_id from schemas and code
- Removing generateSyncGroup() from BaseService
- Final build/typecheck/test validation
- Cross-milestone integration validation
- Documentation updates

## Required Skills

- `avileo` — For project-specific context
- `avileo-sync` — For sync architecture

## Work Procedure

1. **Identify all legacy references**
   - Grep codebase for sync_group_id, syncGroupId, generateSyncGroup
   - Categorize: DDL/schema, TypeScript types, runtime code, tests

2. **Remove legacy code safely**
   - Remove sync_group_id column from sync_operations DDL
   - Remove generateSyncGroup() from BaseService
   - Remove syncGroupId from type definitions (where no longer needed)
   - Keep in historical/deprecated types if needed for migration

3. **Update documentation**
   - Update AGENTS.md files to reflect new patterns
   - Update sync engine docs
   - Document the migration from syncGroupId to FK references

4. **Run full validation suite**
   - `bun run build` (all packages)
   - `bun run typecheck` (both packages)
   - `bun test --run` (both packages)
   - Document any pre-existing failures

5. **Write integration tests**
   - Test FK ordering end-to-end
   - Test service chain integrity
   - Test queue without syncGroupId

6. **Final verification**
   - Grep for any remaining syncGroupId references
   - Verify all imports backward compatible
   - Confirm no new test failures

## Example Handoff

```json
{
  "salientSummary": "Removed all legacy sync_group_id references from codebase. Removed generateSyncGroup() from BaseService. Full build, typecheck, and tests pass. Added integration tests for FK ordering.",
  "whatWasImplemented": "Removed sync_group_id column from sync_operations DDL in pglite schema. Removed generateSyncGroup() method from BaseService. Removed syncGroupId from EnqueueParams and SyncOperationInput types. Updated all AGENTS.md files. Added 3 integration tests for cross-milestone validation.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "rg syncGroupId packages/app/app/lib/",
        "exitCode": 1,
        "observation": "No matches found — all references removed"
      },
      {
        "command": "bun run build",
        "exitCode": 0,
        "observation": "All packages build successfully"
      },
      {
        "command": "cd packages/app && bun run typecheck",
        "exitCode": 0,
        "observation": "Zero type errors"
      },
      {
        "command": "cd packages/app && bun test --run",
        "exitCode": 0,
        "observation": "All tests pass (pre-existing failures documented)"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "packages/app/app/lib/sync/__tests__/fk-ordering.integration.test.ts",
        "cases": [
          {"name": "sale processed before items by FK reference", "verifies": "VAL-CROSS-001"},
          {"name": "service chain customer-sale-payment works", "verifies": "VAL-CROSS-002"},
          {"name": "queue integrity without syncGroupId", "verifies": "VAL-CROSS-003"}
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Legacy code is still referenced by active code paths
- Removing code causes unexpected test failures
- Need to preserve backward compatibility for external consumers
- Documentation changes are extensive and need review
