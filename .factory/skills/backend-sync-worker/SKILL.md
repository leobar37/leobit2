---
name: backend-sync-worker
description: Migrate backend sync framework to @avileo/drizzle-sync library
---

# Backend Sync Worker

## When to Use This Skill

For features that migrate backend sync components to the `@avileo/drizzle-sync` library:
- SyncEngine migration with middleware hooks
- BaseSyncHandler migration with logger injection
- HandlerRegistry migration
- GenericSyncHandler + SyncHandlerBuilder migration to library
- ConflictResolverRegistry migration
- Repository interface alignment
- SyncService migration to use library SyncEngine

## Required Skills

- `avileo-sync` — For sync engine patterns, conflict resolution, and offline-first architecture
- `bun-elysia` — For ElysiaJS backend patterns and Drizzle ORM

## Work Procedure

### 1. Understand the Current State
- Read the backend file(s) being migrated
- Read the corresponding library file(s)
- Identify deltas: what does the backend have that the library lacks?

### 2. Write Tests First (TDD)
- If adding functionality to the library, write tests in `packages/drizzle-sync/src/...`
- If migrating backend code, write tests that verify the migrated behavior matches the original
- Tests must fail (red) before implementation
- Cover: happy path, error cases, edge cases, integration points

### 3. Implement Library Changes (if needed)
- Add missing features to `@avileo/drizzle-sync` library
- Follow library patterns: generics, config objects, interfaces
- Ensure backward compatibility
- Run `cd packages/drizzle-sync && bun run test:run` — must pass

### 4. Migrate Backend Code
- Replace backend imports with library imports
- Adapt backend code to library interfaces
- Preserve business logic (never modify behavior during migration)
- Ensure `RequestContext` → `SyncRequestContext` mapping works

### 5. Run Backend Tests
- `cd packages/backend && bun test` — all existing tests must pass
- `cd packages/backend && bun run typecheck` — zero errors
- If tests fail, fix before proceeding

### 6. Verify Integration
- Check that backend SyncService can instantiate library SyncEngine
- Verify middleware hooks work if applicable
- Confirm conflict resolvers register correctly

### 7. Document Changes
- Update relevant AGENTS.md files if patterns change
- Note any breaking changes in handoff

## Example Handoff

```json
{
  "salientSummary": "Migrated backend SyncEngine to use @avileo/drizzle-sync/server SyncEngine with middleware hooks. Added SyncEngineMiddleware interface to library. Backend SyncService now instantiates library engine with SyncPipeline as middleware. All 14 handler tests pass.",
  "whatWasImplemented": "1) Added SyncEngineMiddleware interface (beforeExecute, afterExecute, onError) to packages/drizzle-sync/src/server/sync-engine.ts. 2) Modified library SyncEngine.processOperation() to invoke middleware hooks at appropriate points. 3) Migrated backend SyncService to instantiate library SyncEngine with SyncPipeline middleware. 4) Updated backend imports from local framework to @avileo/drizzle-sync/server. 5) Added 8 unit tests for middleware hook behavior.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/drizzle-sync && bun run test:run", "exitCode": 0, "observation": "212 tests passed (8 new middleware tests added)" },
      { "command": "cd packages/drizzle-sync && bun run build", "exitCode": 0, "observation": "All 9 entry points built successfully" },
      { "command": "cd packages/backend && bun run typecheck", "exitCode": 0, "observation": "Zero type errors" },
      { "command": "cd packages/backend && bun test", "exitCode": 0, "observation": "All 14 sync handler tests pass" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "packages/drizzle-sync/src/server/sync-engine.test.ts", "cases": [
        { "name": "middleware beforeExecute short-circuits handler execution", "verifies": "beforeExecute can return result without calling handler.execute()" },
        { "name": "middleware afterExecute transforms result", "verifies": "afterExecute receives and can modify handler result" },
        { "name": "middleware onError converts error to failure result", "verifies": "onError catches handler exceptions and returns SyncHandlerResult" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Library and backend types are incompatible and cannot be reconciled without architectural changes
- Backend tests fail in ways that suggest behavior changes (not just import fixes)
- Need to add significant new features to the library that were not planned
- Conflict resolver registration pattern requires redesign
- SyncPipeline behavior cannot be preserved as middleware
