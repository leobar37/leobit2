---
name: pglite-sync-migration
description: Migrate from TanStack DB to PGlite with Electric SQL sync for offline-first applications. Use when transitioning from TanStack DB collections to PGlite, implementing sync engines with @electric-sql/pglite-sync, creating offline-first PostgreSQL architectures, or building reconciliation algorithms for local-first apps.
keywords: pglite, tanstack-db, electric-sql, offline-first, sync-engine, migration, reconciliation, local-database, indexeddb
---

# PGlite Sync Migration Skill

> **Migrate from TanStack DB to PGlite + Electric SQL for robust offline-first PostgreSQL sync**

## Overview

This skill guides migrating from TanStack DB architecture to PGlite with Electric SQL sync. PGlite provides a PostgreSQL database that runs in the browser using WebAssembly, enabling complex queries, transactions, and full SQL support while maintaining offline-first capabilities.

## When to Use This Skill

- **Migrating from TanStack DB** to PGlite
- **Implementing Electric SQL sync** with PGlite
- **Building offline-first apps** with PostgreSQL semantics
- **Creating custom sync engines** with reconciliation
- **Needing complex SQL queries** in the browser

## Architecture Comparison

### Before: TanStack DB + Electric
```
┌─────────────────────────────────────────────┐
│  React Components                           │
│  └─ useLiveQuery (TanStack DB)              │
├─────────────────────────────────────────────┤
│  TanStack DB Collections                    │
│  ├─ createCollection()                      │
│  ├─ @tanstack/electric-db-collection        │
│  └─ In-memory reactive state                │
├─────────────────────────────────────────────┤
│  Electric SQL Sync                          │
│  └─ Shape streams to memory                 │
└─────────────────────────────────────────────┘
```

### After: PGlite + Electric Sync
```
┌─────────────────────────────────────────────┐
│  React Components                           │
│  └─ useLiveQuery (PGlite hooks)             │
├─────────────────────────────────────────────┤
│  PGlite Database (WebAssembly PostgreSQL)   │
│  ├─ Full SQL support                        │
│  ├─ Transactions                            │
│  ├─ Indexes                                 │
│  └─ Stored in IndexedDB                     │
├─────────────────────────────────────────────┤
│  @electric-sql/pglite-sync                  │
│  ├─ syncShapeToTable()                      │
│  ├─ syncShapesToTables()                    │
│  └─ Bidirectional sync (read now, write WIP)│
├─────────────────────────────────────────────┤
│  Custom Sync Engine (for writes)            │
│  ├─ Operation queue                         │
│  ├─ Conflict resolution                     │
│  └─ Reconciliation                          │
└─────────────────────────────────────────────┘
```

## Migration Steps

### Step 1: Install Dependencies

```bash
# Remove TanStack DB packages
npm uninstall @tanstack/react-db @tanstack/electric-db-collection

# Install PGlite with sync
npm install @electric-sql/pglite @electric-sql/pglite-sync

# Optional: React hooks for PGlite
npm install @electric-sql/react
```

### Step 2: Create PGlite Instance with Sync

```typescript
// engine/db.ts
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";

// Singleton promise to prevent race conditions
let pgPromise: Promise<PGlite> | null = null;

export async function getPGlite(): Promise<PGlite> {
  if (!pgPromise) {
    pgPromise = PGlite.create({
      dataDir: "idb://avileo-pg", // IndexedDB storage
      extensions: {
        electric: electricSync(),
      },
    });
  }
  return pgPromise;
}

// Initialize database schema
export async function initSchema(pg: PGlite): Promise<void> {
  await pg.exec(`
    -- Enable Electric sync metadata schema
    CREATE SCHEMA IF NOT EXISTS electric;
    
    -- Customers table
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dni TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT,
      business_id TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Sales table
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      seller_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      sale_type TEXT NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      amount_paid DECIMAL(12,2) DEFAULT 0,
      balance_due DECIMAL(12,2) DEFAULT 0,
      status TEXT DEFAULT 'draft',
      sync_status TEXT DEFAULT 'pending',
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Payments (abonos) table
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      seller_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      sync_status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Purchases table
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      purchase_date DATE NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      sync_status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
    CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_sync_status ON customers(sync_status);
    CREATE INDEX IF NOT EXISTS idx_sync_status_sales ON sales(sync_status);
  `);
}
```

### Step 3: Create Sync Provider

```typescript
// engine/sync-provider.tsx
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { getPGlite, initSchema } from "./db";
import { syncShapes } from "./sync-shapes";
import { initSyncEngine } from "./sync-engine";

interface SyncContextType {
  isReady: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  error: Error | null;
  pg: PGlite | null;
  forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isReady: false,
  isConnected: false,
  isSyncing: false,
  error: null,
  pg: null,
  forceSync: async () => {},
});

export function SyncProvider({ 
  children,
  businessId,
  authToken 
}: { 
  children: ReactNode;
  businessId: string;
  authToken: string;
}) {
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pg, setPg] = useState<PGlite | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function init() {
      try {
        const pgInstance = await getPGlite();
        
        if (!mounted) return;
        
        await initSchema(pgInstance);
        setPg(pgInstance);
        setIsReady(true);
        setIsConnected(true);

        // Start shape sync (read-only from server)
        const syncResult = await syncShapes(pgInstance, businessId, authToken);
        unsubscribe = syncResult.unsubscribe;

        // Start custom sync engine (for writes to server)
        initSyncEngine(pgInstance, businessId, authToken);
        
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [businessId, authToken]);

  const forceSync = async () => {
    if (!pg) return;
    setIsSyncing(true);
    try {
      // Trigger sync engine manually
      await triggerPendingSync(pg, businessId, authToken);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SyncContext.Provider 
      value={{ isReady, isConnected, isSyncing, error, pg, forceSync }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
```

### Step 4: Configure Electric Sync Shapes

```typescript
// engine/sync-shapes.ts
import type { PGlite } from "@electric-sql/pglite";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

export async function syncShapes(
  pg: PGlite,
  businessId: string,
  authToken: string
) {
  // Multi-table sync for transactional consistency
  const sync = await pg.electric.syncShapesToTables({
    shapes: {
      customers: {
        shape: {
          url: `${API_URL}/electric`,
          params: { 
            table: "customers",
            where: `business_id = '${businessId}'`
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
            "x-business-id": businessId,
          },
        },
        table: "customers",
        primaryKey: ["id"],
      },
      sales: {
        shape: {
          url: `${API_URL}/electric`,
          params: { 
            table: "sales",
            where: `business_id = '${businessId}'`
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
            "x-business-id": businessId,
          },
        },
        table: "sales",
        primaryKey: ["id"],
      },
      payments: {
        shape: {
          url: `${API_URL}/electric`,
          params: { 
            table: "abonos",
            where: `business_id = '${businessId}'`
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
            "x-business-id": businessId,
          },
        },
        table: "payments",
        primaryKey: ["id"],
      },
      purchases: {
        shape: {
          url: `${API_URL}/electric`,
          params: { 
            table: "purchases",
            where: `business_id = '${businessId}'`
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
            "x-business-id": businessId,
          },
        },
        table: "purchases",
        primaryKey: ["id"],
      },
    },
    key: `business-${businessId}`,
    onInitialSync: () => {
      console.log("[Sync] Initial sync complete");
    },
    onError: (error) => {
      console.error("[Sync] Error:", error);
    },
  });

  return {
    unsubscribe: () => sync.unsubscribe(),
    isUpToDate: () => sync.isUpToDate,
  };
}
```

### Step 5: Create Custom Sync Engine for Writes

```typescript
// engine/sync-engine.ts
import type { PGlite } from "@electric-sql/pglite";
import { api } from "~/lib/api-client";

interface PendingOperation {
  id: string;
  entity: "customers" | "sales" | "payments" | "purchases";
  operation: "insert" | "update" | "delete";
  entityId: string;
  data: Record<string, unknown>;
  attempts: number;
  createdAt: number;
  lastError?: string;
}

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

export async function initSyncEngine(
  pg: PGlite,
  businessId: string,
  authToken: string
) {
  // Create pending operations table
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS pending_operations (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      operation TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_error TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_pending_ops_entity ON pending_operations(entity);
    CREATE INDEX IF NOT EXISTS idx_pending_ops_attempts ON pending_operations(attempts);
  `);

  // Start background sync
  startBackgroundSync(pg, businessId, authToken);
  
  // Listen for online/offline events
  window.addEventListener("online", () => {
    console.log("[SyncEngine] Connection restored");
    processPendingOperations(pg, businessId, authToken);
  });
}

async function startBackgroundSync(
  pg: PGlite,
  businessId: string,
  authToken: string
) {
  // Process queue every 30 seconds when online
  setInterval(() => {
    if (navigator.onLine) {
      processPendingOperations(pg, businessId, authToken);
    }
  }, SYNC_INTERVAL);
  
  // Initial processing
  if (navigator.onLine) {
    await processPendingOperations(pg, businessId, authToken);
  }
}

async function processPendingOperations(
  pg: PGlite,
  businessId: string,
  authToken: string
) {
  const result = await pg.query<PendingOperation>(`
    SELECT * FROM pending_operations 
    WHERE attempts < ${MAX_RETRIES}
    ORDER BY created_at ASC
    LIMIT 50
  `);

  for (const op of result.rows) {
    try {
      await syncOperationToServer(op, businessId, authToken);
      
      // Success: remove from queue and update entity sync_status
      await pg.exec(`
        DELETE FROM pending_operations WHERE id = '${op.id}';
        UPDATE ${op.entity} 
        SET sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
        WHERE id = '${op.entity_id}';
      `);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Increment attempts and store error
      await pg.exec(`
        UPDATE pending_operations 
        SET attempts = attempts + 1, last_error = '${errorMessage}'
        WHERE id = '${op.id}'
      `);
      
      // Mark entity as error if max retries reached
      if (op.attempts + 1 >= MAX_RETRIES) {
        await pg.exec(`
          UPDATE ${op.entity} 
          SET sync_status = 'error'
          WHERE id = '${op.entity_id}'
        `);
      }
    }
  }
}

async function syncOperationToServer(
  op: PendingOperation,
  businessId: string,
  authToken: string
): Promise<void> {
  const data = JSON.parse(op.data);
  
  switch (op.entity) {
    case "customers":
      await syncCustomer(op.operation, op.entityId, data);
      break;
    case "sales":
      await syncSale(op.operation, op.entityId, data);
      break;
    case "payments":
      await syncPayment(op.operation, op.entityId, data);
      break;
    case "purchases":
      await syncPurchase(op.operation, op.entityId, data);
      break;
  }
}

async function syncCustomer(
  operation: string,
  id: string,
  data: Record<string, unknown>
) {
  switch (operation) {
    case "insert":
      await api.customers.post(data);
      break;
    case "update":
      await api.customers({ id }).put(data);
      break;
    case "delete":
      await api.customers({ id }).delete();
      break;
  }
}

async function syncSale(
  operation: string,
  id: string,
  data: Record<string, unknown>
) {
  switch (operation) {
    case "insert":
      await api.sales.post(data);
      break;
    case "update":
      // Handle status transitions
      if (data.status === "active") {
        await api.sales({ id }).confirm.post();
      } else if (data.status === "cancelled") {
        await api.sales({ id }).cancel.post({
          reason: data.cancelReason,
          refundAmount: data.refundAmount,
        });
      } else {
        await api.sales({ id }).patch(data);
      }
      break;
    case "delete":
      await api.sales({ id }).delete();
      break;
  }
}

async function syncPayment(
  operation: string,
  id: string,
  data: Record<string, unknown>
) {
  switch (operation) {
    case "insert":
      await api.payments.post(data);
      break;
    case "delete":
      await api.payments({ id }).delete();
      break;
  }
}

async function syncPurchase(
  operation: string,
  id: string,
  data: Record<string, unknown>
) {
  switch (operation) {
    case "insert":
      await api.purchases.post(data);
      break;
    case "update":
      if (data.status) {
        await api.purchases({ id }).status.put({ status: data.status });
      }
      break;
    case "delete":
      await api.purchases({ id }).delete();
      break;
  }
}

// Queue operation for sync
export async function queueOperation(
  pg: PGlite,
  entity: PendingOperation["entity"],
  operation: PendingOperation["operation"],
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  const id = crypto.randomUUID();
  
  await pg.exec(`
    INSERT INTO pending_operations (id, entity, operation, entity_id, data)
    VALUES (
      '${id}',
      '${entity}',
      '${operation}',
      '${entityId}',
      '${JSON.stringify(data).replace(/'/g, "''")}'
    )
  `);
}
```

### Step 6: Create Data Hooks

```typescript
// engine/hooks/use-customers.ts
import { useLiveQuery } from "@electric-sql/react";
import { useSync } from "../sync-provider";
import { queueOperation } from "../sync-engine";
import { generateId } from "~/lib/utils";

export interface Customer {
  id: string;
  name: string;
  dni: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  business_id: string;
  sync_status: "pending" | "synced" | "error";
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  dni?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export function useCustomers(businessId: string) {
  const { pg } = useSync();
  
  const { data, error, isLoading } = useLiveQuery<
    Customer & { customer: Customer }
  >(pg, `
    SELECT * FROM customers 
    WHERE business_id = $1
    ORDER BY created_at DESC
  `, [businessId]);

  return {
    customers: data || [],
    isLoading,
    error,
  };
}

export function useCreateCustomer(businessId: string) {
  const { pg } = useSync();
  
  return async (input: CreateCustomerInput): Promise<Customer> => {
    if (!pg) throw new Error("Database not initialized");
    
    const id = generateId();
    const now = new Date().toISOString();
    
    const customer: Customer = {
      id,
      name: input.name,
      dni: input.dni || null,
      phone: input.phone || null,
      address: input.address || null,
      notes: input.notes || null,
      business_id: businessId,
      sync_status: "pending",
      created_at: now,
      updated_at: now,
    };
    
    // Insert into local PGlite
    await pg.exec(`
      INSERT INTO customers (id, name, dni, phone, address, notes, business_id, sync_status, created_at, updated_at)
      VALUES (
        '${customer.id}',
        '${customer.name}',
        ${customer.dni ? `'${customer.dni}'` : 'NULL'},
        ${customer.phone ? `'${customer.phone}'` : 'NULL'},
        ${customer.address ? `'${customer.address}'` : 'NULL'},
        ${customer.notes ? `'${customer.notes}'` : 'NULL'},
        '${customer.business_id}',
        '${customer.sync_status}',
        '${customer.created_at}',
        '${customer.updated_at}'
      )
    `);
    
    // Queue for server sync
    await queueOperation(pg, "customers", "insert", id, {
      name: input.name,
      dni: input.dni,
      phone: input.phone,
      address: input.address,
      notes: input.notes,
    });
    
    return customer;
  };
}

export function useUpdateCustomer() {
  const { pg } = useSync();
  
  return async (id: string, input: Partial<CreateCustomerInput>): Promise<void> => {
    if (!pg) throw new Error("Database not initialized");
    
    const updates: string[] = [];
    if (input.name !== undefined) updates.push(`name = '${input.name}'`);
    if (input.dni !== undefined) updates.push(`dni = ${input.dni ? `'${input.dni}'` : 'NULL'}`);
    if (input.phone !== undefined) updates.push(`phone = ${input.phone ? `'${input.phone}'` : 'NULL'}`);
    if (input.address !== undefined) updates.push(`address = ${input.address ? `'${input.address}'` : 'NULL'}`);
    if (input.notes !== undefined) updates.push(`notes = ${input.notes ? `'${input.notes}'` : 'NULL'}`);
    
    updates.push(`sync_status = 'pending'`);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    await pg.exec(`
      UPDATE customers 
      SET ${updates.join(", ")}
      WHERE id = '${id}'
    `);
    
    await queueOperation(pg, "customers", "update", id, input);
  };
}

export function useDeleteCustomer() {
  const { pg } = useSync();
  
  return async (id: string): Promise<void> => {
    if (!pg) throw new Error("Database not initialized");
    
    await pg.exec(`DELETE FROM customers WHERE id = '${id}'`);
    await queueOperation(pg, "customers", "delete", id, {});
  };
}
```

## Conflict Resolution Strategies

### 1. Last-Write-Wins (Default)

```typescript
// engine/conflict-resolution.ts
export type ConflictStrategy = "last-write-wins" | "server-wins" | "client-wins" | "manual";

interface Conflict<T> {
  entity: string;
  entityId: string;
  local: T;
  server: T;
  localTimestamp: number;
  serverTimestamp: number;
}

export function resolveConflict<T extends { updated_at: string }>(
  conflict: Conflict<T>,
  strategy: ConflictStrategy = "last-write-wins"
): "local" | "server" | "manual" {
  switch (strategy) {
    case "last-write-wins":
      return conflict.localTimestamp > conflict.serverTimestamp ? "local" : "server";
    case "server-wins":
      return "server";
    case "client-wins":
      return "local";
    case "manual":
      return "manual";
    default:
      return "server";
  }
}
```

### 2. Field-Level Merge

```typescript
export function mergeConflicts<T extends Record<string, unknown>>(
  local: T,
  server: T,
  conflictFields: (keyof T)[],
  localTimestamp: number,
  serverTimestamp: number
): T {
  const merged = { ...server };
  
  // For non-conflicting fields, use local if newer
  for (const key of Object.keys(local)) {
    if (!conflictFields.includes(key as keyof T)) {
      (merged as Record<string, unknown>)[key] = local[key];
    }
  }
  
  // For conflicting fields, use last-write-wins
  for (const field of conflictFields) {
    (merged as Record<string, unknown>)[field] = 
      localTimestamp > serverTimestamp ? local[field] : server[field];
  }
  
  return merged;
}
```

## Testing Strategies

### Unit Tests with Mock PGlite

```typescript
// engine/__tests__/sync-engine.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { queueOperation } from "../sync-engine";

describe("SyncEngine", () => {
  let pg: PGlite;
  
  beforeEach(async () => {
    pg = await PGlite.create();
    await pg.exec(`
      CREATE TABLE pending_operations (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        operation TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        attempts INTEGER DEFAULT 0
      );
    `);
  });
  
  it("should queue operations", async () => {
    await queueOperation(pg, "customers", "insert", "cust-1", { name: "John" });
    
    const result = await pg.query(`SELECT * FROM pending_operations`);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].entity).toBe("customers");
  });
});
```

### Integration Tests

```typescript
// e2e/offline-sync.spec.ts
import { test, expect } from "@playwright/test";

test("should sync data when coming back online", async ({ page }) => {
  // Go offline
  await page.context().setOffline(true);
  
  // Create customer while offline
  await page.fill("[name=name]", "Offline Customer");
  await page.click("button[type=submit]");
  
  // Verify pending state
  await expect(page.locator(".sync-status")).toContainText("Pendiente");
  
  // Come back online
  await page.context().setOffline(false);
  
  // Wait for sync
  await expect(page.locator(".sync-status")).toContainText("Sincronizado", { timeout: 10000 });
});
```

## Common Pitfalls

### 1. Race Conditions in PGlite Initialization

**❌ Bad:**
```typescript
// Creates multiple instances
export async function getPGlite() {
  return await PGlite.create({...}); // New instance every call
}
```

**✅ Good:**
```typescript
// Singleton pattern
let pgPromise: Promise<PGlite> | null = null;

export async function getPGlite() {
  if (!pgPromise) {
    pgPromise = PGlite.create({...});
  }
  return pgPromise;
}
```

### 2. SQL Injection Vulnerabilities

**❌ Bad:**
```typescript
await pg.exec(`SELECT * FROM customers WHERE id = '${userInput}'`);
```

**✅ Good:**
```typescript
await pg.query(`SELECT * FROM customers WHERE id = $1`, [userInput]);
```

### 3. Forgetting to Handle Sync Status

**❌ Bad:**
```typescript
await pg.exec(`INSERT INTO sales ...`);
// No tracking of sync status
```

**✅ Good:**
```typescript
await pg.exec(`INSERT INTO sales ... sync_status = 'pending'`);
await queueOperation(pg, "sales", "insert", id, data);
```

### 4. Not Cleaning Up Shape Subscriptions

**❌ Bad:**
```typescript
useEffect(() => {
  syncShapes(pg, businessId, token); // No cleanup
}, []);
```

**✅ Good:**
```typescript
useEffect(() => {
  const { unsubscribe } = await syncShapes(pg, businessId, token);
  return () => unsubscribe();
}, []);
```

## Migration Checklist

- [ ] Install `@electric-sql/pglite` and `@electric-sql/pglite-sync`
- [ ] Remove `@tanstack/react-db` and `@tanstack/electric-db-collection`
- [ ] Create PGlite instance with singleton pattern
- [ ] Define database schema with SQL
- [ ] Create sync provider component
- [ ] Configure Electric sync shapes
- [ ] Implement custom sync engine for writes
- [ ] Migrate collection hooks to SQL-based hooks
- [ ] Add conflict resolution logic
- [ ] Update tests for PGlite
- [ ] Add error handling and retry logic
- [ ] Test offline/online transitions
- [ ] Verify data consistency after sync

## Resources

- [PGlite Documentation](https://pglite.dev/docs/)
- [Electric SQL Sync](https://pglite.dev/docs/sync)
- [PGlite React Hooks](https://pglite.dev/docs/framework-hooks/react)
- [Electric SQL ShapeStream API](https://electric-sql.com/docs/api/clients/typescript)
