# Avileo Architecture

> Technical architecture and patterns for the online-first chicken sales management system.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Package Structure](#package-structure)
4. [Data Flow](#data-flow)
5. [Code Patterns](#code-patterns)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VENDOR DEVICE (Mobile/Tablet)                     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  REACT APP (React Router v7)                                │    │
│  │  ├─ UI Components (shadcn/ui)                               │    │
│  │  ├─ TanStack Query (Server state, caching)                 │    │
│  │  └─ Jotai (Client state, modals)                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  EDEN TREATY API CLIENT                                      │    │
│  │  ├─ Type-safe API calls to Elysia backend                   │    │
│  │  └─ Automatic request/response typing                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  PWA CACHE (Optional)                                        │    │
│  │  ├─ Basic asset caching                                     │    │
│  │  └─ Limited offline resilience                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │      CONNECTION (HTTP/REST)   │
                    │      (Required for operation) │
                    └───────────────┬───────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                         SERVER (Cloud)                               │
│  ├─ API REST (ElysiaJS + Bun)                                       │
│  ├─ PostgreSQL (Neon) - Source of truth                             │
│  └─ Better Auth - Authentication                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Online-First**: Full functionality requires internet connection
2. **Optimistic UI**: Updates UI immediately, confirms with server
3. **Multi-Tenancy**: Single user, multiple businesses
4. **Flexible Modes**: Adaptable to different business models
5. **Unified Sales**: Single `sales` table for both instant sales and pre-orders

---

## Technology Stack

### Frontend (@avileo/app)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Router v7** | latest | Framework (SPA mode) |
| **TypeScript** | 5.x | Static typing |
| **Vite** | 5.x | Build tool |
| **Tailwind CSS** | 3.x | Styling |
| **shadcn/ui** | latest | UI components |
| **TanStack Query** | 5.x | Server state, caching |
| **Jotai** | latest | Client state |
| **Better Auth** | latest | Authentication |
| **Eden Treaty** | latest | Type-safe API client |
| **Framer Motion** | 11.x | Animations |
| **Lucide React** | latest | Icons |

### Backend (@avileo/backend)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Bun** | 1.1.38+ | Runtime |
| **ElysiaJS** | latest | Web framework |
| **Drizzle ORM** | latest | Database ORM |
| **PostgreSQL** | 16.x | Database (Neon) |
| **Better Auth** | latest | Authentication |
| **Zod** | 3.x | Validation |

### Shared (@avileo/shared)

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Shared types |
| **tsup** | Build tool |
| **Zod schemas** | Validation schemas |
| **Decimal transformers** | Backend ↔ UI conversion |

---

## Package Structure

### Monorepo Organization

```
avileo/
├── packages/
│   ├── app/
│   │   ├── app/
│   │   │   ├── routes/          # File-based routing
│   │   │   │   ├── _index.tsx   # Home route
│   │   │   │   ├── _protected.* # Protected routes
│   │   │   │   ├── venta.$slug  # Public catalog
│   │   │   │   └── ...
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/           # Custom hooks
│   │   │   ├── lib/
│   │   │   │   ├── db/          # Zod entity schemas
│   │   │   │   ├── api-client.ts # Eden Treaty client
│   │   │   │   └── ...
│   │   │   └── root.tsx         # Root layout
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/      # Drizzle schema files (25+ tables)
│   │   │   │   │   ├── enums.ts
│   │   │   │   │   ├── businesses.ts
│   │   │   │   │   ├── customers.ts
│   │   │   │   │   ├── sales.ts
│   │   │   │   │   ├── payments.ts
│   │   │   │   │   ├── inventory.ts
│   │   │   │   │   ├── purchases.ts
│   │   │   │   │   ├── suppliers.ts
│   │   │   │   │   └── ...
│   │   │   │   └── lib/
│   │   │   │       └── db.ts    # Database connection
│   │   │   ├── api/             # API routes
│   │   │   ├── services/        # Repository + business layer
│   │   │   │   ├── repository/  # Data access
│   │   │   │   ├── business/    # Business logic
│   │   │   │   └── sync/        # Sync handlers
│   │   │   └── index.ts         # Entry point
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── shared/
│       ├── src/
│       │   ├── schema.ts        # Shared Zod schemas
│       │   └── transformers/    # Decimal transformers
│       ├── package.json
│       └── tsup.config.ts
│
├── package.json                 # Turborepo root
└── turbo.json
```

### Import Patterns

**Backend (relative imports only):**
```typescript
// NO path aliases in backend
import { db } from "./lib/db";
import { users } from "../db/schema/users";
```

**Frontend (path aliases):**
```typescript
// Use ~/* or @/* for app imports
import { Component } from "~/components/Button";
import { useAuth } from "~/hooks/useAuth";
```

**Cross-package:**
```typescript
// Workspace protocol
import type { ApiResponse } from "@avileo/shared";
```

---

## Data Flow

### Sale Creation Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Vendor    │───▶│  React UI   │───▶│   API Call  │───▶│   Elysia    │
│   Action    │    │   Form      │    │  (Eden)     │    │   Backend   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                          │
                                                          ▼
                                                   ┌─────────────┐
                                                   │ PostgreSQL  │
                                                   │   (Neon)    │
                                                   └─────────────┘
```

### Authentication Flow

```
Login (Requires Internet):
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───▶│  Login  │───▶│ Better  │───▶│  JWT    │
│         │    │  Form   │    │  Auth   │    │  Token  │
└─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                   │
                                                   ▼
                                            ┌─────────┐
                                            │  Server │
                                            │  (Neon) │
                                            └─────────┘
```

### Data Fetching Flow (TanStack Query)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  React UI   │───▶│  useQuery   │───▶│  Eden API   │
│             │    │  (cache)    │    │  Client     │
└─────────────┘    └─────────────┘    └──────┬──────┘
       │                                     │
       │         ┌─────────────┐             │
       └────────▶│   Display   │◀────────────┘
                 │   Data      │
                 └─────────────┘
```

---

## Code Patterns

### API Response Pattern

```typescript
import type { ApiResponse } from "@avileo/shared";

// Standard response shape
const response: ApiResponse<User> = {
  success: true,
  data: user,
  error?: string
};

// Backend error response
return new Response(
  JSON.stringify({ success: false, error: "Message" }),
  { status: 400, headers: { "Content-Type": "application/json" } }
);
```

### Backend Route Pattern (ElysiaJS)

```typescript
// packages/backend/src/api/sales.ts
import { Elysia } from "elysia";
import { db } from "../lib/db";
import { sales } from "../db/schema/sales";

export const salesRoutes = new Elysia({ prefix: "/sales" })
  .get("/", async () => {
    const allSales = await db.select().from(sales);
    return { success: true, data: allSales };
  })
  .post("/", async ({ body }) => {
    const newSale = await db.insert(sales).values(body).returning();
    return { success: true, data: newSale[0] };
  });
```

### Frontend Route Pattern (React Router v7)

```typescript
// packages/app/app/routes/sales.tsx
import type { Route } from "./+types/sales";

export function loader({ request }: Route.LoaderArgs) {
  // Loader logic
}

export default function SalesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### Data Fetching Pattern (TanStack Query + Eden)

```typescript
// hooks/use-customers.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await api.customers.get();
      if (error) throw new Error(String(error.value));
      return data as unknown as Customer[];
    },
  });
}
```

### Error Handling Pattern

```typescript
// Backend structured error
return new Response(
  JSON.stringify({
    success: false,
    error: "Invalid sale data",
    code: "SALE_VALIDATION_ERROR"
  }),
  { status: 400, headers: { "Content-Type": "application/json" } }
);

// Frontend error boundary
// See root.tsx for ErrorBoundary pattern
// Handle route errors with isRouteErrorResponse
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
database_url="postgresql://.../db?sslmode=require"

# JWT
JWT_SECRET="min-32-characters-secret-key"

# Server
PORT=3000
FRONTEND_URL="http://localhost:5173"  # CORS origin

# Better Auth
BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

### Database Configuration

**Neon PostgreSQL:**
- Always use `sslmode=require`
- Connection pooling recommended for serverless

---

## Performance Considerations

### Bundle Size
- Tree-shaking with Vite
- Lazy load routes
- Dynamic imports for heavy components

### API Optimization
- TanStack Query caching
- Pagination for large lists
- Optimistic updates

---

## Security

### Authentication
- JWT tokens with 24h expiration
- Refresh token rotation
- Secure httpOnly cookies

### Authorization
- Role-based access control (RBAC)
- Business-scoped queries (WHERE business_id = ?)
- Resource ownership validation

### Data Protection
- Passwords hashed with bcrypt (Better Auth)
- Input validation with Zod
- SQL injection protection (Drizzle ORM)
- XSS protection (React escapes by default)

---

*For database schema details, see [DATABASE.md](DATABASE.md)*
*For business modules, see [MODULES.md](MODULES.md)*
