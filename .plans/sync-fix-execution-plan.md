# Sync System Fix Execution Plan

> **Comprehensive plan for fixing all 17 sync system issues identified in the audit**
> 
> **Generated:** 2026-04-04  
> **Scope:** Frontend (SyncService, PullService, ChangeApplier), Backend (ConflictResolver), Testing  
> **Estimated Timeline:** 12-15 days

---

## Executive Summary

This plan addresses 17 identified issues across the sync system:
- **5 CRITICAL** issues (monolith, duplication, SQL injection, lifecycle, cleanup)
- **6 HIGH** priority issues (polling, backoff, coordinator, silent failures, dead code, tests)
- **6 MEDIUM** priority issues (date normalization, query interpolation, eager loading, boilerplate, constants, error matching)

The fix strategy uses a **phased approach** that maintains backward compatibility throughout, with each phase building on the previous one.

---

## Phase 0: Pre-work & Safety (Day 1)

### 0.1 Schema Versioning & Migration Safety

**Files to Create:**
- `packages/app/app/lib/sync/schema-version.ts` - Schema version constants and migration utilities

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` (lines 180-250) - Add schema version check to initTables()

**Changes:**
```typescript
// Add to schema-version.ts
export const SYNC_SCHEMA_VERSION = 2; // Increment when schema changes

export interface SchemaVersionRecord {
  version: number;
  migratedAt: string;
}

export async function checkAndMigrateSchema(pg: PGlite): Promise<void> {
  // Create schema_version table if not exists
  // Check current version
  // Run migrations if needed
}
```

**Rollback Checkpoint:** Can revert to version 1 by restoring original initTables()

### 0.2 Caller Audit & Interface Contracts

**Files to Create:**
- `packages/app/app/lib/sync/__tests__/sync-service.caller-audit.test.ts` - Document all callers

**Files to Modify:**
- `packages/app/app/lib/sync/interfaces.ts` (lines 1-100) - Expand ISyncService interface

**Changes:**
```typescript
// Add to interfaces.ts
export interface ISyncService {
  // Existing methods...
  enqueue(params: EnqueueParams): Promise<string>;
  processPending(): Promise<{ processed: number; failed: number; conflicts: number }>;
  getStatus(): Promise<SyncStatus>;
  // Add missing methods from actual implementation
  startAutoSync(): void;
  stopAutoSync(): void;
  resolveConflict(operationId: string, resolution: ConflictStrategy, mergedData?: Record<string, unknown>): Promise<boolean>;
  // ... etc
}
```

### 0.3 Test Infrastructure Setup

**Files to Create:**
- `packages/app/app/lib/sync/__tests__/sync-service.test.ts` - Basic test scaffold (currently missing!)
- `packages/app/app/lib/sync/testing/factories.ts` - Test data factories
- `packages/app/app/lib/sync/testing/mocks.ts` - Mock implementations

**Testing Strategy:**
- Use existing Vitest setup
- Mock PGlite with in-memory instance
- Mock fetch for API calls
- Each test isolates sync_operations table

---

## Phase 1: Extract Testable Abstractions (Days 2-4)

### 1.1 Extract ISyncQueue Interface

**Files to Create:**
- `packages/app/app/lib/sync/queue/sync-queue.ts` - Queue interface definition
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts` - PGlite implementation

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` (lines 1-1120) - Extract queue operations

**Before:**
```typescript
// sync-service.ts lines 250-350
async enqueue(params: EnqueueParams): Promise<string> {
  // Direct PGlite queries mixed with business logic
  const existingOp = await this.pg.query<SyncOperationRecord>(...);
  // ... 100+ lines
}
```

**After:**
```typescript
// sync-service.ts
constructor(pg: PGlite, businessId: string, authToken: string, queue?: ISyncQueue) {
  this.queue = queue ?? new PgSyncQueue(pg, businessId);
}

async enqueue(params: EnqueueParams): Promise<string> {
  return this.queue.enqueue(params);
}
```

**Queue Interface:**
```typescript
// queue/sync-queue.ts
export interface ISyncQueue {
  enqueue(params: EnqueueParams): Promise<string>;
  getPending(limit: number): Promise<SyncOperationRecord[]>;
  getById(id: string): Promise<SyncOperationRecord | null>;
  getByEntityType(entityType: string, entityId: string, statuses: OperationStatus[]): Promise<SyncOperationRecord[]>;
  markProcessing(id: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  markFailed(id: string, error: string, attempts: number): Promise<void>;
  markConflict(id: string, conflictData: unknown): Promise<void>;
  moveToDeadLetter(operation: SyncOperationRecord, error: string): Promise<void>;
  getStatus(): Promise<SyncStatus>;
  deleteOperation(id: string): Promise<boolean>;
  retryOperation(id: string): Promise<boolean>;
  getFailedOperations(limit: number): Promise<SyncOperationRecord[]>;
  getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord[]>;
}
```

**Tests:**
- `packages/app/app/lib/sync/queue/__tests__/pg-sync-queue.test.ts`
- Test all queue operations in isolation
- Mock PGlite, verify SQL queries

### 1.2 Extract ISyncHttpClient Interface

**Files to Create:**
- `packages/app/app/lib/sync/http/sync-http-client.ts` - HTTP client interface
- `packages/app/app/lib/sync/http/fetch-sync-http-client.ts` - Fetch implementation

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` (lines 850-950) - Extract sendBatchToServer

**Interface:**
```typescript
// http/sync-http-client.ts
export interface ISyncHttpClient {
  sendBatch(operations: SyncOperationRecord[]): Promise<BatchSyncResponse>;
  getConflicts(options?: ConflictQueryOptions): Promise<BackendConflictListResponse>;
  getConflict(conflictId: string): Promise<BackendConflictResponse>;
  resolveConflict(conflictId: string, resolution: string, mergedData?: Record<string, unknown>): Promise<BackendConflictResponse>;
}
```

**Tests:**
- `packages/app/app/lib/sync/http/__tests__/fetch-sync-http-client.test.ts`
- Mock fetch API, test error handling

### 1.3 Unify Pull Methods (pull/pullWithOptions)

**Files to Create:**
- `packages/app/app/lib/sync/pull/pull-executor.ts` - Unified pull execution logic

**Files to Modify:**
- `packages/app/app/lib/sync/pull-service.ts` (lines 120-280, 320-450) - Deduplicate pull logic

**Current Issue:**
- `pull()` (lines 120-280) and `pullWithOptions()` (lines 320-450) have ~80% duplicated code
- Divergence risk: fixes in one may not reach the other

**After:**
```typescript
// pull-service.ts
async pull(): Promise<PullResult> {
  return this.executePull({
    useDefaultCursor: true,
    applyBackoff: true,
  });
}

async pullWithOptions(options: PullWithOptionsParams): Promise<PullResult & { nextSince: string | null }> {
  return this.executePull({
    entityTypes: options.entityTypes,
    since: options.since ?? this.loadStageCursor(options.cursorKey),
    limit: options.limit,
    cursorKey: options.cursorKey,
    applyBackoff: false, // pullWithOptions doesn't use backoff
  });
}

private async executePull(config: PullExecutionConfig): Promise<PullResult & { nextSince?: string | null }> {
  // Single implementation for both paths
}
```

**Tests:**
- `packages/app/app/lib/sync/pull/__tests__/pull-executor.test.ts`
- Verify both paths use same core logic
- Test StagedPullCoordinator still works

### 1.4 SyncService Facade Preservation

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` - Keep public API unchanged

**Pattern:**
```typescript
// sync-service.ts remains the facade
export class SyncService {
  // All existing public methods preserved
  // Internal implementation delegates to queue, httpClient, etc.
  
  constructor(pg: PGlite, businessId: string, authToken: string, options?: SyncServiceOptions) {
    this.queue = options?.queue ?? new PgSyncQueue(pg, businessId);
    this.httpClient = options?.httpClient ?? new FetchSyncHttpClient(authToken, businessId);
    this.config = options?.config ?? DEFAULT_SYNC_CONFIG;
  }
}
```

**Backward Compatibility:** ✅ All existing code continues to work

---

## Phase 2: Fix Critical Bugs (Days 5-7)

### 2.1 Add Lifecycle Guard (C4)

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` (lines 180-250) - initTables()

**Current Issue:**
```typescript
constructor(pg: PGlite, businessId: string, authToken: string) {
  this.pg = pg;
  this.businessId = businessId;
  this.authToken = authToken;
  void this.initTables(); // Fire-and-forget! No way to know when ready
}
```

**After:**
```typescript
export class SyncService {
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor(pg: PGlite, businessId: string, authToken: string) {
    this.pg = pg;
    this.businessId = businessId;
    this.authToken = authToken;
    // Don't auto-init - let caller control lifecycle
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this.initTables();
    await this.initializationPromise;
    this.isInitialized = true;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new SyncError('SyncService not initialized. Call initialize() first.');
    }
  }

  async enqueue(params: EnqueueParams): Promise<string> {
    this.ensureInitialized();
    // ... rest of method
  }
}
```

**Files to Modify:**
- `packages/app/app/lib/sync/service-provider.tsx` (lines 80-120) - Call initialize()

```typescript
// service-provider.tsx
useEffect(() => {
  const init = async () => {
    await syncService.initialize();
    await pullService.initialize(); // Add similar to PullService
    coordinator.start();
  };
  init();
}, []);
```

### 2.2 Fix SQL Injection in ChangeApplier (C3)

**Files to Modify:**
- `packages/app/app/lib/sync/change-applier.ts` (lines 80-150) - applyInsert

**Current Issue:**
```typescript
// Lines 90-120 - columns come from payload without whitelist
const columns: string[] = ["id", "business_id"];
const values: unknown[] = [id, business_id];

for (const [key, value] of Object.entries(data)) {
  if (key === "id" || key === "business_id") continue;
  if (RELATION_FIELDS.has(key)) continue;
  columns.push(key); // Direct from payload!
  values.push(value);
}
```

**After:**
```typescript
// Use schema-mapper's VALID_TABLES and column whitelisting
import { getTableColumns, isValidColumn } from './schema-mapper';

async function applyInsert(...): Promise<ChangeApplicationResult> {
  const allowedColumns = getTableColumns(tableName); // Whitelist from schema
  
  for (const [key, value] of Object.entries(data)) {
    if (!allowedColumns.includes(key)) {
      console.warn(`[ChangeApplier] Ignoring unknown column: ${tableName}.${key}`);
      continue;
    }
    columns.push(key);
    values.push(value);
  }
  
  // Now safe to use in SQL
  const insertSql = `
    INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(", ")})
    VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")})
  `;
}
```

**Files to Modify:**
- `packages/app/app/lib/sync/schema-mapper.ts` - Add getTableColumns()

```typescript
// schema-mapper.ts
const TABLE_COLUMNS: Record<string, string[]> = {
  customers: ['id', 'business_id', 'name', 'dni', 'phone', 'address', 'notes', 'sync_status', 'sync_attempts', 'created_at', 'updated_at'],
  products: ['id', 'business_id', 'name', 'unit', 'base_price', 'cost_price', 'is_active', 'sync_status', 'sync_attempts', 'created_at', 'updated_at'],
  // ... all tables
};

export function getTableColumns(tableName: string): string[] {
  return TABLE_COLUMNS[tableName] ?? [];
}

export function isValidColumn(tableName: string, column: string): boolean {
  const columns = TABLE_COLUMNS[tableName];
  return columns ? columns.includes(column) : false;
}
```

**Tests:**
- `packages/app/app/lib/sync/__tests__/change-applier.security.test.ts`
- Test that unknown columns are rejected
- Test SQL injection attempts are blocked

### 2.3 Add Cleanup on Logout/Business Switch (C5)

**Files to Create:**
- `packages/app/app/lib/sync/cleanup-service.ts` - Cleanup orchestrator

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` - Add cleanup() method
- `packages/app/app/lib/sync/pull-service.ts` - Add cleanup() method
- `packages/app/app/lib/sync/service-provider.tsx` - Call cleanup on unmount/business change

**Implementation:**
```typescript
// cleanup-service.ts
export class SyncCleanupService {
  constructor(
    private pg: PGlite,
    private businessId: string
  ) {}

  async cleanup(): Promise<void> {
    // Stop all sync operations
    this.syncService.stopAutoSync();
    this.pullService.stopAutoPull();
    
    // Clear sensitive data
    await this.pg.query('DELETE FROM sync_operations WHERE business_id = $1', [this.businessId]);
    await this.pg.query('DELETE FROM sync_dead_letter WHERE business_id = $1', [this.businessId]);
    
    // Clear cursors
    this.pullService.clearCursor();
    
    // Clear any cached state
    localStorage.removeItem(`sync_cursor_${this.businessId}`);
    
    console.log(`[SyncCleanup] Cleaned up sync data for business: ${this.businessId}`);
  }
}
```

**Files to Modify:**
- `packages/app/app/lib/sync/service-provider.tsx` (lines 140-180)

```typescript
useEffect(() => {
  return () => {
    // Cleanup on unmount or business change
    coordinator.stop();
    cleanupService.cleanup();
  };
}, [businessId]); // Re-run if business changes
```

### 2.4 Fix applyUpdate Silent Skip (C4-related)

**Files to Modify:**
- `packages/app/app/lib/sync/change-applier.ts` (lines 150-190) - applyUpdate

**Current Issue:**
```typescript
// Line 165-168
const existingResult = await pg.query(`SELECT id FROM "${tableName}" WHERE id = $1`, [id]);
if (existingResult.rows.length === 0) {
  console.warn(`[ChangeApplier] Update for non-existent record skipped: ${tableName}:${id}`);
  return { success: true }; // Silent skip!
}
```

**After:**
```typescript
export interface ChangeApplicationResult {
  success: boolean;
  error?: string;
  action?: 'applied' | 'skipped' | 'upserted';
  details?: {
    recordExisted: boolean;
    operation: string;
  };
}

async function applyUpdate(...): Promise<ChangeApplicationResult> {
  const existingResult = await pg.query(...);
  
  if (existingResult.rows.length === 0) {
    // Option 1: Convert to insert (upsert behavior)
    if (config.allowUpsert) {
      return applyInsert(pg, tableName, change, businessId);
    }
    
    // Option 2: Return explicit skip
    return { 
      success: true, // Still "success" from sync perspective
      action: 'skipped',
      details: { recordExisted: false, operation: 'update' }
    };
  }
  
  // ... apply update
  return { success: true, action: 'applied' };
}
```

---

## Phase 3: Fix High Priority Issues (Days 8-10)

### 3.1 Replace Polling with Event-Driven Status (H1)

**Files to Create:**
- `packages/app/app/lib/sync/events/sync-events.ts` - Event emitter

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` - Emit events on status changes
- `packages/app/app/lib/sync/service-provider.tsx` - Subscribe to events instead of polling

**Implementation:**
```typescript
// events/sync-events.ts
type SyncEventMap = {
  'status:changed': SyncStatus;
  'operation:completed': { id: string; entityType: string };
  'operation:failed': { id: string; error: string };
  'conflict:detected': { id: string; entityType: string };
  'pull:completed': { changesApplied: number };
  'pull:error': { error: string };
};

export class SyncEventEmitter extends EventTarget {
  emit<K extends keyof SyncEventMap>(event: K, data: SyncEventMap[K]): void {
    this.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  on<K extends keyof SyncEventMap>(event: K, handler: (data: SyncEventMap[K]) => void): () => void {
    const wrapper = (e: CustomEvent) => handler(e.detail);
    this.addEventListener(event, wrapper as EventListener);
    return () => this.removeEventListener(event, wrapper as EventListener);
  }
}
```

**Files to Modify:**
- `packages/app/app/lib/sync/service-provider.tsx` (lines 200-250) - Replace 5s polling

```typescript
// Before: Polling every 5s
const interval = setInterval(updateStatus, 5000);

// After: Event-driven
useEffect(() => {
  if (!services) return;
  
  // Initial status
  updateStatus();
  
  // Subscribe to events
  const unsubStatus = services.syncService.events.on('status:changed', setPushStatus);
  const unsubPull = services.pullService.events.on('pull:completed', updateStatus);
  const unsubPullError = services.pullService.events.on('pull:error', updateStatus);
  
  return () => {
    unsubStatus();
    unsubPull();
    unsubPullError();
  };
}, [services]);
```

### 3.2 Unify Backoff Logic (H2)

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` (lines 130-160) - Remove duplicate backoff
- `packages/app/app/lib/sync/pull-service.ts` (lines 90-120) - Use shared backoff
- `packages/app/app/lib/sync/backoff.ts` - Enhance with state management

**Current Duplication:**
- SyncService has `getBackoffDelay()` and `applyBackoff()` (lines 130-160)
- PullService has `getBackoffDelay()` using `calculateBackoffDelay()` (lines 90-120)

**After:**
```typescript
// backoff.ts
export interface IBackoffStrategy {
  getDelay(): number;
  recordSuccess(): void;
  recordFailure(): void;
  reset(): void;
}

export class ExponentialBackoff implements IBackoffStrategy {
  private consecutiveFailures = 0;
  private currentDelay = 0;
  
  constructor(
    private baseMs: number,
    private maxMs: number,
    private multiplier: number = 2
  ) {}
  
  getDelay(): number {
    return this.currentDelay;
  }
  
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.currentDelay = 0;
  }
  
  recordFailure(): void {
    this.consecutiveFailures++;
    this.currentDelay = Math.min(
      this.baseMs * Math.pow(this.multiplier, this.consecutiveFailures - 1),
      this.maxMs
    );
  }
  
  reset(): void {
    this.consecutiveFailures = 0;
    this.currentDelay = 0;
  }
}
```

**Usage:**
```typescript
// sync-service.ts
export class SyncService {
  private backoff: IBackoffStrategy;
  
  constructor(..., backoff?: IBackoffStrategy) {
    this.backoff = backoff ?? new ExponentialBackoff(BACKOFF_BASE_MS, BACKOFF_MAX_MS);
  }
  
  async processPending(): Promise<...> {
    await this.applyBackoff();
    // ... process
    if (failed > 0) {
      this.backoff.recordFailure();
    } else {
      this.backoff.recordSuccess();
    }
  }
}
```

### 3.3 Enhance SyncCoordinator (H3)

**Files to Modify:**
- `packages/app/app/lib/sync/coordinator.ts` (lines 1-23) - Add orchestration logic

**Current:**
```typescript
export class SyncCoordinator {
  constructor(private syncService: SyncService, private pullService: PullService) {}
  start(): void { /* just delegates */ }
  stop(): void { /* just delegates */ }
  // Only 23 lines - no real coordination
}
```

**After:**
```typescript
export interface SyncCoordinatorConfig {
  pushIntervalMs: number;
  pullIntervalMs: number;
  maxConcurrentOperations: number;
  enableStagedPull: boolean;
}

export class SyncCoordinator {
  private stagedCoordinator?: StagedPullCoordinator;
  private isRunning = false;
  private pushIntervalId?: ReturnType<typeof setInterval>;
  private pullIntervalId?: ReturnType<typeof setInterval>;
  
  constructor(
    private syncService: SyncService,
    private pullService: PullService,
    private config: SyncCoordinatorConfig,
    private eventEmitter: SyncEventEmitter
  ) {}
  
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    // Initialize services
    await this.syncService.initialize();
    await this.pullService.initialize();
    
    // Run staged pull if enabled
    if (this.config.enableStagedPull) {
      this.stagedCoordinator = new StagedPullCoordinator(this.pullService);
      await this.stagedCoordinator.loadCriticalData();
      await this.stagedCoordinator.loadRecentSales();
      // Historical runs in background
      this.stagedCoordinator.loadHistoricalData();
    }
    
    // Start periodic sync
    this.startPeriodicSync();
    this.isRunning = true;
    
    this.eventEmitter.emit('coordinator:started', undefined);
  }
  
  async forceSync(): Promise<SyncResult> {
    // Orchestrate push then pull
    const pushResult = await this.syncService.processPending();
    const pullResult = await this.pullService.pull();
    
    return {
      push: pushResult,
      pull: pullResult,
      timestamp: new Date()
    };
  }
  
  getHealth(): SyncHealth {
    return {
      isRunning: this.isRunning,
      pushStatus: this.syncService.getHealth(),
      pullStatus: this.pullService.getHealth(),
      lastSyncTime: this.getLastSyncTime()
    };
  }
}
```

### 3.4 Remove Dead Code in PullService (H5)

**Files to Modify:**
- `packages/app/app/lib/sync/pull-service.ts` (lines 200-220)

**Current Issue:**
```typescript
// Line 200-205 - Duplicate check
if (changes.length === 0) {
  console.log(`[PULL] ✅ No new changes`);
  return { success: true, changesApplied: 0, hasMore: false };
}

// ... more processing ...

// Line 220-223 - Same check again!
if (changes.length === 0) {
  return { success: true, changesApplied: 0, hasMore: false };
}
```

**Fix:** Remove second check (lines 220-223)

---

## Phase 4: Testing & Validation (Days 11-13)

### 4.1 Unit Tests for SyncService (H6)

**Files to Create:**
- `packages/app/app/lib/sync/__tests__/sync-service.test.ts` - Main test suite
- `packages/app/app/lib/sync/__tests__/sync-service.queue.test.ts` - Queue interaction tests
- `packages/app/app/lib/sync/__tests__/sync-service.http.test.ts` - HTTP interaction tests

**Test Coverage:**
```typescript
describe('SyncService', () => {
  describe('enqueue', () => {
    it('should add operation to queue', async () => {});
    it('should coalesce duplicate operations', async () => {});
    it('should respect idempotency keys', async () => {});
    it('should handle sync groups', async () => {});
  });
  
  describe('processPending', () => {
    it('should process operations in batch', async () => {});
    it('should handle conflicts', async () => {});
    it('should apply backoff on failure', async () => {});
    it('should respect max retries', async () => {});
    it('should move to dead letter after max retries', async () => {});
  });
  
  describe('conflict resolution', () => {
    it('should resolve server-wins', async () => {});
    it('should resolve client-wins', async () => {});
    it('should resolve field-merge', async () => {});
  });
  
  describe('lifecycle', () => {
    it('should require initialization', async () => {});
    it('should cleanup on dispose', async () => {});
  });
});
```

### 4.2 Integration Tests

**Files to Create:**
- `packages/app/app/lib/sync/__tests__/sync-integration.test.ts` - Full flow tests

**Test Scenarios:**
- End-to-end sync flow
- Offline/online transitions
- Conflict resolution flows
- Business switch cleanup
- Staged pull coordination

### 4.3 Regression Tests

**Files to Create:**
- `packages/app/app/lib/sync/__tests__/regression.test.ts`

**Test Cases:**
- All 17 issues have regression tests
- SQL injection attempts
- Multi-tenancy isolation
- Race condition scenarios

---

## Phase 5: Medium Priority & Polish (Days 14-15)

### 5.1 Fix normalizeDatesToISO (M1)

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` (lines 290-330)

**Current:**
```typescript
// Too aggressive - converts ALL date fields
const DATE_FIELDS_SYNC = new Set([
  "saleDate", "deliveryDate", // ... 16 more fields
]);

function normalizeDatesToISO(obj: unknown): unknown {
  // Recursively walks entire object
}
```

**After:**
```typescript
// Only normalize fields that are actually Date instances
function normalizeDatesToISO(obj: unknown, path = ''): unknown {
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item, i) => normalizeDatesToISO(item, `${path}[${i}]`));
  }
  
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Only process if value is actually a Date
      result[key] = normalizeDatesToISO(value, `${path}.${key}`);
    }
    return result;
  }
  
  return obj;
}
```

### 5.2 Fix markCompleted Query (M2)

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` (lines 750-780)

**Current:**
```typescript
private async markCompleted(id: string): Promise<void> {
  // First query
  const op = await this.getOperation(id);
  
  // Second query with string interpolation!
  const tableName = op ? validateEntityTableName(op.entity_type) : null;
  if (op && tableName) {
    await this.pg.query(
      `UPDATE ${tableName} SET ...`, // String interpolation!
    );
  }
}
```

**After:**
```typescript
private async markCompleted(id: string): Promise<void> {
  const op = await this.getOperation(id);
  if (!op) return;
  
  // Use parameterized table name via whitelist
  const tableName = validateEntityTableName(op.entity_type);
  if (!tableName) return;
  
  // Safe: tableName is from whitelist, not user input
  await this.pg.query(
    `UPDATE "${tableName}" SET sync_status = $1, sync_attempts = $2, updated_at = $3 WHERE id = $4 AND business_id = $5`,
    ["synced", 0, new Date().toISOString(), op.entity_id, this.businessId]
  );
}
```

### 5.3 Lazy Service Loading (M3)

**Files to Modify:**
- `packages/app/app/lib/sync/service-provider.tsx` (lines 100-140)

**Current:**
```typescript
const services = useMemo(() => {
  // All 14 services created eagerly!
  const customerService = new CustomerService(...);
  const saleService = new SaleService(...);
  // ... 12 more
}, []);
```

**After:**
```typescript
// Use lazy initialization pattern
const serviceRefs = useRef<{
  customerService?: CustomerService;
  // ... others
}>({});

const getCustomerService = useCallback(() => {
  if (!serviceRefs.current.customerService) {
    serviceRefs.current.customerService = new CustomerService(...);
  }
  return serviceRefs.current.customerService;
}, []);

// Or use Proxy for transparent lazy loading
const services = useMemo(() => {
  const lazyServices: Partial<ServicesContextValue> = {};
  
  return new Proxy({} as ServicesContextValue, {
    get(target, prop) {
      if (prop in lazyServices) {
        return lazyServices[prop as keyof ServicesContextValue];
      }
      
      // Create on first access
      switch (prop) {
        case 'customerService':
          lazyServices.customerService = new CustomerService(...);
          return lazyServices.customerService;
        // ... other services
      }
      
      return target[prop as keyof ServicesContextValue];
    }
  });
}, []);
```

### 5.4 Refactor Backend ConflictResolver (M4)

**Files to Create:**
- `packages/backend/src/services/sync/framework/ConflictResolver.base.ts`
- `packages/backend/src/services/sync/framework/ConflictResolver.factory.ts`

**Files to Modify:**
- `packages/backend/src/services/sync/framework/ConflictResolver.ts` - Replace 18 classes

**Current:** 18 boilerplate classes extending BaseTimestampConflictResolver

**After:**
```typescript
// ConflictResolver.factory.ts
export interface ConflictResolverConfig {
  entityType: string;
  table: any;
  idField: string;
  businessIdField: string;
  updatedAtField: string;
  queryRelationName?: string;
  serverDataFields: string[];
}

const RESOLVER_CONFIGS: ConflictResolverConfig[] = [
  {
    entityType: 'customers',
    table: customers,
    idField: 'id',
    businessIdField: 'businessId',
    updatedAtField: 'updatedAt',
    serverDataFields: ['name', 'dni', 'phone', 'address', 'notes', 'updatedAt']
  },
  // ... other configs (data only, no classes)
];

export function createConflictResolver(config: ConflictResolverConfig): IConflictResolver {
  return {
    async checkConflict(ctx, operation, tx) {
      // Shared implementation using config
      const record = await tx.query[config.queryRelationName ?? getTableName(config.table)]
        .findFirst({...});
      
      // Build serverData dynamically from config
      const serverData: Record<string, unknown> = {};
      for (const field of config.serverDataFields) {
        serverData[field] = record[field];
      }
      
      return { hasConflict: true, serverData };
    }
  };
}
```

### 5.5 Unify VALID_TABLE_NAMES (M5)

**Files to Modify:**
- `packages/app/app/lib/services/base-service.ts` - Remove local VALID_TABLE_NAMES
- `packages/app/app/lib/sync/schema-mapper.ts` - Export shared whitelist

**After:**
```typescript
// schema-mapper.ts - Single source of truth
export const VALID_TABLE_NAMES = new Set([
  'customers', 'products', // ... all tables
]);

// base-service.ts
import { VALID_TABLE_NAMES } from '../sync/schema-mapper';

function validateTableName(tableName: string): string {
  if (!VALID_TABLE_NAMES.has(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  return tableName;
}
```

### 5.6 Improve Self-Heal Error Detection (M6)

**Files to Modify:**
- `packages/app/app/lib/sync/sync-service.ts` (lines 850-880) - trySelfHealOperation

**Current:**
```typescript
private async trySelfHealOperation(op: SyncOperationRecord, error: string): Promise<boolean> {
  if (
    op.operation !== "update" ||
    !SELF_HEAL_INSERTABLE_ENTITIES.has(op.entity_type) ||
    !isNotFoundError(error) // Brittle string matching
  ) {
    return false;
  }
  // ...
}

function isNotFoundError(error: string): boolean {
  return (
    error.includes("no encontrada") ||
    error.includes("not found") ||
    error.includes("does not exist")
  );
}
```

**After:**
```typescript
// Error classification system
export enum SyncErrorCode {
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export interface ClassifiedError {
  code: SyncErrorCode;
  isRetryable: boolean;
  isSelfHealable: boolean;
  originalError: string;
}

export function classifyError(error: string): ClassifiedError {
  const lower = error.toLowerCase();
  
  // Structured patterns instead of brittle strings
  const patterns = [
    { 
      code: SyncErrorCode.RECORD_NOT_FOUND, 
      patterns: [/record.*not found/i, /no encontrada/i, /does not exist/i, /404/i],
      isRetryable: false,
      isSelfHealable: true
    },
    {
      code: SyncErrorCode.VERSION_CONFLICT,
      patterns: [/version.*conflict/i, /optimistic.*lock/i, /409/i],
      isRetryable: false,
      isSelfHealable: false
    },
    // ... more patterns
  ];
  
  for (const p of patterns) {
    if (p.patterns.some(regex => regex.test(lower))) {
      return {
        code: p.code,
        isRetryable: p.isRetryable,
        isSelfHealable: p.isSelfHealable,
        originalError: error
      };
    }
  }
  
  return {
    code: SyncErrorCode.UNKNOWN,
    isRetryable: true,
    isSelfHealable: false,
    originalError: error
  };
}
```

---

## Risk Mitigation Strategies

### Backward Compatibility

| Phase | Risk | Mitigation |
|-------|------|------------|
| Phase 1 | Interface extraction breaks callers | Keep SyncService facade unchanged, add optional deps |
| Phase 2 | Lifecycle guard breaks existing code | Make initialize() optional with auto-init fallback (deprecated) |
| Phase 2 | SQL whitelist blocks valid columns | Audit all columns first, comprehensive whitelist |
| Phase 3 | Event-driven status breaks UI | Keep polling as fallback, emit events additionally |

### Testing Strategy

| Level | Coverage | Responsibility |
|-------|----------|----------------|
| Unit | Queue, HTTP client, Backoff, ChangeApplier | Each extracted component |
| Integration | SyncService + Queue + HTTP | Component interactions |
| E2E | Full sync flow with backend | Critical user paths |
| Regression | All 17 issues | Prevent reintroduction |

### Rollback Plan

Each phase has a rollback checkpoint:
1. **Phase 0:** Revert schema changes, restore original initTables()
2. ** Phase 1:** Restore monolithic SyncService from git
3. **Phase 2:** Disable lifecycle guard via feature flag
4. **Phase 3:** Fall back to polling if events fail
5. **Phase 4:** Skip new tests, keep old ones
6. **Phase 5:** Revert individual changes independently

---

## Timeline Summary

| Phase | Days | Key Deliverables |
|-------|------|------------------|
| 0 | 1 | Schema versioning, test infrastructure |
| 1 | 3 | ISyncQueue, ISyncHttpClient, unified pull |
| 2 | 3 | Lifecycle guard, SQL whitelist, cleanup, upsert |
| 3 | 3 | Event-driven status, unified backoff, enhanced coordinator |
| 4 | 3 | Unit tests, integration tests, regression tests |
| 5 | 2 | Medium priority fixes, backend refactor |
| **Total** | **15** | |

---

## Files Modified Summary

### Created (New Files)
- `packages/app/app/lib/sync/schema-version.ts`
- `packages/app/app/lib/sync/queue/sync-queue.ts`
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts`
- `packages/app/app/lib/sync/queue/__tests__/pg-sync-queue.test.ts`
- `packages/app/app/lib/sync/http/sync-http-client.ts`
- `packages/app/app/lib/sync/http/fetch-sync-http-client.ts`
- `packages/app/app/lib/sync/http/__tests__/fetch-sync-http-client.test.ts`
- `packages/app/app/lib/sync/pull/pull-executor.ts`
- `packages/app/app/lib/sync/pull/__tests__/pull-executor.test.ts`
- `packages/app/app/lib/sync/events/sync-events.ts`
- `packages/app/app/lib/sync/cleanup-service.ts`
- `packages/app/app/lib/sync/__tests__/sync-service.test.ts`
- `packages/app/app/lib/sync/__tests__/sync-service.queue.test.ts`
- `packages/app/app/lib/sync/__tests__/sync-service.http.test.ts`
- `packages/app/app/lib/sync/__tests__/sync-integration.test.ts`
- `packages/app/app/lib/sync/__tests__/regression.test.ts`
- `packages/app/app/lib/sync/__tests__/change-applier.security.test.ts`
- `packages/backend/src/services/sync/framework/ConflictResolver.base.ts`
- `packages/backend/src/services/sync/framework/ConflictResolver.factory.ts`

### Modified (Existing Files)
- `packages/app/app/lib/sync/sync-service.ts` - Major refactor (extract deps, add lifecycle)
- `packages/app/app/lib/sync/pull-service.ts` - Unify pull methods, add initialize()
- `packages/app/app/lib/sync/change-applier.ts` - Add column whitelist
- `packages/app/app/lib/sync/schema-mapper.ts` - Add getTableColumns()
- `packages/app/app/lib/sync/coordinator.ts` - Enhance orchestration
- `packages/app/app/lib/sync/service-provider.tsx` - Add lifecycle management, events
- `packages/app/app/lib/sync/interfaces.ts` - Expand interfaces
- `packages/app/app/lib/sync/backoff.ts` - Add IBackoffStrategy
- `packages/app/app/lib/services/base-service.ts` - Use shared VALID_TABLE_NAMES
- `packages/backend/src/services/sync/framework/ConflictResolver.ts` - Refactor to factory

---

## Success Criteria

1. **All 17 issues resolved** with regression tests
2. **Zero breaking changes** to public API
3. **Test coverage >80%** for sync system
4. **SyncService <400 lines** (from 1120+)
5. **No SQL injection vectors** (verified by security tests)
6. **Event-driven status** working (no 5s polling)
7. **StagedPullCoordinator** still functional
8. **All existing tests** still passing

---

*Plan generated for the Avileo sync system fix initiative.*
