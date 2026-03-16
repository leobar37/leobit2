---
name: frontend-worker
description: React frontend components, pages, and hooks development
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve:
- React components and pages
- Frontend routing
- React hooks for data fetching
- UI components

## Work Procedure

### 1. Create Route (if new page)

1. Add route file in `packages/app/app/routes/`
2. Use naming convention: `_protected.{page}.tsx`
3. Follow existing route patterns

### 2. Create Components

1. Create component in `packages/app/app/components/`
2. Use existing UI primitives (Card, Button, AppDrawer)
3. Follow naming: `PascalCase.tsx`

### 3. Create Hooks (for data fetching)

1. Create hook in `packages/app/app/hooks/`
2. Use TanStack Query for server state
3. Use existing API client patterns

### 4. Integration

1. Connect components to hooks
2. Handle loading/error states
3. Add offline-first logic where needed (check isOnline)

### 5. Verification

1. Run TypeScript: `cd packages/app && bun run build`
2. Check for console errors on page load

## Example Handoff

```json
{
  "salientSummary": "Created groups management page at /grupos with CRUD UI and member management",
  "whatWasImplemented": "New route _protected.grupos.tsx, GroupCard component, GroupForm component, useGroups hook, integration with API",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/app && bun run build", "exitCode": 0, "observation": "TypeScript compiled" }
    ]
  },
  "tests": { "added": [] },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Backend API doesn't exist yet
- Design needs clarification
- Missing existing components to reuse
