<!--
This file is auto-generated from AGENTS.md
Do not edit directly - edit AGENTS.md instead
 -->
# AGENTS.md - Sync Engine

> **ElectricSQL + PGLite sync layer for offline-first architecture**

## Overview

The `app/lib/sync/` directory contains the sync engine that enables Avileo's offline-first architecture. It uses ElectricSQL with PGLite (PostgreSQL in WASM) for local database storage and background synchronization with the backend.

## Architecture

### Sync Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                        │
│              (useLiveQuery, sync hooks)                     │
├─────────────────────────────────────────────────────────────┤
│                  TanStack Query (Cache)                     │
├─────────────────────────────────────────────────────────────┤
│                  Sync Service Layer                         │
│         (sync-service.ts, shape management)                 │
├─────────────────────────────────────────────────────────────┤
│                     ElectricSQL                             │
│              (PGlite WASM + sync client)                    │
├─────────────────────────────────────────────────────────────┤
│                     PGLite (Local DB)                       │
│                 (IndexedDB persistence)                     │
├─────────────────────────────────────────────────────────────┤
│                     Sync Engine                             │
│         (shape subscription, conflict resolution)           │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
app/lib/sync/
├── index.ts                    # Barrel exports
├── sync-service.ts             # Main sync service class
├── config.ts                   # Sync configuration & constants
├── shape-config.ts             # ElectricSQL shape definitions
├── sync-shapes.ts              # Shape subscription management
└── service-provider.tsx        # React context provider
```

## Key Concepts

### Shapes

Shapes define what data to sync from the server:

```typescript
// shape-config.ts
export const SHAPES = {
  customers: {
    table: "customers",
    where: `business_id = '${businessId}'`,
    columns: ["id", "name", "dni", "phone", "sync_status"],
  },
  sales: {
    table: "sales",
    where: `business_id = '${businessId}'`,
    columns: ["id", "customer_id", "total", "status", "created_at"],
  },
  products: {
    table: "products",
    where: `business_id = '${businessId}'`,
    columns: ["id", "name", "price", "unit_id"],
  },
} as const;
```

### Sync Service

```typescript
// sync-service.ts
export class SyncService {
  private electric: ElectricClient;
  private shapes: Map<string, ShapeSubscription>;

  async initialize(businessId: string) {
    // Initialize PGLite
    this.pglite = new PGlite("idb://avileo-db");
    
    // Connect to Electric
    this.electric = await electrify(this.pglite, schema);
    
    // Subscribe to shapes
    await this.subscribeToShapes(businessId);
  }

  async subscribeToShapes(businessId: string) {
    for (const [name, config] of Object.entries(SHAPES)) {
      const shape = await this.electric.syncShape({
        ...config,
        where: config.where.replace("${businessId}", businessId),
      });
      this.shapes.set(name, shape);
    }
  }

  async forceSync() {
    // Trigger immediate sync
    await this.electric.sync();
  }

  get isConnected() {
    return this.electric.isConnected;
  }
}
```

### Live Queries

Components use live queries for real-time updates:

```typescript
// hooks/use-customers-live.ts
import { useLiveQuery } from "@electric-sql/react";

export function useCustomersLive() {
  const { results, error } = useLiveQuery(
    db.customers.liveUnique({ where: { sync_status: "pending" } })
  );

  return {
    customers: results || [],
    isLoading: !results && !error,
    error,
  };
}
```

## Sync Configuration

```typescript
// config.ts
export const SYNC_CONFIG = {
  // Sync interval (30 seconds)
  SYNC_INTERVAL: 30 * 1000,
  
  // Batch size for operations
  BATCH_SIZE: 50,
  
  // Retry attempts for failed operations
  MAX_RETRY_ATTEMPTS: 3,
  
  // IndexedDB name
  DB_NAME: "avileo-pglite",
  
  // Shape refresh interval
  SHAPE_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const;
```

## Service Provider

Wrap app with sync provider:

```typescript
// service-provider.tsx
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncService] = useState(() => new SyncService());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    syncService.initialize(businessId).then(() => setIsReady(true));
  }, [businessId]);

  return (
    <SyncContext.Provider value={syncService}>
      {isReady ? children : <LoadingSpinner />}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);
```

## Offline Write Pattern

When offline, writes go to PGLite and sync later:

```typescript
// In a component or hook
const handleCreateCustomer = async (data: CreateCustomerInput) => {
  if (!syncService.isConnected) {
    // Offline: Write to PGLite with pending status
    const tempId = createId();
    await db.customers.insert({
      id: tempId,
      ...data,
      sync_status: "pending",
      created_at: new Date(),
    });
    return { id: tempId, pending: true };
  }
  
  // Online: Direct API call
  const response = await api.customers.post(data);
  return response.data;
};
```

## Sync Status UI

Show sync state to users:

```typescript
function SyncStatusIndicator() {
  const sync = useSync();
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
      sync.isConnected 
        ? "bg-green-100 text-green-700" 
        : "bg-orange-100 text-orange-700"
    )}>
      {sync.isConnected ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Sincronizado</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Sin conexión</span>
        </>
      )}
    </div>
  );
}
```

## Important Notes

### DO:
- Always check `syncService.isConnected` before API calls
- Use `sync_status` field to track pending changes
- Subscribe to shapes for real-time updates
- Handle sync errors gracefully
- Show sync status in UI

### DON'T:
- Don't call API directly when offline
- Don't forget to initialize sync service before queries
- Don't subscribe to shapes without businessId filter
- Don't ignore sync errors - show to user

---

*See [App AGENTS.md](../../AGENTS.md) for frontend overview.*
