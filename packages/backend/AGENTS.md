# AGENTS.md - @avileo/backend

> **ElysiaJS + Drizzle ORM backend for Avileo**

## Overview

Backend API server for Avileo - an online chicken sales management system. Built with ElysiaJS, Drizzle ORM, and PostgreSQL.

## Tech Stack

| Aspect | Technology |
|--------|------------|
| **Framework** | ElysiaJS |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL (Neon) |
| **Auth** | Better Auth |
| **Runtime** | Bun |
| **Validation** | Elysia t-schema |

## Directory Structure

```
src/
├── index.ts              # App entrypoint
├── context/              # RequestContext
│   └── request-context.ts
├── errors/               # AppError classes
│   └── index.ts
├── lib/                  # Utilities
│   ├── auth.ts          # Better Auth config
│   ├── cors.ts          # CORS settings
│   └── db.ts            # Drizzle client
├── plugins/              # Elysia plugins
│   ├── context.ts       # RequestContext plugin
│   ├── error-handler.ts # Global error handler
│   └── services.ts      # DI plugin
├── middleware/           # Auth middleware
│   └── auth.ts
├── db/
│   ├── schema/          # Drizzle table definitions
│   │   ├── index.ts
│   │   ├── auth.ts      # Better Auth tables
│   │   ├── businesses.ts
│   │   ├── customers.ts
│   │   ├── sales.ts
│   │   └── ...
│   └── schema.ts        # Schema export
├── api/                 # Route modules
│   ├── auth.ts
│   ├── customers.ts
│   ├── sales.ts
│   └── ...
└── services/
    ├── repository/      # Data access layer
    │   ├── customer.repository.ts
    │   └── ...
    └── business/        # Business logic
        ├── customer.service.ts
        └── ...
```

## RequestContext Pattern - CRITICAL RULES

### 1. First Parameter ALWAYS

**ALL** repository and service functions receive `ctx` as **first parameter**.

```typescript
// ✅ CORRECT
async findById(ctx: RequestContext, id: string)
async create(ctx: RequestContext, data: CreateInput)
async update(ctx: RequestContext, id: string, data: UpdateInput)

// ❌ INCORRECT
async findById(id: string, ctx: RequestContext)
async create(data: CreateInput, ctx: RequestContext)
```

### 2. RequestContext Caching

The `RequestContext` is built **once per request** and cached:

```typescript
// Plugin construction - executes ONCE per request
export const contextPlugin = new Elysia({ name: "context" })
  .resolve({ as: "scoped" }, async ({ request }) => {
    const ctx = await RequestContext.fromAuth(session);
    return { ctx }; // Cached for entire handler chain
  });
```

**DO NOT** reload data in each repository/service call.

### 3. Multi-Tenancy - Mandatory Filtering

**ALL** queries must include `businessId`:

```typescript
// ✅ CORRECT - Always filter by tenant
.where(and(
  eq(items.id, id),
  eq(items.businessId, ctx.businessId)  // REQUIRED
))

// ❌ INCORRECT - Missing tenant filter
.where(eq(items.id, id))
```

### 4. Single Decorate Pattern

Use **SINGLE decorate()** - Multiple decorate calls cause hangs in Elysia:

```typescript
// ✅ CORRECT - One decorate call
.decorate(() => ({
  businessRepo: new BusinessRepository(),
  businessService: new BusinessService(businessRepo),
}))

// ❌ INCORRECT - Multiple decorate
.decorate("businessRepo", new BusinessRepository())
.decorate("businessService", new BusinessService()) // NEVER
```

### 5. Error Hierarchy

Services throw specific exceptions:

```typescript
throw new NotFoundError("Business");
throw new ForbiddenError("No tiene permisos");
throw new ValidationError("El nombre es requerido");
throw new ConflictError("Already exists");
```

### 6. Response Format

All responses use standard format:

```typescript
// Success
return { success: true, data: business };

// Error (caught by error plugin)
throw new NotFoundError("Business");
```

## Repository Pattern

See [services/AGENTS.md](src/services/AGENTS.md) for detailed repository/service patterns.

### Basic Repository

```typescript
export class CustomerRepository {
  async findById(ctx: RequestContext, id: string, tx?: DbTransaction) {
    const dbOrTx = tx || db;
    
    const [customer] = await dbOrTx
      .select()
      .from(customers)
      .where(and(
        eq(customers.id, id),
        eq(customers.businessId, ctx.businessId)
      ));
    
    return customer;
  }
}
```

## Route Module Pattern

```typescript
// api/customers.ts
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
    })
  });
```

## Database Schema

### Sync Status Pattern


```typescript
```

### FK Pattern

Operational FKs point to `business_users.id`:

```typescript
sellerId: text("seller_id").references(() => businessUsers.id),
```

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | App entry, route mounting |
| `src/lib/db.ts` | Drizzle client |
| `src/lib/auth.ts` | Better Auth config |
| `src/plugins/context.ts` | RequestContext plugin |
| `src/plugins/services.ts` | DI plugin |
| `src/plugins/error-handler.ts` | Error handling |
| `src/context/request-context.ts` | RequestContext class |
| `src/errors/index.ts` | Error classes |
| `src/services/` | Repository & service layer |

## Commands

```bash
# Development
bun run dev              # Start dev server

# Database
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:push          # Push schema (dev)

# Build
bun run build            # Build for production
```

---

*See [Root AGENTS.md](../../AGENTS.md) for project overview.*
