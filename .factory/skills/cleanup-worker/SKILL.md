---
name: cleanup-worker
description: Removes TanStack DB dependencies and code after migration
---

# Cleanup Worker

## When to Use This Skill

Use this worker for:
- Removing TanStack DB dependencies from package.json
- Deleting TanStack collections and utilities
- Cleaning up unused imports
- Final validation of migration

## Work Procedure

### 1. Remove Dependencies
- Remove `@tanstack/db`
- Remove `@tanstack/react-db`
- Remove `@tanstack/electric-db-collection`
- Remove `tanstack-db-pglite`
- Run npm install to update lockfile

### 2. Delete Collections
- Remove `~/lib/db/collections/*.collection.ts`
- Delete collection utilities
- Remove sync-manager.ts if not needed

### 3. Clean Imports
- Search for TanStack imports
- Remove unused imports
- Update any remaining references

### 4. Verify Build
- Run typecheck
- Run build
- Verify no errors

### 5. Measure Bundle
- Compare bundle size before/after
- Document size reduction

## Example Handoff

```json
{
  "salientSummary": "Removed all TanStack DB dependencies and code. Deleted 6 collection files. Build passes. Bundle size reduced by 45KB.",
  "whatWasImplemented": "Complete cleanup of TanStack DB: removed 4 npm dependencies, deleted 6 collection files and utilities, cleaned all imports, verified build passes, measured bundle size reduction.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "grep -r '@tanstack/db' packages/app/src || echo 'No matches'",
        "exitCode": 0,
        "observation": "No TanStack imports found"
      },
      {
        "command": "cd packages/app && npm run typecheck",
        "exitCode": 0,
        "observation": "No type errors"
      },
      {
        "command": "cd packages/app && npm run build",
        "exitCode": 0,
        "observation": "Build successful"
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Build fails after cleanup
- Dependencies have peer dependencies
- Other code depends on TanStack utilities
- Uncertain about removing specific files
