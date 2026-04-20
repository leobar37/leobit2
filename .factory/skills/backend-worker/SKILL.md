---
name: backend-worker
description: Implement backend sync engine enhancements, OperationSorter improvements, and server-side sync framework changes.
---

# Backend Worker

## When to Use This Skill

Use this skill for features in Milestone 1 (Sync Engine Evolution) that involve:
- Enhancing OperationSorter with FK-based topological sorting
- Making syncGroupId optional in type definitions
- Server-side sync framework changes
- Changes to packages/drizzle-sync/src/server/

## Required Skills

- `avileo` — For project-specific context
- `avileo-sync` — For sync engine architecture
- `bun-elysia` — For backend patterns

## Work Procedure

1. **Understand the current implementation**
   - Read the file(s) to be modified
   - Read related tests
   - Understand the data flow (queue → sorter → engine → handlers)

2. **Write tests first (TDD)**
   - Create test file with failing tests for the new behavior
   - Tests should cover: happy path, edge cases, backward compatibility
   - Run tests to confirm they fail (red)

3. **Implement the change**
   - Follow existing code patterns
   - Maintain backward compatibility
   - Use TypeScript strict types

4. **Make tests pass (green)**
   - Run tests until they pass
   - Fix any regressions

5. **Refactor if needed**
   - Clean up code while keeping tests green

6. **Verify integration**
   - Run typecheck on the drizzle-sync package
   - Run all tests in the package
   - Check that changes don't break backend tests

## Example Handoff

```json
{
  "salientSummary": "Enhanced OperationSorter with topological sort based on payload FK references. Added dependency graph builder that inspects operation payloads for foreign key fields defined in presets/avileo.ts. Maintained backward compatibility with syncGroupId sorting.",
  "whatWasImplemented": "Added buildDependencyGraph() method to OperationSorter that maps entityId to operation and detects FK references in payloads using relation config. Modified sort() to perform topological sort: entity priority → FK dependency resolution → timestamp. Added 8 unit tests covering single parent, multi-parent, circular dependency, and backward compatibility scenarios.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "cd packages/drizzle-sync && bun test --run",
        "exitCode": 0,
        "observation": "All 12 tests pass, including 8 new FK-ordering tests"
      },
      {
        "command": "cd packages/drizzle-sync && bun run typecheck",
        "exitCode": 0,
        "observation": "No type errors"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "packages/drizzle-sync/src/server/operation-sorter.test.ts",
        "cases": [
          {"name": "sorts sale before sale_items by FK reference", "verifies": "VAL-1-001"},
          {"name": "handles multi-parent dependencies", "verifies": "VAL-1-002"},
          {"name": "maintains backward compatibility with syncGroupId", "verifies": "VAL-1-004"}
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Change requires modifying database schema
- Change affects the sync protocol between frontend and backend
- Change requires coordination with frontend generator changes
- Tests reveal unexpected behavior in existing sync handlers
