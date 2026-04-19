---
name: frontend-migrate-worker
description: Migrate manual frontend code to generated PGlite-first services and hooks
---

# Frontend Migrate Worker

## When to Use This Skill

For features that replace manual frontend code with generated equivalents:
- Replace manual services with generated BaseService subclasses
- Replace manual hooks with generated TanStack Query hooks
- Replace manual SQL schemas with generated PostgreSQL DDL
- Replace manual Zod schemas with generated schemas
- Update service-provider.tsx to use generated services
- Validate generated code works in the actual app

## Required Skills

- `frontend` — For React Router v7, TanStack Query, and component patterns
- `avileo` — For Avileo-specific patterns and offline-first architecture

## Work Procedure

### 1. Generate Code for Target Entity
- Run the appropriate generator (service, hook, DDL, schema)
- Review generated output against manual implementation
- Identify discrepancies

### 2. Compare Generated vs Manual
- Line-by-line comparison of generated service vs manual service
- Check: method signatures, query patterns, sync queue calls, error handling
- Check hooks: query keys, invalidation patterns, service method calls
- Document any intentional differences

### 3. Replace Manual Code
- Delete manual service/hook/schema file
- Import generated code instead
- Update any consumers (components, other hooks, routes)
- Ensure no broken imports

### 4. Run Tests
- `cd packages/app && bun test` — unit tests pass
- `cd packages/app && bun run typecheck` — zero errors
- If tests fail, fix before proceeding

### 5. Manual Verification
- Start dev server (`bun run dev` from root)
- Navigate to the relevant screen in browser
- Test CRUD operations for the entity
- Verify offline behavior (create while offline, sync when online)
- Check that query invalidation works correctly

### 6. Document
- Note which entity was migrated
- List any manual code that could not be replaced
- Update AGENTS.md if patterns change

## Example Handoff

```json
{
  "salientSummary": "Migrated tags entity from manual to generated code. Replaced tag-service.ts and use-tags.ts with generated equivalents. Verified CRUD works in browser and offline sync queues correctly.",
  "whatWasImplemented": "1) Generated TagService and useTags hook using drizzle-sync generator. 2) Deleted manual tag-service.ts and use-tags.ts. 3) Updated service-provider.tsx to import generated TagService. 4) Verified all tag CRUD operations work in browser. 5) Tested offline create → online sync flow.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/app && bun run typecheck", "exitCode": 0, "observation": "Zero type errors" },
      { "command": "cd packages/app && bun test", "exitCode": 0, "observation": "All tests pass" }
    ],
    "interactiveChecks": [
      { "action": "Navigate to Tags screen, create new tag 'TestTag'", "observed": "Tag appears in list immediately" },
      { "action": "Go offline, create tag 'OfflineTag'", "observed": "Tag appears in list, sync badge shows pending" },
      { "action": "Go online, trigger sync", "observed": "Sync completes, tag persists" },
      { "action": "Delete tag 'TestTag'", "observed": "Tag removed from list, sync queued" }
    ]
  },
  "tests": {
    "added": [],
    "modified": [
      { "file": "packages/app/app/lib/services/tag-service.ts", "note": "Replaced manual with generated" },
      { "file": "packages/app/app/hooks/use-tags.ts", "note": "Replaced manual with generated" }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Generated code does not match required behavior and cannot be fixed by generator changes
- Migration breaks existing tests in ways that suggest behavior changes
- Need to modify BaseService or service-provider architecture
- Entity has complex patterns (sub-entities, workflows) that generator cannot handle
- Need to migrate multiple entities and want sequencing guidance
