---
name: frontend-migration-worker
description: Migrates React hooks and UI components from TanStack DB to PGlite + ElectricSQL
---

# Frontend Migration Worker

## When to Use This Skill

Use this worker for:
- Migrating hooks from `@tanstack/react-db` to PGlite
- Updating UI components to use new hooks
- Implementing offline support with write-engine
- Testing migrated functionality

## Work Procedure

### 1. Analyze Current Hook
- Read existing TanStack hook
- Identify all CRUD operations
- Note UI components using the hook
- Document query patterns

### 2. Create New PGlite Hook
- Import from `~/engine` and `~/engine/schema`
- Use `useQuery` from `@tanstack/react-query`
- Implement queries with Drizzle ORM
- Use `pushWrite` for mutations

### 3. Update UI Components
- Replace old hook imports
- Update component props if needed
- Handle loading/error states
- Test component rendering

### 4. Verify Offline Support
- Ensure mutations use `pushWrite`
- Test offline functionality
- Verify sync when online

### 5. Write Tests
- Unit tests for hook
- Component render tests
- Offline/online transition tests

## Example Handoff

```json
{
  "salientSummary": "Migrated use-distribuciones hook from TanStack DB to PGlite. Updated 2 pages and 1 component. All CRUD operations work offline with sync support.",
  "whatWasImplemented": "New use-distribuciones hook using Drizzle ORM with PGlite. Implements useQuery for fetching distribuciones, useMutation for create/update/close/delete operations via pushWrite. Updated distribuciones.tsx and mi-distribucion.tsx pages to use new hook.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "cd packages/app && npm run typecheck",
        "exitCode": 0,
        "observation": "No type errors"
      },
      {
        "command": "cd packages/app && npm test -- use-distribuciones",
        "exitCode": 0,
        "observation": "3 tests passing"
      }
    ],
    "interactiveChecks": [
      {
        "action": "Load /distribuciones page",
        "observed": "List renders with distribuciones from PGlite"
      },
      {
        "action": "Create new distribucion offline",
        "observed": "Distribucion created, queued for sync"
      },
      {
        "action": "Go online",
        "observed": "Distribucion syncs to server"
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "packages/app/app/hooks/use-distribuciones.test.ts",
        "cases": [
          {"name": "fetches distribuciones from PGlite", "verifies": "Query returns data"},
          {"name": "creates distribucion offline", "verifies": "pushWrite queues mutation"},
          {"name": "syncs when online", "verifies": "Sync process sends to server"}
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Hook dependencies not available
- UI components have complex dependencies
- Offline support requires architectural changes
- Type conflicts between schemas
