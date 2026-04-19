---
name: cleanup-worker
description: Remove duplicate framework files and validate no regressions
---

# Cleanup Worker

## When to Use This Skill

Features that clean up duplicate or orphaned code after migration. This worker ensures no manual code remains after generated versions are in place.

## Required Skills

- `avileo` - For project-specific context

## Work Procedure

1. **Identify duplicates** - Find manual files that have generated equivalents:
   ```bash
   find packages/app/app/lib/services -name "*-service.ts" | sort
   ```

2. **Verify generated equivalents exist** - Check that generated files exist and compile.

3. **Remove or deprecate manual files**:
   - If fully replaced: delete manual file
   - If partially replaced: keep as extension, remove duplicated methods
   - Update barrel exports (index.ts files)

4. **Verify no broken imports**:
   ```bash
   cd packages/app && bun run typecheck
   ```

5. **Run full test suite**:
   ```bash
   cd packages/app && bun test
   cd packages/drizzle-sync && bun test
   cd packages/backend && bun test
   ```

6. **Check for orphaned references**:
   - Search for imports of deleted files
   - Check for unused variables/functions

## Example Handoff

```json
{
  "salientSummary": "Cleaned up 4 duplicate service files. Verified no broken imports. All test suites pass.",
  "whatWasImplemented": "Removed manual service files that were fully replaced by generated versions. Updated index exports. Verified compilation and tests across all packages.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/app && bun run typecheck", "exitCode": 0, "observation": "0 errors" },
      { "command": "cd packages/app && bun test", "exitCode": 0, "observation": "All pass" },
      { "command": "cd packages/drizzle-sync && bun test", "exitCode": 0, "observation": "All pass" },
      { "command": "cd packages/backend && bun test", "exitCode": 0, "observation": "All pass" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Deleting files would break imports in many places
- Test failures indicate the generated code isn't a full replacement
- Need user decision on which files to keep vs delete
