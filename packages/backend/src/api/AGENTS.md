# AGENTS.md - API Routes Directory

> **ElysiaJS route modules for Avileo backend**

## Overview

This directory contains all API route modules using ElysiaJS. Each file exports route definitions that are mounted in the main app via `.use()`.

## Route Module Pattern

### Basic Structure

```typescript
// api/customers.ts
import { Elysia, t } from "elysia";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";

export const customerRoutes = new Elysia({ prefix: "/customers" })
  .use(contextPlugin)      // RequestContext
  .use(servicesPlugin)     // Repositories & services
  
  // GET /customers
  .get("/", async ({ customerService, ctx }) => {
    const customers = await customerService.findAll(ctx);
    return { success: true, data: customers };
  })
  
  // GET /customers/:id
  .get("/:id", async ({ customerService, ctx, params }) => {
    const customer = await customerService.findById(ctx, params.id);
    if (!customer) throw new NotFoundError("Customer");
    return { success: true, data: customer };
  })
  
  // POST /customers
  .post("/", async ({ customerService, ctx, body }) => {
    const customer = await customerService.create(ctx, body);
    return { success: true, data: customer };
  }, {
    body: t.Object({
      name: t.String(),
      phone: t.Optional(t.String()),
    })
  })
  
  // PUT /customers/:id
  .put("/:id", async ({ customerService, ctx, params, body }) => {
    const customer = await customerService.update(ctx, params.id, body);
    return { success: true, data: customer };
  }, {
    body: t.Partial(t.Object({
      name: t.String(),
      phone: t.Optional(t.String()),
    }))
  })
  
  // DELETE /customers/:id
  .delete("/:id", async ({ customerService, ctx, params }) => {
    await customerService.delete(ctx, params.id);
    return { success: true };
  });
```

### Route Organization

```
api/
├── auth.ts              # Authentication (login, register, session)
├── customers.ts         # Customer CRUD
├── sales.ts             # Sales & POS operations
├── products.ts          # Product catalog
├── purchases.ts         # Purchase orders
├── suppliers.ts         # Supplier management
├── payments.ts          # Payments/abonos
├── inventory.ts         # Inventory tracking
├── distribuciones.ts    # Distribution management
├── tags.ts              # Customer tags
├── closings.ts          # Daily closings
├── reports.ts           # Business reports
├── businesses.ts        # Business/tenant management
├── files.ts             # File uploads (R2)
├── assets.ts            # Asset management
├── ocr.ts               # OCR receipt processing
├── sync.ts              # Offline sync endpoint
├── electric.ts          # ElectricSQL sync
├── public-sales.ts      # Public sale tokens
├── invitations.ts       # Staff invitations
├── profile.ts           # User profile
├── product-units.ts     # Product units
├── whatsapp/            # WhatsApp integration
│   ├── templates.ts
│   ├── settings.ts
│   └── messages.ts
└── businesses/          # Nested business routes
    └── payment-methods.ts
```

## Critical Patterns

### 1. Always Use Context Plugin

```typescript
// ✅ CORRECT
.use(contextPlugin)  // Provides { ctx } with businessId, userId

// Access in handlers:
.get("/", async ({ ctx, customerService }) => {
  // ctx.businessId available
});
```

### 2. Always Use Services Plugin

```typescript
// ✅ CORRECT
.use(servicesPlugin)  // Provides repositories and services

// Access in handlers:
.get("/", async ({ customerService, saleRepo }) => {
  // Services available
});
```

### 3. Use t-schema for Validation

```typescript
// Request body validation
.post("/", handler, {
  body: t.Object({
    name: t.String({ minLength: 1 }),
    email: t.String({ format: "email" }),
    age: t.Optional(t.Number()),
  })
})

// Response validation (optional)
.get("/", handler, {
  response: t.Object({
    success: t.Boolean(),
    data: t.Array(customerSchema),
  })
});
```

### 4. Throw Domain Errors

```typescript
import { NotFoundError, ValidationError, ConflictError } from "../errors";

// Services throw errors; plugin converts to HTTP responses
throw new NotFoundError("Customer");     // → 404
throw new ValidationError("Invalid");    // → 400
throw new ConflictError("Already exists"); // → 409
throw new ForbiddenError("No access");   // → 403
```

### 5. Response Format

All responses use standard format:

```typescript
// Success
return { success: true, data: entity };
return { success: true, data: entityArray };
return { success: true };  // For deletes

// Error (handled by error plugin)
throw new NotFoundError("Customer");
```

## Route Prefixes

| Module | Prefix | Example Endpoint |
|--------|--------|------------------|
| auth.ts | `/auth` | POST /auth/login |
| customers.ts | `/customers` | GET /customers/:id |
| sales.ts | `/sales` | POST /sales |
| products.ts | `/products` | GET /products |
| purchases.ts | `/purchases` | POST /purchases |
| suppliers.ts | `/suppliers` | GET /suppliers |
| payments.ts | `/payments` | POST /payments |
| inventory.ts | `/inventory` | GET /inventory |
| distribuciones.ts | `/distribuciones` | GET /distribuciones |
| sync.ts | `/sync` | POST /sync/batch |
| whatsapp/* | `/whatsapp/*` | GET /whatsapp/templates |

## Special Route Patterns

### Sync Endpoint (Offline Support)

```typescript
// api/sync.ts
export const syncRoutes = new Elysia({ prefix: "/sync" })
  .use(contextPlugin)
  .use(servicesPlugin)
  
  // POST /sync/batch - Process offline operations
  .post("/batch", async ({ body, ctx, syncService }) => {
    const results = await syncService.processBatch(ctx, body.operations);
    return { success: true, data: results };
  })
  
  // GET /sync/changes - Pull server changes
  .get("/changes", async ({ query, ctx, syncService }) => {
    const changes = await syncService.getChanges(ctx, query.since);
    return { success: true, data: changes };
  });
```

### Public Routes (No Auth)

```typescript
// api/public-sales.ts
export const publicSaleRoutes = new Elysia({ prefix: "/public/sales" })
  // No contextPlugin - public access
  .get("/:token", async ({ params, saleService }) => {
    const sale = await saleService.findByToken(params.token);
    return { success: true, data: sale };
  });
```

### File Upload Routes

```typescript
// api/files.ts
.post("/", async ({ body, ctx, fileService }) => {
  const { file } = body;
  const uploaded = await fileService.upload(ctx, file);
  return { success: true, data: uploaded };
}, {
  body: t.Object({
    file: t.File({
      maxSize: "10m",
      types: ["image/png", "image/jpeg"],
    }),
  }),
});
```

## Error Handling

Errors are caught by the global error handler plugin:

```typescript
// plugins/error-handler.ts
app.onError(({ code, error, set }) => {
  if (error instanceof AppError) {
    set.status = error.statusCode;
    return { success: false, error: error.message };
  }
  // ... handle other errors
});
```

## Mounting Routes

Routes are mounted in `src/app.ts`:

```typescript
// app.ts
import { customerRoutes } from "./api/customers";
import { saleRoutes } from "./api/sales";
// ... other imports

export const app = new Elysia()
  .use(errorPlugin)
  .use(authRoutes)
  .use(customerRoutes)
  .use(saleRoutes)
  .use(productRoutes)
  // ... +20 more routes
  .listen(3000);
```

## Important Notes

### DO:
- Always use `contextPlugin` and `servicesPlugin`
- Use t-schema for request validation
- Throw domain errors (NotFoundError, etc.)
- Return `{ success: true, data: ... }` format
- Use route prefixes in `new Elysia({ prefix: "/..." })`

### DON'T:
- Don't manually check auth - use contextPlugin
- Don't return HTTP responses directly - throw errors
- Don't skip validation - always define body/params schemas
- Don't access repos directly - use services

---

*See [Backend AGENTS.md](../../AGENTS.md) for backend overview.*
