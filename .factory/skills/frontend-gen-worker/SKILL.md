---
name: frontend-gen-worker
description: Generate frontend code (services, hooks, schemas) in the drizzle-sync package
---

# Frontend Gen Worker

## When to Use This Skill

Features that create or modify code generators in `packages/drizzle-sync/src/config/generators/`. This worker builds generators that emit frontend-facing code (PGlite services, hooks, schemas, DDL).

## Required Skills

- `avileo` - For project-specific context about sync patterns

## Work Procedure

1. **Study existing generators** - Read at least 2 existing generators (zod-generator.ts, postgres-ddl-generator.ts) to understand the pattern: `generateX(entityName, config) -> XOutput` + `generateXFile(outputs[]) -> string`.

2. **Study the target pattern** - Read the manual implementation that the generator should emulate. For services: read `packages/app/app/lib/services/tag-service.ts` and `base-service.ts`.

3. **Write tests first** - Create `__tests__/X-generator.test.ts` with tests that define expected output. Tests must fail before implementation.

4. **Implement the generator** - Create `src/config/generators/X-generator.ts` following the established pattern:
   - Import `introspectTable`, `resolveColumns` from `../introspect`
   - Use `pascalCase`, `camelCase` from `../../utils/string-utils`
   - Return structured output object
   - Provide file aggregator function

5. **Integrate into generator.ts** - Add import and call in `generateAll()` function.

6. **Run tests** - `cd packages/drizzle-sync && bun test -- --grep 'X generator'` - all must pass.

7. **Verify generated output** - Run a quick generation test to see actual output and verify it looks correct.

8. **Type check** - `cd packages/drizzle-sync && bun run build` or typecheck if available.

## Example Handoff

```json
{
  "salientSummary": "Implemented service-generator.ts that emits BaseService subclasses with CRUD + sync queueing. Added 12 unit tests all passing. Integrated into generator.ts generateAll().",
  "whatWasImplemented": "Created packages/drizzle-sync/src/config/generators/service-generator.ts with generateService() and generateServicesFile(). Generates classes extending BaseService with findById, findByBusiness, create, update, delete methods. Create/update/delete all call queueSync(). Handles optional fields, default values, and timestamps. Added __tests__/service-generator.test.ts with 12 test cases covering CRUD generation, optional fields, defaults, and file aggregation. Updated generator.ts to include service generation in generateAll().",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/drizzle-sync && bun test -- --grep 'service generator'", "exitCode": 0, "observation": "12 tests passed" },
      { "command": "cd packages/drizzle-sync && bun run build", "exitCode": 0, "observation": "Build succeeded" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "packages/drizzle-sync/src/config/generators/__tests__/service-generator.test.ts", "cases": [
        { "name": "generates CRUD methods", "verifies": "VAL-SVC-003" },
        { "name": "create queues sync", "verifies": "VAL-SVC-004" },
        { "name": "handles optional fields", "verifies": "VAL-SVC-007" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The generator pattern doesn't fit the established architecture
- Need to modify BaseService or other core frontend classes
- Test infrastructure is missing or broken
- Generated code has systematic issues that require architectural changes
