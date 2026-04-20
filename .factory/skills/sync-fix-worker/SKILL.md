---
name: sync-fix-worker
description: Fix sync infrastructure issues, build failures, type errors, and test failures in the Avileo project.
---

# Sync Fix Worker

## When to Use This Skill

Use this skill for features in Milestone 0 (Stabilization) that involve:
- Fixing generator output paths
- Fixing build failures
- Fixing TypeScript type errors
- Fixing test failures
- Adding missing scripts (typecheck)

## Required Skills

- `avileo` — For project-specific context and conventions
- `avileo-sync` — For sync engine patterns and offline-first architecture

## Work Procedure

1. **Investigate the problem**
   - Read the relevant files to understand the current state
   - Identify the root cause (path mismatch, missing import, type conflict, etc.)
   - Check AGENTS.md for conventions

2. **Plan the fix**
   - Determine minimal changes needed
   - Ensure backward compatibility
   - Check for ripple effects (other files that import the changed code)

3. **Implement the fix**
   - Make changes following existing code style
   - Add comments in English only
   - Do not modify off-limits areas (backend API routes, DB schema, auth)

4. **Verify the fix**
   - Run the relevant validation command (build, typecheck, test)
   - If fixing a path: run `bun run sync:generate` then `bun run build`
   - If fixing types: run `bun run typecheck`
   - If fixing tests: run `bun test --run`
   - Document any pre-existing failures that remain

5. **Check for regressions**
   - Run the full validation suite for the affected package
   - Ensure no new failures introduced

## Example Handoff

```json
{
  "salientSummary": "Fixed generator output path by updating backend/package.json sync:generate script to output to lib/sync/generated/. Removed duplicate lib/db/generated/ directory. App now builds successfully.",
  "whatWasImplemented": "Updated packages/backend/package.json sync:generate script output path from ../app/app/lib/db/generated to ../app/app/lib/sync/generated. Removed stale lib/db/generated/ directory. Updated app/lib/sync/schema/index.ts import path to match.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "cd packages/backend && bun run sync:generate",
        "exitCode": 0,
        "observation": "Generated 6 files in lib/sync/generated/"
      },
      {
        "command": "bun run build",
        "exitCode": 0,
        "observation": "All 4 packages built successfully"
      }
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

- Fix requires modifying off-limits areas (backend API, DB schema, auth)
- Fix reveals deeper architectural issues
- Fix introduces cascading changes across many files
- Type errors are caused by missing generated code that needs generator fixes first
