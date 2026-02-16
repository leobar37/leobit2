# AGENTS.md - Local Database Layer

> **Context file for AI agents working on the Avileo offline-first data layer**

## Overview

The `app/lib/db/` directory contains the **local data layer** for Avileo's offline-first architecture. It provides TypeScript entity definitions, data operation functions, and a sync provider that enables the app to work without internet connectivity. Data is synchronized with the backend when online.

This layer is part of a larger sync architecture that includes:
- **Schema validation** (Zod) - Type-safe entity definitions
- **Collection operations** - CRUD functions with offline support
- **Sync engine** (`lib/sync/`) - IndexedDB-based queue and background sync
- **React integration** - Hooks and context providers

## Project Type & Stack

| Aspect | Technology |
|--------|------------|
| **Type** | TypeScript data layer with offline-first support |
| **Language** | TypeScript 5.9+ |
| **Validation** | Zod v4 |
| **API Client** | Eden Treaty (@elysiajs/eden) |
| **Storage** | IndexedDB (via native API) |
| **State Management** | TanStack Query (React Query) v5 |

### Key Dependencies

```typescript
// Validation
zod

// API Client (type-safe)
@elysiajs/eden

// React Query (server state)
@tanstack/react-query

// Sync utilities (internal)
~/lib/sync/client
~/lib/sync/queue
~/lib/sync/storage
~/lib/sync/utils
```

## Architecture

### Offline-First Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                        │
│              (useCustomers, useSales hooks)                 │
├─────────────────────────────────────────────────────────────┤
│                     TanStack Query                          │
│         (caching, stale-while-revalidate)                   │
├─────────────────────────────────────────────────────────────┤
│                   Collection Functions                      │
│         (createCustomer, updateSale, etc.)                  │
│                                                             │
│   ┌─────────────┐           ┌─────────────┐                │
│   │   ONLINE    │           │   OFFLINE   │                │
│   │  API call   │           │  IndexedDB  │                │
│   │  (Eden)     │           │  enqueue()  │                │
│   └─────────────┘           └─────────────┘                │
├─────────────────────────────────────────────────────────────┤
│                    Sync Engine (lib/sync)                   │
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │    Queue    │───▶│   Client    │───▶│  Batch API  │    │
│   │ (IndexedDB) │    │  (30s sync) │    │   (/sync)   │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
app/lib/
├── db/                          # Local data layer (this directory)
│   ├── index.ts                 # Barrel exports
│   ├── schema.ts                # Zod entity schemas & types
│   ├── collections.ts           # Data operation functions
│   └── electric-client.tsx      # Sync context provider
│
└── sync/                        # Sync engine (related)
    ├── client.ts                # SyncClient class (singleton)
    ├── queue.ts                 # IndexedDB operations queue
    ├── storage.ts               # localStorage for sync cursors
    └── utils.ts                 # createSyncId, isOnline helpers
```

## Coding Patterns & Conventions

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| **Files** | kebab-case.ts | `schema.ts`, `collections.ts` |
| **Zod Schemas** | camelCase with Schema suffix | `customerSchema`, `saleSchema` |
| **Types** | PascalCase | `Customer`, `Sale`, `Payment` |
| **Functions** | camelCase verb-noun | `createCustomer`, `loadProducts` |
| **Load functions** | load + Entity (plural) | `loadCustomers`, `loadSales` |
| **Create functions** | create + Entity | `createCustomer`, `createPayment` |

### Schema Pattern (Zod)

```typescript
// 1. Define schema with Zod
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  // ... other fields
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),  // Coerce strings to Date
  updatedAt: z.coerce.date(),
});

// 2. Export inferred type
export type Customer = z.infer<typeof customerSchema>;

// 3. Use for runtime validation (optional)
const result = customerSchema.safeParse(apiData);
```

### Collection Operation Pattern

**Offline-First CRUD**: Every write operation checks online status and either:
- **Online**: Direct API call via Eden Treaty
- **Offline**: Queue operation in IndexedDB, return optimistic result

```typescript
// Example: createCustomer pattern
export async function createCustomer(data: CreateCustomerInput): Promise<Customer> {
  // 1. Check if online
  if (!isOnline()) {
    // 2. Generate temp ID for optimistic UI
    const tempId = createSyncId();
    
    // 3. Queue operation for later sync
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "insert",
      entityId: tempId,
      data,
      lastError: undefined,
    });
    
    // 4. Return optimistic result
    return {
      id: tempId,
      ...data,
      businessId: "",  // Will be filled by backend
      syncStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  // 5. Online: direct API call
  const response = await api.customers.post(data);
  if (response.error) throw new Error(String(response.error.value));
  return (response.data as unknown as Customer);
}
```

### Read Operation Pattern

```typescript
// Load functions return cached data via TanStack Query
export async function loadCustomers(): Promise<Customer[]> {
  const { data, error } = await api.customers.get();
  if (error) throw new Error(String(error.value));
  return (data as unknown as Customer[]) || [];
}

// Used in hooks with stale-while-revalidate caching
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: loadCustomers,
    staleTime: 1000 * 60 * 5,  // 5 minutes
  });
}
```

### Update Operation Pattern

```typescript
// Partial updates with offline support
export async function updateCustomer(
  id: string, 
  data: Partial<Customer>
): Promise<Customer> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "update",
      entityId: id,
      data,
      lastError: undefined,
    });
    
    // Return merged optimistic result
    return {
      id,
      name: data.name ?? "",
      dni: data.dni ?? null,
      // ... merge with defaults
      syncStatus: "pending",
      updatedAt: new Date(),
    };
  }
  
  // Filter undefined values before sending
  const response = await api.customers({ id }).put({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.dni !== undefined && { dni: data.dni ?? undefined }),
    // ... conditional spread
  });
  
  if (response.error) throw new Error(String(response.error.value));
  return (response.data as unknown as Customer);
}
```

### Sync Status Pattern

Entities that need offline sync support include these fields:

```typescript
{
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
}
```

**Sync Status Values:**
- `"pending"` - Created/updated offline, waiting to sync
- `"synced"` - Confirmed synced with backend
- `"error"` - Sync failed after retries

### Entity Types Supported

| Entity | Zod Schema | Syncable | Operations |
|--------|-----------|----------|------------|
| `Customer` | `customerSchema` | ✅ Yes | load, create, update, delete |
| `Product` | `productSchema` | ❌ No | load only (read-only cache) |
| `Payment` | `paymentSchema` | ✅ Yes | load, create, delete |
| `Sale` | `saleSchema` | ✅ Yes | Full CRUD (via separate hooks) |
| `SaleItem` | `saleItemSchema` | ✅ Yes | Nested in Sale operations |
| `SyncOperation` | `syncOperationSchema` | Internal | Queue management |

### ElectricProvider Pattern

The `ElectricProvider` wraps the app to provide sync status context:

```typescript
// In routes/_protected.tsx
import { ElectricProvider } from "~/lib/db/electric-client";

export default function ProtectedLayout() {
  return (
    <ElectricProvider>
      {/* App content */}
    </ElectricProvider>
  );
}

// Use sync status in components
import { useElectric } from "~/lib/db/electric-client";

function SyncStatus() {
  const { isConnected, isSyncing, forceSync } = useElectric();
  
  return (
    <button onClick={forceSync} disabled={isSyncing}>
      {isSyncing ? "Syncing..." : isConnected ? "Online" : "Offline"}
    </button>
  );
}
```

## Key Files

| File | Purpose |
|------|---------|
| `schema.ts` | Zod schemas for all entities (Customer, Sale, Product, Payment, etc.) and their TypeScript types |
| `collections.ts` | Data operation functions with offline-first support (createCustomer, updateCustomer, loadProducts, etc.) |
| `electric-client.tsx` | React context provider exposing sync state (isConnected, isSyncing, forceSync) |
| `index.ts` | Barrel exports for clean imports |

## Integration with Sync Engine

### Sync Queue (IndexedDB)

Operations are stored in IndexedDB with this structure:

```typescript
interface QueueOperation extends SyncOperation {
  status: "pending" | "processed" | "failed";
  retryCount: number;
  createdAt: number;
  updatedAt: number;
}
```

**Sync Flow:**
1. Offline write → `enqueue()` → IndexedDB store
2. Every 30 seconds (when online) → `runSyncCycle()`
3. Batch up to 50 operations → POST to `/api/sync/batch`
4. Process results → `markProcessed()` or `markFailed()`
5. Pull changes → GET `/api/sync/changes?since={cursor}`

### Network Detection

```typescript
import { isOnline } from "~/lib/sync/utils";

// Uses navigator.onLine with SSR fallback
if (isOnline()) {
  // Make direct API call
} else {
  // Queue for later
}

// Also handles online/offline events
window.addEventListener("online", handleOnline);
window.addEventListener("offline", handleOffline);
```

## Important Notes for Agents

### Critical Patterns

#### 1. Always Check Online Status for Writes

```typescript
// CORRECT: Every write operation checks online status
if (!isOnline()) {
  await syncClient.enqueueOperation({ ... });
  return optimisticResult;
}
// ... make API call

// WRONG: Assuming online and calling API directly
const response = await api.customers.post(data); // Will fail when offline
```

#### 2. Eden Treaty Type Casting

Eden Treaty returns typed data, but often needs casting to match Zod types:

```typescript
// Always cast when returning from API
return (data as unknown as Customer[]);

// Check error properly
if (error) throw new Error(String(error.value));
```

#### 3. Sync Entity Names

When enqueuing operations, use these exact entity strings:

```typescript
entity: "customers"    // For Customer operations
entity: "sales"        // For Sale operations
entity: "sale_items"   // For SaleItem operations
entity: "abonos"       // For Payment operations (Spanish in backend)
entity: "distribuciones" // For Distribution operations
```

#### 4. Optimistic Updates

When offline, always return a complete entity with:
- `syncStatus: "pending"` - Shows it needs sync
- Temporary `id` from `createSyncId()` - Will be replaced on sync
- Current timestamps - For sorting/display

### DO's ✅

- Use Zod schemas for all entity types
- Always handle offline state in write operations
- Use `createSyncId()` for temporary IDs when offline
- Include `syncStatus` field in syncable entities
- Cast Eden Treaty responses with `as unknown as Type`
- Use `Partial<Entity>` for update functions
- Invalidate TanStack Query cache on mutations

### DON'Ts ❌

- Don't skip `isOnline()` check in collection functions
- Don't forget to handle `error.value` from Eden Treaty
- Don't use hardcoded IDs - always use `createSyncId()` for offline operations
- Don't modify sync engine files directly - use `syncClient` methods
- Don't forget to include `businessId` placeholder in optimistic results

### Date Handling

Dates from API are ISO strings, converted via `z.coerce.date()`:

```typescript
// Schema handles conversion automatically
createdAt: z.coerce.date(),

// When creating optimistic results, use Date objects
return {
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Error Handling

```typescript
// Eden Treaty errors
if (response.error) {
  throw new Error(String(response.error.value));
}

// Include error info in sync queue
await syncClient.enqueueOperation({
  ...operation,
  lastError: undefined,  // Set on failure
});
```

## Dependencies

### Internal

| Module | Path | Purpose |
|--------|------|---------|
| `api-client` | `~/lib/api-client` | Eden Treaty API instance |
| `sync/client` | `~/lib/sync/client` | SyncClient singleton |
| `sync/utils` | `~/lib/sync/utils` | `createSyncId()`, `isOnline()` |

### External

| Library | Version | Purpose |
|---------|---------|---------|
| `zod` | ^4.3.6 | Runtime type validation |
| `@elysiajs/eden` | ^1.4.8 | Type-safe API client |
| `@tanstack/react-query` | ^5.90.21 | Server state caching |

## Related Documentation

- [Root AGENTS.md](../../AGENTS.md) - Project-wide context
- [App AGENTS.md](../AGENTS.md) - Frontend package overview
- [Sync Engine](../sync/) - IndexedDB queue and background sync
- [Hooks](../../hooks/) - React hooks using these collections

## Migration Notes

### From direct API calls to offline-first

**Before (direct API):**
```typescript
const { data } = await api.customers.post(input);
```

**After (offline-first):**
```typescript
import { createCustomer } from "~/lib/db/collections";

// Handles both online and offline automatically
const customer = await createCustomer(input);
```

### Adding a New Syncable Entity

1. Add Zod schema to `schema.ts`
2. Add CRUD functions to `collections.ts` with offline checks
3. Add hook in `hooks/use-{entity}.ts`
4. Add entity name to `SyncOperation["entity"]` union type
