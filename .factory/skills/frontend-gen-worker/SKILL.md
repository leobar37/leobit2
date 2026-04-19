---
name: frontend-gen-worker
description: Create code generators for PGlite-first frontend services and hooks
---

# Frontend Generator Worker

## When to Use This Skill

For features that create or extend code generators in `@avileo/drizzle-sync`:
- Service generator (BaseService subclasses)
- Hook generator (PGlite-first TanStack Query hooks)
- PostgreSQL DDL generator (for PGlite)
- Query key factory generator
- Type generator (Create/Update input interfaces)
- Applier config generator updates

## Required Skills

- `frontend` — For React patterns, TanStack Query, and hook conventions
- `avileo` — For Avileo-specific patterns (BaseService, service-provider, sync queue)

## Work Procedure

### 1. Study the Target Pattern
- Read 2-3 manual services to extract the common pattern (e.g., tag-service.ts, supplier-service.ts)
- Read 2-3 manual hooks to extract the common pattern (e.g., use-tags.ts, use-suppliers.ts)
- Read the existing generator code (hooks-generator.ts, ddl-generator.ts)
- Document the template with placeholders

### 2. Design the Generator
- Decide what inputs the generator needs (entity config, table schema, field metadata)
- Decide the output format (file content, multiple files, single barrel file)
- Handle edge cases: optional fields, relations, search filters, pagination
- Ensure generated code matches manual patterns exactly

### 3. Write Tests First (TDD)
- Write tests for the generator in `packages/drizzle-sync/src/config/generators/__tests__/`
- Test with real Drizzle table introspection data
- Verify output matches expected template
- Tests must fail (red) before implementation

### 4. Implement the Generator
- Add generator function to `packages/drizzle-sync/src/config/generators/`
- Integrate into `generateAll()` orchestrator in `generator.ts`
- Handle errors gracefully (missing fields, unsupported types)
- Add CLI flag if needed

### 5. Validate with Pilot Entity
- Choose simplest entity (tags or suppliers)
- Run generator against that entity
- Compare generated output with manual code
- Fix discrepancies

### 6. Run Tests
- `cd packages/drizzle-sync && bun run test:run` — all tests pass
- `cd packages/drizzle-sync && bun run build` — builds successfully
- `cd packages/drizzle-sync && bun run typecheck` — zero errors

### 7. Document
- Add generator usage to README or AGENTS.md
- Provide example output in comments

## Example Handoff

```json
{
  "salientSummary": "Created service-generator.ts that emits BaseService subclasses with CRUD + sync queue integration. Validated with tags entity — generated TagService matches manual implementation. Added 6 generator tests.",
  "whatWasImplemented": "1) Created packages/drizzle-sync/src/config/generators/service-generator.ts with generateService() function. 2) Emits class extending BaseService with getEntityType(), getEntityPrefix(), findById, findByBusiness, create, update, delete. 3) Integrated into generateAll() orchestrator. 4) Added tests in service-generator.test.ts with 6 cases covering basic CRUD, optional fields, and sync queue calls. 5) Validated output against manual tag-service.ts.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/drizzle-sync && bun run test:run", "exitCode": 0, "observation": "210 tests passed (6 new generator tests)" },
      { "command": "cd packages/drizzle-sync && bun run build", "exitCode": 0, "observation": "All entry points built" },
      { "command": "cd packages/drizzle-sync && bunx drizzle-sync generate -c ./src/presets/avileo.ts -o /tmp/generated --dry-run", "exitCode": 0, "observation": "Generated tag service matches manual implementation" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "packages/drizzle-sync/src/config/generators/__tests__/service-generator.test.ts", "cases": [
        { "name": "generates basic CRUD service", "verifies": "emits class with findById, findByBusiness, create, update, delete" },
        { "name": "handles optional fields correctly", "verifies": "UpdateInput has optional fields, CreateInput has required" },
        { "name": "calls queueSync on create", "verifies": "generated create method queues sync operation" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Generator output does not match manual patterns and cannot be reconciled
- Need to add new Drizzle introspection capabilities
- Entity config format needs redesign
- Generated code would require breaking changes to BaseService or service-provider
- Need to support complex patterns (sub-entities, workflows) beyond simple CRUD
