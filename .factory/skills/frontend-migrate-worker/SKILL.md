---
name: frontend-migrate-worker
description: Migrate frontend PGlite services from manual implementation to extend generated BaseService subclasses.
---

# Frontend Migrate Worker

## When to Use This Skill

Use this skill for features in Milestones 3-5 (Service Migration) that involve:
- Migrating manual services to extend generated services
- Preserving custom business logic as overrides
- Maintaining backward compatible type exports
- Replacing syncGroupId with FK references

## Required Skills

- `avileo` — For project-specific context
- `avileo-sync` — For sync architecture and offline-first patterns
- `frontend` — For React/TypeScript patterns

## Work Procedure

1. **Read the current manual service**
   - Read the full service file
   - Identify: entity type, prefix, CRUD methods, custom methods, sync patterns
   - Note all methods that use generateSyncGroup() — these need FK replacement

2. **Read the generated base service**
   - Read the corresponding generated service from lib/sync/generated/services.ts
   - Understand what CRUD is already provided
   - Check type signatures for compatibility

3. **Plan the migration**
   - Determine which methods can be inherited (no override needed)
   - Determine which methods need override (custom search, enriched types)
   - Determine which methods are entirely custom (state machine, atomic ops)
   - Plan FK reference replacements for all syncGroupId usage

4. **Implement the migration**
   - Change class declaration to extend generated service
   - Re-export types for backward compatibility
   - Remove methods that are now inherited
   - Override methods that need custom behavior
   - Replace generateSyncGroup() with createId() + FK references
   - Ensure queueSync calls use correct entity types

5. **Verify compilation**
   - Run `bun run typecheck` in packages/app
   - Fix type conflicts (especially with enriched return types)
   - Ensure all imports resolve

6. **Write tests**
   - Test custom methods (search, state machine, atomic ops)
   - Test that inherited CRUD still works
   - Test sync queue behavior (operations queued correctly)

7. **Run tests**
   - Run `bun test --run` for the service
   - Fix any failures
   - Document pre-existing failures

## Example Handoff

```json
{
  "salientSummary": "Migrated CustomerService to extend CustomersService generated class. Preserved custom search with tag/group filtering and pagination. Replaced syncGroupId with FK references. All tests pass.",
  "whatWasImplemented": "Changed CustomerService to extend CustomersService from ~/lib/sync/generated/services. Removed inherited CRUD methods (findById, create, update, delete). Overrode findByBusiness() to add search parameter with tag/group filtering. Added pagination methods. Re-exported CreateCustomerInput for backward compatibility. Replaced 3 syncGroupId usages with FK references.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "cd packages/app && bun run typecheck",
        "exitCode": 0,
        "observation": "No type errors in customer-service.ts"
      },
      {
        "command": "cd packages/app && bun test --run customer-service",
        "exitCode": 0,
        "observation": "All 5 tests pass"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "packages/app/app/lib/services/customer-service.test.ts",
        "cases": [
          {"name": "search filters by tag", "verifies": "VAL-3-002"},
          {"name": "pagination returns correct page", "verifies": "VAL-3-002"},
          {"name": "create queues sync operation", "verifies": "VAL-3-001"}
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Generated base service has incompatible type signatures
- Custom methods conflict with inherited methods
- State machine logic cannot be cleanly separated from CRUD
- FK reference pattern doesn't work for the service's use case
- Need to modify BaseService or generated code to support the migration
