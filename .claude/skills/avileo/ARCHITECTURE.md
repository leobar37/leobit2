# Avileo Architecture

> Technical architecture and patterns for the offline-first chicken sales management system.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Offline-First Design](#offline-first-design)
3. [Technology Stack](#technology-stack)
4. [Package Structure](#package-structure)
5. [Data Flow](#data-flow)
6. [Code Patterns](#code-patterns)

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
│  │  ├─ TanStack Query (HTTP cache)                            │    │
│  │  └─ TanStack DB (Reactive state)                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  TANSTACK DB COLLECTIONS                                     │    │
│  │  ├─ ventasCollection                                         │    │
│  │  ├─ clientesCollection                                       │    │
│  │  ├─ inventarioCollection                                     │    │
│  │  └─ syncQueueCollection (Operation queue)                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  INDEXEDDB (Local Persistence)                              │    │
│  │  ├─ Auto-saves collections                                  │    │
│  │  ├─ Loads on app startup                                    │    │
│  │  └─ Capacity: ~50-100 MB per origin                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  SYNC ENGINE (Custom Implementation)                        │    │
│  │  ├─ Detects collection changes                              │    │
│  │  ├─ Online: sends to server                                 │    │
│  │  ├─ Offline: saves to queue                                 │    │
│  │  └─ Exponential backoff retry                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │      CONNECTION (HTTP/REST)   │
                    │      (When available)         │
                    └───────────────┬───────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                         SERVER (Cloud)                               │
│  ├─ API REST (ElysiaJS + Bun)                                       │
│  ├─ PostgreSQL (Neon) - Source of truth                             │
│  └─ WebSocket optional (real-time sync)                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Offline-First**: App works without internet by default
2. **Optimistic UI**: Updates UI immediately, syncs in background
3. **Eventual Consistency**: Data converges when connectivity returns
4. **Multi-Tenancy**: Single user, multiple businesses
5. **Flexible Modes**: Adaptable to different business models

---

## Offline-First Design

### Core Concept

The application is designed to function **100% without internet**. Network connectivity is treated as an enhancement, not a requirement.

### Data Storage Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **UI State** | React + TanStack DB | Reactive collections |
| **Local Cache** | TanStack Query | HTTP response cache |
| **Persistent Storage** | IndexedDB + idb-keyval | Long-term local storage |
| **Sync Queue** | Custom Sync Engine | Pending operations |

### Offline Data Flow

```
VENDOR MAKES A SALE (No Internet)

1. Completes sale form
2. Clicks "Register"
        ↓
3. TanStack DB saves to memory (UI updates)
        ↓
4. IndexedDB persists locally (automatic)
        ↓
5. SyncEngine detects: NO internet
        ↓
6. Saves to pending operations queue
        ↓
7. Shows: "✅ Sale saved. Will sync later."

─────────────────────────────────────────

WHEN INTERNET RETURNS

1. Browser detects 'online' event
2. SyncEngine.processQueue() runs
3. Sends pending operations (FIFO order)
4. Server confirms each operation
5. Updates status to 'synced'
6. UI shows: "🟢 Synchronized"
```

### Sync Strategy

**Retry Strategy (Exponential Backoff):**
```
Attempt 1: Immediate
Attempt 2: After 2 seconds
Attempt 3: After 4 seconds
Attempt 4: After 8 seconds
Maximum: 3-5 attempts, then mark as error
```

**Conflict Resolution:**
- Strategy: "Last write wins"
- Notification shown when conflict detected
- Manual resolution for critical conflicts

### Offline Duration Support

| Scenario | Offline Duration | Data Stored |
|----------|-----------------|-------------|
| Normal operation | Full days | ~10-20 sales/day = < 1 MB |
| High demand | 1 week | ~100 sales = ~5 MB |
| Technical limit | ~1 month | 50-100 MB (IndexedDB limit) |

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
| **TanStack DB** | latest | Reactive collections |
| **TanStack Query** | 5.x | HTTP cache |
| **Better Auth** | latest | Authentication |
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
│   │   │   │   ├── sales.tsx    # Sales routes
│   │   │   │   └── ...
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/           # Custom hooks
│   │   │   ├── lib/             # Utilities
│   │   │   └── root.tsx         # Root layout
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/      # Drizzle schema files
│   │   │   │   │   ├── enums.ts
│   │   │   │   │   ├── user-profiles.ts
│   │   │   │   │   ├── businesses.ts
│   │   │   │   │   ├── customers.ts
│   │   │   │   │   ├── sales.ts
│   │   │   │   │   ├── payments.ts
│   │   │   │   │   ├── inventory.ts
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── relations.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── lib/
│   │   │   │       └── db.ts    # Database connection
│   │   │   ├── routes/          # API routes
│   │   │   └── index.ts         # Entry point
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── shared/
│       ├── src/
│       │   └── index.ts         # Shared types & exports
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
```

**Cross-package:**
```typescript
// Workspace protocol
import type { ApiResponse } from "@avileo/shared";
```

---

## Data Flow

### Sale Creation Flow (Offline)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Vendor    │───▶│  React UI   │───▶│ TanStack DB │───▶│  IndexedDB  │
│   Action    │    │   Form      │    │  Collection │    │  Storage    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                          │
                                                          ▼
                                                   ┌─────────────┐
                                                   │  Sync Queue │
                                                   │  (pending)  │
                                                   └─────────────┘
```

### Sync Flow (When Online)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Sync Queue  │───▶│   Sync      │───▶│   Elysia    │───▶│ PostgreSQL  │
│ (pending)   │    │   Engine    │    │   API       │    │   (Neon)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                                                       │
       │         ┌─────────────┐                               │
       └────────▶│   Update    │◀──────────────────────────────┘
                 │   Status    │
                 │  (synced)   │
                 └─────────────┘
```

### Authentication Flow

```
First Login (Requires Internet):
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───▶│  Login  │───▶│ Better  │───▶│  JWT    │
│         │    │  Form   │    │  Auth   │    │  Token  │
└─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                   │
                                                   ▼
                                            ┌─────────┐
                                            │ IndexedDB
                                            │ (cache) │
                                            └─────────┘

Subsequent Access (Offline):
┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───▶│  Check  │───▶│  JWT    │
│         │    │  Cache  │    │  Valid  │
└─────────┘    └─────────┘    └────┬────┘
                                   │
                                   ▼
                            ┌─────────┐
                            │  Allow  │
                            │  Access │
                            └─────────┘
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
// packages/backend/src/routes/sales.ts
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

### Offline Collection Pattern

```typescript
// Using TanStack DB for reactive offline collections
import { collection } from "@tanstack/db";

const ventasCollection = collection({
  id: "ventas",
  schema: ventaSchema,
  persistence: {
    type: "indexeddb",
    dbName: "avileo-db",
  },
  sync: {
    enabled: true,
    endpoint: "/api/sales",
    strategy: "queue", // Queue when offline
  },
});
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
database_url="postgresql://user:pass@host.neon.tech/db?sslmode=require"

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
- Read replicas for reporting queries

---

## Performance Considerations

### Offline Storage Limits
- IndexedDB: 50-100 MB per origin
- Sufficient for weeks of operation
- Automatic cleanup of synced data (configurable)

### Sync Optimization
- Batch operations when possible
- Compression for large payloads
- Delta sync (only changed fields)

### Bundle Size
- Tree-shaking with Vite
- Lazy load routes
- Dynamic imports for heavy components

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
- Passwords hashed with bcrypt
- Input validation with Zod
- SQL injection protection (Drizzle ORM)
- XSS protection (React escapes by default)

---

*For database schema details, see [DATABASE.md](DATABASE.md)*
*For business modules, see [MODULES.md](MODULES.md)*
