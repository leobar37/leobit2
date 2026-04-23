# Quick Start

Guide to get `@avileo/drizzle-sync` running in 5 minutes.

## Prerequisites

- Node.js 18+
- Bun or npm
- Drizzle ORM project with PostgreSQL
- React 18+ frontend (optional, for React integration)

## Installation

```bash
npm install @avileo/drizzle-sync
```

Peer dependencies (if not already installed):

```bash
npm install drizzle-orm @electric-sql/pglite react zod
```

## Step 1: Define Sync Config (Backend)

Create `src/sync.config.ts` in your backend:

```typescript
import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import { currency, weight } from "@avileo/drizzle-sync/codecs";
import { customers, sales, saleItems } from "./db/schema";

export const syncConfig = defineSyncConfig({
  entities: {
    customers: {
      table: customers,
      syncable: true,
      conflictResolver: "version-based",
    },
    sales: {
      table: sales,
      syncable: true,
      conflictResolver: "version-based",
      fieldCodecs: {
        total_amount: currency(),
      },
      relations: {
        children: [
          { entity: "sale_items", foreignKey: "sale_id", cascade: true },
        ],
      },
    },
    sale_items: {
      table: saleItems,
      syncable: true,
      conflictResolver: "version-based",
    },
  },
  tenancy: {
    tenantColumn: "business_id",
    tenantField: "businessId",
  },
  options: {
    batchSize: 50,
    maxRetries: 3,
    syncInterval: 30000,
  },
});
```

## Step 2: Generate Schema

Build the sync schema from your config:

```bash
drizzle-sync build-schema -c ./src/sync.config.ts
```

This generates `src/sync.schema.json` which describes all your syncable entities.

## Step 3: Generate Frontend Code

Generate TypeScript types, Zod schemas, SQL DDL, and React hooks:

```bash
drizzle-sync generate -c ./src/sync.config.ts -o ./src/generated
```

Generated files:

| File | Description |
|------|-------------|
| `schemas.ts` | Zod schemas for validation |
| `init.sql` | PostgreSQL DDL for PGlite |
| `hooks.ts` | TanStack Query hooks |
| `services.ts` | BaseService subclasses |
| `types.ts` | TypeScript types |
| `applier.ts` | Column mappings |
| `query-keys.ts` | Cache keys |
| `engine.ts` | Engine factory |

## Step 4: Initialize Client (Frontend)

```typescript
import { createSyncClientEngine } from "@avileo/drizzle-sync/client";
import { initPgliteDatabase } from "@avileo/drizzle-sync/client";

const engine = createSyncClientEngine({
  pg: await initPgliteDatabase(),
  db: drizzle(myPglite),
  tenantId: businessId,
  userId: userId,
  authToken: token,
  apiUrl: "https://api.example.com",
  entities: ["customers", "sales", "sale_items"],
});

await engine.initialize();
await engine.start();
```

## Step 5: Wrap with React Provider

```tsx
import { SyncProvider } from "@avileo/drizzle-sync/react";

function App() {
  return (
    <SyncProvider engine={engine}>
      <YourApp />
    </SyncProvider>
  );
}
```

## Next Steps

- [Architecture Overview](./02-architecture.md) - Understand the system design
- [Backend Configuration](./03-backend-config.md) - Full config reference
- [CLI Reference](./04-cli.md) - All commands and flags
- [Frontend Integration](./05-frontend-react.md) - React hooks and providers
