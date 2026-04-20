---
name: frontend-gen-worker
description: Update and fix the drizzle-sync code generators (service-generator, hooks-generator, etc.) and regenerate frontend sync code.
---

# Frontend Generator Worker

## When to Use This Skill

Use this skill for features in Milestone 2 (Generator Update) that involve:
- Fixing service-generator.ts bugs (junction tables, businessId, timestamps)
- Updating hooks-generator.ts to omit syncGroupId
- Regenerating all frontend sync code
- Verifying generated code compiles

## Required Skills

- `avileo` — For project-specific context
- `avileo-sync` — For sync architecture and patterns
- `frontend` — For React/TypeScript frontend patterns

## Work Procedure

1. **Read the generator code**
   - Read the specific generator file(s) to modify
   - Understand the current output format
   - Check how generated code is consumed (read a migrated service like supplier-service.ts)

2. **Identify the fix needed**
   - For junction tables: check if table has 'id' column, omit businessId if junction
   - For hooks: remove syncGroupId generation, add FK references in child payloads
   - For services: remove generateSyncGroup(), fix date types

3. **Write a test for the generator**
   - Create a test that verifies the generator output for a specific entity
   - Test should check the generated code contains expected patterns
   - Run test to confirm it fails with current generator

4. **Implement the generator fix**
   - Modify the generator to produce correct output
   - Ensure the fix is general (applies to all affected entities, not just one)

5. **Run the generator**
   - Execute `bun run sync:generate`
   - Verify output files are created at the correct path
   - Inspect generated code for correctness

6. **Verify compilation**
   - Run `bun run typecheck` in packages/app
   - Fix any type errors in generated code
   - Run `bun run build` to verify full build

7. **Verify migrated services still work**
   - Check that existing migrated services (SupplierService, etc.) still compile
   - Fix any import issues

## Example Handoff

```json
{
  "salientSummary": "Fixed service-generator.ts to omit businessId in junction tables and use string timestamps. Updated hooks-generator.ts to use FK references instead of syncGroupId. Regenerated all code successfully.",
  "whatWasImplemented": "Modified service-generator.ts: (1) junction table detection now excludes businessId from insert and findByBusiness, (2) timestamp fields use string type instead of Date. Modified hooks-generator.ts: removed syncGroupId generation, child operations now include parent FK in payload. Regenerated all 16 entities. All generated code compiles.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "cd packages/backend && bun run sync:generate",
        "exitCode": 0,
        "observation": "Generated 6 files with 16 entities"
      },
      {
        "command": "cd packages/app && bun run typecheck",
        "exitCode": 0,
        "observation": "Zero type errors"
      },
      {
        "command": "bun run build",
        "exitCode": 0,
        "observation": "All packages build successfully"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "packages/drizzle-sync/src/config/generators/service-generator.test.ts",
        "cases": [
          {"name": "junction table omits businessId", "verifies": "VAL-2-001"},
          {"name": "timestamps use string type", "verifies": "VAL-2-006"}
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Generator fix requires changes to the sync config schema
- Generated code has type errors that require BaseService changes
- Fix affects the output format in a way that breaks existing migrated services
- Need to coordinate with backend sync engine changes
