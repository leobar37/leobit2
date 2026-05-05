# AGENTS.md - @avileo/backend

> Consolidated backend guidance for ElysiaJS + Drizzle + PostgreSQL.

## Overview

Backend API service for Avileo with strict tenant isolation and layered architecture:

- **RequestContext** for request/user/business scope
- **Repositories** for data access
- **Business services** for rules/orchestration
- **Plugins** for DI, errors, context
- **Drizzle** for schema/query/data integrity

## Critical rules

### 1) `ctx` parameter

`RequestContext` must be the first argument for all repository and service methods.

```ts
async findById(ctx: RequestContext, id: string)
async create(ctx: RequestContext, input: CreateInput)
async update(ctx: RequestContext, id: string, input: UpdateInput)
```

### 2) Tenant filtering

Every query that reads/writes business data must constrain by `businessId` from `ctx`.

```ts
.where(eq(table.id, id), eq(table.businessId, ctx.businessId))
```

### 3) Single DI decorate

Use one `decorate()` call per plugin.

```ts
.decorate(() => {
  const businessRepo = new BusinessRepository();
  return {
    businessRepo,
    businessService: new BusinessService(businessRepo),
  };
})
```

### 4) Error boundaries

Services throw domain errors (`NotFoundError`, `ValidationError`, `ConflictError`, `ForbiddenError`), never HTTP responses.

### 5) Transactional consistency

Mutation paths and multi-step workflows should use repository-level transactions where needed.

## Architecture map

```text
src/
├── app.ts / index.ts             # app bootstrap and route mounting
├── context/                      # RequestContext
├── plugins/                      # context, services, error handling
├── middleware/                   # auth and route guards
├── api/                          # route modules per domain
├── services/
│   ├── repository/               # raw data access
│   ├── business/                 # domain rules
│   ├── infrastructure/           # infra adapters
│   └── transitions/              # state transition side-effects
├── db/
│   ├── schema/                  # Drizzle table definitions
│   └── migrations/               # SQL migration files
└── errors/, lib/, seed/
```

## Route conventions

- Build routes with Elysia and pass `ctx` from plugin.
- Validate request bodies with `t.Object` where needed.
- Keep response format consistent: `{ success: true, data: ... }`.

```ts
import { Elysia, t } from "elysia";

export const customerRoutes = new Elysia({ prefix: "/customers" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .get("/", async ({ customerService, ctx }) => {
    const customers = await customerService.findAll(ctx);
    return { success: true, data: customers };
  })
  .post("/", async ({ customerService, ctx, body }) => {
    const customer = await customerService.create(ctx, body);
    return { success: true, data: customer };
  }, {
    body: t.Object({
      name: t.String(),
      phone: t.Optional(t.String()),
    }),
  });
```

## Repository/service conventions (consolidated)

### Repository

- Accept `ctx` first.
- Support optional `tx?: DbTransaction` for transactional operations.
- Keep queries deterministic and tenant scoped.

### Service layer

- Owns orchestration and domain validation.
- Delegates reads/writes to repos.
- Uses transactions for combined operations.
- Throws domain errors instead of returning HTTP-level payloads.

## Schema conventions

- Use CUID2 IDs via `createId()`.
- Tenant tables use `businessId` and index when needed.
- Operational FKs point to `business_users.id`.
- Timestamps: `createdAt` / `updatedAt` with defaults as in existing codebase.
- Better Auth tables (`users`, `sessions`, etc.) remain managed by Better Auth.
- Keep `sync_status` / `sync_attempts` consistent for sync-capable entities.

## Transition handlers

Transition handlers execute side effects only through repositories and shared transaction.

```ts
.onTransition(from, to, async (ctx, entity, tx) => {
  // repository-only side effects with tx
});
```

- Do not pass request bodies to transition handlers.
- Do not mutate entities in place.

## API and DI file references

| File | Purpose |
|------|---------|
| `src/app.ts` | Main API app setup |
| `src/index.ts` | Server bootstrap |
| `src/plugins/context.ts` | RequestContext plugin |
| `src/plugins/services.ts` | DI container |
| `src/plugins/error-handler.ts` | Centralized error mapping |
| `src/db/schema/index.ts` | Schema exports |
| `src/db/migrations/*` | SQL history |
| `src/context/request-context.ts` | Context model |
| `src/errors/index.ts` | Domain errors |

## Quick commands

```bash
cd packages/backend
bun run dev
bun run build
bun run db:generate
bun run db:migrate
bun run db:push
bun run test
bun run test:e2e
```

## Testing

- Keep unit tests near services when possible.
- Prefer integration coverage for request-context and transactional logic.

---

*For project-wide conventions, see the root `AGENTS.md`.*