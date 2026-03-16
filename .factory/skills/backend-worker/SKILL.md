---
name: backend-worker
description: Backend API and database schema development
---

# Backend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve:
- Database schema (Drizzle tables)
- API endpoints (Elysia routes)
- Repository and Service layer
- Business logic

## Work Procedure

### 1. Schema Development (if feature includes schema)

1. Create table in `packages/backend/src/db/schema/` following existing patterns:
   - Use `pgTable` from drizzle-orm
   - Add `businessId`, `syncStatus`, `syncAttempts` for offline-first
   - Add proper indexes
   - Export types: `Type`, `NewType`
   - Add relations using `relations()`

2. Export in `packages/backend/src/db/schema/index.ts`

3. Run migrations:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

### 2. Repository Layer

1. Create repository class in `packages/backend/src/services/repository/`
2. Follow naming: `{Entity}Repository`
3. Methods MUST have `ctx: RequestContext` as FIRST parameter
4. ALL queries MUST filter by `ctx.businessId`

### 3. Service Layer

1. Create service class in `packages/backend/src/services/business/`
2. Use repository for data access
3. Throw domain errors (NotFoundError, ValidationError), NOT HTTP responses

### 4. API Routes

1. Create route file in `packages/backend/src/api/`
2. Use ElysiaJS patterns from existing routes
3. Register in `packages/backend/src/app.ts`
4. All endpoints require businessId from context

### 5. Verification

1. Run TypeScript check: `cd packages/backend && bun run build`
2. Test endpoints with curl:
   - GET/POST/PATCH/DELETE as appropriate
   - Verify 200/201/204 status codes
   - Verify error handling

## Example Handoff

```json
{
  "salientSummary": "Created customer_groups schema, repository, service, and CRUD API endpoints with 5 routes",
  "whatWasImplemented": "customer_groups table with businessId/syncStatus, CustomerGroupRepository with findAll/findById/create/delete, CustomerGroupService, and REST API routes at /api/groups",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "bun run db:generate", "exitCode": 0, "observation": "Migration file created" },
      { "command": "bun run db:migrate", "exitCode": 0, "observation": "Migration applied" },
      { "command": "cd packages/backend && bun run build", "exitCode": 0, "observation": "TypeScript compiled" },
      { "command": "curl -s http://localhost:3000/api/groups -H 'Authorization: Bearer ...'", "exitCode": 200, "observation": "Returns group list" }
    ]
  },
  "tests": { "added": [] },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Schema requires changes that affect existing tables
- API design needs clarification
- Missing dependencies or configuration
