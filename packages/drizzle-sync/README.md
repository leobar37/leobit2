# @avileo/drizzle-sync

**Drizzle-first offline sync engine for PostgreSQL → PGlite.**

Offline-first sync library with bidirectional sync, conflict resolution, and React integration. Define your schema once in Drizzle, generate types, hooks, and SQL automatically.

## Install

```bash
npm install @avileo/drizzle-sync
```

Peer dependencies:

```bash
npm install drizzle-orm @electric-sql/pglite react zod
```

## What is this?

`@avileo/drizzle-sync` enables offline-first applications by syncing a local PGlite (PostgreSQL in WASM) database with a remote PostgreSQL server via a custom REST API.

**Key features:**
- Bidirectional sync (push/pull) with operation queue
- Version-based conflict resolution (server-wins, client-wins, merge)
- Staged initial sync (CRITICAL → RECENT_SALES → HISTORICAL)
- Code generation from Drizzle schema → types, Zod schemas, SQL DDL, React hooks
- Multi-tenancy out of the box
- Dead letter queue for failed operations
- Self-healing for certain error types

## Quick Start

```bash
# 1. Define sync config (backend)
cat > src/sync.config.ts << 'EOF'
import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import { currency } from "@avileo/drizzle-sync/codecs";
import { customers, sales } from "./db/schema";

export const syncConfig = defineSyncConfig({
  entities: {
    customers: { table: customers, syncable: true },
    sales: {
      table: sales,
      syncable: true,
      fieldCodecs: { total_amount: currency() },
      relations: { children: [{ entity: "sale_items", foreignKey: "sale_id" }] },
    },
  },
  tenancy: { tenantColumn: "business_id", tenantField: "businessId" },
});
EOF

# 2. Generate schema + frontend code
drizzle-sync build-schema
drizzle-sync generate -o ./src/generated
```

```tsx
// 3. Use in React
import { SyncProvider, useSyncState } from "@avileo/drizzle-sync/react";

<SyncProvider engine={engine}>
  <App />
</SyncProvider>

// 4. Get sync status
function SyncIndicator() {
  const { isSyncing, isOnline, pendingCount } = useSyncState();
  return <span>{isOnline ? "🟢" : "🔴"} {pendingCount} pending</span>;
}
```

## Documentation

| Doc | Description |
|-----|-------------|
| [Quick Start](./docs/01-quickstart.md) | 5-minute setup guide |
| [Architecture](./docs/02-architecture.md) | System design and submodules |
| [Backend Config](./docs/03-backend-config.md) | `defineSyncConfig()` reference |
| [CLI Reference](./docs/04-cli.md) | Commands, flags, and generation |
| [Frontend React](./docs/05-frontend-react.md) | Hooks, providers, and usage |
| [Concepts](./docs/06-concepts.md) | Push/pull, conflicts, DLQ, staged sync |
| [API Reference](./docs/07-api-reference.md) | All exports by submodule |
| [Advanced](./docs/08-advanced.md) | Custom codecs, resolvers, events |
| [Configuration](./docs/09-configuration.md) | Full interface reference |

## Architecture

```
@avileo/drizzle-sync
├── /core      - Types & interfaces (no platform deps)
├── /shared    - Constants (OPERATION_STATUS, PULL_STAGES, etc.)
├── /config    - Config builder + code generator
├── /server    - PostgreSQL sync engine (backend)
├── /pglite    - PGlite adapters (frontend)
├── /client    - Framework-agnostic client engine
├── /react     - React hooks + provider
├── /codecs    - Field codecs (currency, weight, dateOnly)
└── /cli       - CLI entry point
```

## CLI

```bash
# Build schema from config
drizzle-sync build-schema -c ./src/sync.config.ts

# Generate frontend code
drizzle-sync generate -o ./src/generated

# Validate schema
drizzle-sync validate

# Clean generated files
drizzle-sync clean -o ./src/generated
```

## License

MIT
