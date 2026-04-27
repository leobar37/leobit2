# drizzle-sync Documentation

> Drizzle-based offline-first sync library for PostgreSQL (backend) and PGlite (frontend WASM).

## Getting Started

- [Quick Start](./01-quickstart.md) — Get running in 5 minutes
- [Architecture](./02-architecture.md) — System design and data flow overview

## Understanding

- [Concepts](./06-concepts.md) — Deep dive into sync mechanics: operations, coalescing, staged sync, conflicts, DLQ, self-healing, multi-tenancy

## Extending

- [Advanced](./08-advanced.md) — Custom codecs, conflict resolvers, manual sync control, offline detection, event system, batch tuning, troubleshooting

## Reference

- [Backend Configuration](./03-backend-config.md) — Server-side config reference
- [CLI](./04-cli.md) — All commands and flags
- [Frontend React](./05-frontend-react.md) — React hooks and provider
- [API Reference](./07-api-reference.md) — Complete API documentation
- [Configuration](./09-configuration.md) — Full configuration reference
- [File Handling](./10-file-handling.md) — File upload/download in sync
- [Migration v2](./11-migration-v2.md) — Upgrading from v1 to v2

---

## Quick Reference

### Install

```bash
npm install @avileo/drizzle-sync
```

### Basic Config (Backend)

```typescript
import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import { currency } from "@avileo/drizzle-sync/codecs";

export const syncConfig = defineSyncConfig({
  entities: {
    sales: {
      table: salesTable,
      syncable: true,
      fieldCodecs: { total_amount: currency() },
      relations: { children: [{ entity: "sale_items", foreignKey: "sale_id" }] },
    },
  },
  tenancy: { tenantColumn: "business_id", tenantField: "businessId" },
});
```

### Initialize Client (Frontend)

```typescript
import { SyncProvider } from "@avileo/drizzle-sync/react";

<SyncProvider engine={engine}>
  <App />
</SyncProvider>
```

### Sync State in React

```typescript
import { useSyncState, useSyncStatus } from "@avileo/drizzle-sync/react";

const { isSyncing, pendingCount } = useSyncState();
const { hasConflicts, hasFailed } = useSyncStatus();
```
