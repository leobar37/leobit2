---
name: cleanup-worker
description: Remove duplicate framework files and validate no regressions
---

# Cleanup Worker

## When to Use This Skill

For features that remove deprecated/duplicate code after migration validation:
- Delete backend framework files that are now in the library
- Delete manual frontend files replaced by generated code
- Verify no remaining imports point to deleted files
- Run full test suite to confirm no regressions
- Update imports and barrel exports

## Required Skills

- `avileo` — For understanding project structure and dependencies
- `avileo-sync` — For sync-specific code patterns

## Work Procedure

### 1. Identify Files to Delete
- List all files marked for deletion based on migration plan
- Verify each file has a library equivalent or generated replacement
- Check for any remaining imports of these files across the codebase

### 2. Update Imports
- Find all files that import from files being deleted
- Update imports to point to library or generated equivalents
- Handle re-exports in barrel files (index.ts)

### 3. Delete Files
- Delete identified files
- Commit with clear message

### 4. Run Full Validation
- `cd packages/backend && bun run typecheck` — zero errors
- `cd packages/backend && bun test` — all tests pass
- `cd packages/app && bun run typecheck` — zero errors
- `cd packages/app && bun test` — all tests pass
- `cd packages/drizzle-sync && bun run test:run` — all tests pass
- `bun run build` from root — all packages build

### 5. Verify No Orphaned Imports
- Search for imports pointing to deleted paths
- Search for references to deleted class names
- Ensure no runtime errors from missing modules

### 6. Document
- List deleted files in handoff
- Note any files kept intentionally
- Update AGENTS.md if directory structure changes

## Example Handoff

```json
{
  "salientSummary": "Deleted 7 duplicate backend framework files after confirming all imports migrated to @avileo/drizzle-sync. Full test suite passes, zero type errors, all packages build successfully.",
  "whatWasImplemented": "1) Deleted packages/backend/src/services/sync/framework/SyncEngine.ts. 2) Deleted SyncPipeline.ts, HandlerRegistry.ts, OperationSorter.ts, EntityRegistry.ts, BaseSyncHandler.ts. 3) Updated all imports in backend to use library equivalents. 4) Verified no orphaned imports remain. 5) Full validation passed.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/backend && bun run typecheck", "exitCode": 0, "observation": "Zero errors" },
      { "command": "cd packages/backend && bun test", "exitCode": 0, "observation": "All tests pass" },
      { "command": "cd packages/app && bun run typecheck", "exitCode": 0, "observation": "Zero errors" },
      { "command": "cd packages/drizzle-sync && bun run test:run", "exitCode": 0, "observation": "All tests pass" },
      { "command": "bun run build", "exitCode": 0, "observation": "All 4 packages build" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [],
    "modified": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Deleting files would break imports that cannot be easily fixed
- Full test suite fails after deletion
- Need to preserve some files partially (extract remaining logic first)
- Uncertainty about whether a file is truly safe to delete
