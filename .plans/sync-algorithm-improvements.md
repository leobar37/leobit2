# Sync Algorithm Improvements - Technical Implementation Plan

> **Project**: Avileo - Offline-first chicken sales management system
> **Plan Version**: 1.0
> **Date**: 2026-04-13

## Executive Summary

This document outlines a comprehensive 3-phase plan to improve Avileo's custom REST-based bidirectional sync system. The improvements address observability, scalability, reliability, and maintainability of the sync infrastructure across 14 entity types.

---

## Phase 1: Immediate (This Week)

### 1. Backend Dead Letter Queue (DLQ)

#### Overview
Track permanently failed operations that exceed retry limits in a dedicated `sync_dead_letter` table for admin review and manual intervention.

#### Current State
- Frontend already has `sync_dead_letter` table in PGlite (schema exists)
- Frontend already has `PgSyncQueue.moveToDeadLetter()` method
- Backend lacks DLQ table and endpoints

#### Files to Create/Modify

**New Files:**
- `packages/backend/src/db/schema/sync-dead-letter.ts` - Drizzle schema definition
- `packages/backend/src/services/sync/framework/SyncDeadLetterRepository.ts` - Repository layer
- `packages/backend/src/services/sync/framework/SyncHealthService.ts` - Service layer for DLQ ops

**Modified Files:**
- `packages/backend/src/db/schema/index.ts` - Export new table
- `packages/backend/src/api/sync.ts` - Add GET /sync/dead-letter endpoint
- `packages/backend/src/services/sync/sync.service.ts` - Add DLQ persistence to failed operations

#### Implementation Steps

**Step 1.1: Create Backend DLQ Schema (sync-dead-letter.ts)**
```typescript
import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const syncDeadLetter = pgTable(
  "sync_dead_letter",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    operationId: varchar("operation_id", { length: 128 }).notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    entityId: varchar("entity_id", { length: 128 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    error: text("error").notNull(),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    originalError: text("original_error"),
    clientTimestamp: timestamp("client_timestamp").notNull(),
    deviceId: varchar("device_id", { length: 128 }),
    sourceFingerprint: varchar("source_fingerprint", { length: 256 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sync_dead_letter_business_id").on(table.businessId),
    index("idx_sync_dead_letter_entity").on(table.entity, table.entityId),
    index("idx_sync_dead_letter_created_at").on(table.createdAt),
  ]
);

export type SyncDeadLetter = typeof syncDeadLetter.$inferSelect;
export type NewSyncDeadLetter = typeof syncDeadLetter.$inferInsert;
```

**Step 1.2: Create Repository (SyncDeadLetterRepository.ts)**
```typescript
export class SyncDeadLetterRepository {
  async create(ctx: RequestContext, operation: SyncOperationRecord, error: string, tx?: DbTransaction): Promise<void>
  async findByBusiness(ctx: RequestContext, options: { limit: number; offset: number; entity?: string }): Promise<SyncDeadLetter[]>
  async countByBusiness(ctx: RequestContext): Promise<number>
  async delete(ctx: RequestContext, id: string): Promise<boolean>
}
```

**Step 1.3: Add API Endpoint (sync.ts:line ~230)**
```typescript
.get("/dead-letter", async ({ ctx, query }) => {
  const dlqRepo = new SyncDeadLetterRepository();
  const limit = Math.min(parseInt(query.limit || "50"), 100);
  const offset = parseInt(query.offset || "0");
  
  const [items, total] = await Promise.all([
    dlqRepo.findByBusiness(ctx, { limit, offset, entity: query.entity }),
    dlqRepo.countByBusiness(ctx),
  ]);
  
  return {
    success: true,
    data: { items, total, pagination: { limit, offset } }
  };
}, {
  query: t.Object({
    limit: t.Optional(t.String()),
    offset: t.Optional(t.String()),
    entity: t.Optional(t.String()),
  })
})
```

**Step 1.4: Integrate into SyncEngine**
Modify `SyncEngine.processOperation()` to move permanently failed operations (MAX_RETRIES exceeded) to DLQ.

#### Database Migration
```sql
-- Generated via: cd packages/backend && bun run db:generate
CREATE TABLE sync_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  operation_id VARCHAR(128) NOT NULL,
  entity VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  error TEXT NOT NULL,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  original_error TEXT,
  client_timestamp TIMESTAMP NOT NULL,
  device_id VARCHAR(128),
  source_fingerprint VARCHAR(256),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_dead_letter_business_id ON sync_dead_letter(business_id);
CREATE INDEX idx_sync_dead_letter_entity ON sync_dead_letter(entity, entity_id);
CREATE INDEX idx_sync_dead_letter_created_at ON sync_dead_letter(created_at);
```

#### API Contract

**GET /sync/dead-letter**
```typescript
// Request
Query: { limit?: string; offset?: string; entity?: string }

// Response
{
  success: true,
  data: {
    items: Array<{
      id: string;
      operationId: string;
      entity: string;
      action: "create" | "update" | "delete";
      entityId: string;
      payload: Record<string, unknown>;
      error: string;
      syncAttempts: number;
      createdAt: string;
    }>;
    total: number;
    pagination: { limit: number; offset: number };
  }
}
```

#### Testing Strategy
1. Unit tests for `SyncDeadLetterRepository`
2. Integration test: Force operation failure → verify entry in DLQ
3. E2E test: GET /sync/dead-letter returns expected format

#### Estimated Effort
- **Backend**: 4-6 hours
- **Frontend Integration**: 2 hours (consume new endpoint in sync health UI)
- **Testing**: 2 hours

---

### 2. Sync Health Metrics Endpoint

#### Overview
Add GET /sync/metrics endpoint that aggregates sync health from sync_operations table for real-time monitoring.

#### Current State
- `/sync/health` exists but only returns logger metrics
- No aggregate statistics on sync operation performance

#### Files to Create/Modify

**New Files:**
- `packages/backend/src/services/sync/framework/SyncMetricsService.ts` - Aggregation logic

**Modified Files:**
- `packages/backend/src/api/sync.ts` - Add GET /sync/metrics endpoint

#### Implementation Steps

**Step 2.1: Create SyncMetricsService**
```typescript
export interface SyncMetrics {
  total: number;
  pending: number;
  processed: number;
  failed: number;
  averageLatencyMs: number;
  topErrors: Array<{ error: string; count: number }>;
  byEntity: Record<string, { pending: number; processed: number; failed: number }>;
  timeRange: { from: Date; to: Date };
}

export class SyncMetricsService {
  async getMetrics(ctx: RequestContext, timeRangeHours = 24): Promise<SyncMetrics>
}
```

**Step 2.2: Add API Endpoint (sync.ts)**
```typescript
.get("/metrics", async ({ ctx, query }) => {
  const hours = parseInt(query.hours || "24", 10);
  const metrics = await syncMetricsService.getMetrics(ctx, hours);
  return { success: true, data: metrics };
}, {
  query: t.Object({
    hours: t.Optional(t.String()),
  })
})
```

**Step 2.3: SQL Queries for Metrics**
```sql
-- Total operations by status
SELECT status, COUNT(*) as count 
FROM sync_operations 
WHERE business_id = $1 AND created_at > $2
GROUP BY status;

-- Average latency
SELECT AVG(EXTRACT(EPOCH FROM (processed_at - client_timestamp))) * 1000 as avg_latency_ms
FROM sync_operations 
WHERE business_id = $1 AND status = 'processed' AND created_at > $2;

-- Top errors
SELECT error, COUNT(*) as count 
FROM sync_operations 
WHERE business_id = $1 AND status = 'failed' AND created_at > $2
GROUP BY error ORDER BY count DESC LIMIT 5;

-- By entity breakdown
SELECT entity, 
       COUNT(*) FILTER (WHERE status = 'pending') as pending,
       COUNT(*) FILTER (WHERE status = 'processed') as processed,
       COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM sync_operations 
WHERE business_id = $1 AND created_at > $2
GROUP BY entity;
```

#### API Contract

**GET /sync/metrics**
```typescript
// Response
{
  success: true,
  data: {
    total: 1523,
    pending: 12,
    processed: 1489,
    failed: 22,
    averageLatencyMs: 234.5,
    topErrors: [
      { error: "Customer not found", count: 8 },
      { error: "Sale version conflict", count: 5 }
    ],
    byEntity: {
      "customers": { pending: 2, processed: 450, failed: 3 },
      "sales": { pending: 10, processed: 800, failed: 15 }
    },
    timeRange: {
      from: "2026-04-12T00:00:00Z",
      to: "2026-04-13T00:00:00Z"
    }
  }
}
```

#### Testing Strategy
1. Unit tests for aggregation queries
2. Integration test: Seed operations → verify metrics accuracy
3. Performance test: Verify query performance with 10k+ operations

#### Estimated Effort
- **Backend**: 3-4 hours
- **Testing**: 1-2 hours

---

## Phase 2: Short-term (Next 2 Weeks)

### 3. Refactor PullService (493 lines, 25 methods)

#### Overview
Split the monolithic `PullService` into focused, testable components while maintaining the same public API.

#### Current State
- `packages/app/app/lib/sync/pull-service.ts` has 493 lines
- 25 methods with mixed responsibilities
- Hard to test individual behaviors

#### Target Architecture
```
PullService (orchestrator, thin layer)
├── CursorManager (cursor persistence, stale detection)
├── StaleDetector (consecutive pull tracking, stuck detection)
├── PullRequester (HTTP fetch, retry logic)
└── PullOrchestrator (high-level coordination)
```

#### Files to Create/Modify

**New Files:**
- `packages/app/app/lib/sync/pull/cursor-manager.ts` - Cursor persistence
- `packages/app/app/lib/sync/pull/stale-detector.ts` - Stale pull detection
- `packages/app/app/lib/sync/pull/pull-requester.ts` - HTTP request logic
- `packages/app/app/lib/sync/pull/pull-orchestrator.ts` - Coordination

**Modified Files:**
- `packages/app/app/lib/sync/pull-service.ts` - Refactor to thin facade

#### Implementation Steps

**Step 3.1: Create CursorManager**
```typescript
export class CursorManager {
  constructor(private storageKey: string) {}
  
  load(): string | null
  save(cursor: string): void
  clear(): void
  loadStage(key: string): string | null
  saveStage(key: string, cursor: string): void
}
```

**Step 3.2: Create StaleDetector**
```typescript
export interface StaleDetectionConfig {
  maxStalePulls: number;
  maxEmptyPulls: number;
}

export class StaleDetector {
  private consecutiveStalePulls = 0;
  private consecutiveEmptyPulls = 0;
  private lastNextSince: string | null = null;
  private isStuck = false;
  
  check(nextSince: string, hasMore: boolean, changesCount: number): StaleCheckResult
  forceReset(): void
  getIsStuck(): boolean
}
```

**Step 3.3: Create PullRequester**
```typescript
export class PullRequester {
  constructor(
    private apiUrl: string,
    private authToken: string,
    private businessId: string,
    private syncGroupId: string | null
  ) {}
  
  async fetchChanges(params: PullParams, abortSignal: AbortSignal): Promise<PullResponse>
}
```

**Step 3.4: Refactor PullService as Facade**
```typescript
export class PullService {
  private cursorManager: CursorManager;
  private staleDetector: StaleDetector;
  private pullRequester: PullRequester;
  private orchestrator: PullOrchestrator;
  
  // Keep same public API
  async pull(): Promise<PullResult>
  async pullWithOptions(options: PullOptions): Promise<PullResult & { nextSince }>
  startAutoPull(): void
  stopAutoPull(): void
  forceReset(): void
  getStatus(): PullStatus
}
```

#### API Contract (Unchanged)
```typescript
// Public interface remains identical
interface PullService {
  pull(): Promise<PullResult>
  pullWithOptions(options: { entityTypes?: string[]; since?: string; limit?: number }): Promise<PullResult & { nextSince }>
  startAutoPull(): void
  stopAutoPull(): void
  forceReset(): void
  getStatus(): PullStatus
  getIsStuck(): boolean
}
```

#### Testing Strategy
1. Unit tests for each extracted class in isolation
2. Integration tests for PullService facade (same tests as before)
3. Mock-based tests for PullRequester (no actual HTTP calls)

#### Estimated Effort
- **Refactoring**: 6-8 hours
- **Test migration**: 3-4 hours
- **Verification**: 2 hours

---

### 4. Automated Cleanup Strategy

#### Overview
Add background cleanup of completed operations older than 30 days to prevent unbounded growth.

#### Current State
- `PgSyncQueue.cleanupCompleted()` exists but must be called manually
- `SyncCleanupService` handles logout/business_switch but not scheduled cleanup

#### Files to Create/Modify

**New Files:**
- `packages/app/app/lib/sync/cleanup/scheduled-cleanup.ts` - Scheduled job runner

**Modified Files:**
- `packages/app/app/lib/sync/sync-auto-runner.ts` - Add cleanup trigger
- `packages/app/app/lib/sync/service-provider.tsx` - Wire up cleanup

#### Implementation Steps

**Step 4.1: Create ScheduledCleanupService**
```typescript
export interface CleanupConfig {
  completedRetentionDays: number;
  deadLetterRetentionDays: number;
  runIntervalHours: number;
}

export class ScheduledCleanupService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastRunAt: Date | null = null;
  
  constructor(
    private pg: PGlite,
    private businessId: string,
    private config: CleanupConfig
  ) {}
  
  start(): void
  stop(): void
  async runCleanup(): Promise<{ operationsDeleted: number; deadLetterDeleted: number }>
  getLastRunInfo(): { lastRunAt: Date | null; nextRunInMs: number }
}
```

**Step 4.2: Integrate with SyncAutoRunner**
```typescript
// In sync-auto-runner.ts or service-provider.tsx
private cleanupService: ScheduledCleanupService;

start() {
  // Start main sync
  this.startSyncTimer();
  // Start cleanup
  this.cleanupService.start();
}

stop() {
  this.stopSyncTimer();
  this.cleanupService.stop();
}
```

**Step 4.3: Configuration**
```typescript
// config.ts
export const CLEANUP_CONFIG: CleanupConfig = {
  completedRetentionDays: 30,
  deadLetterRetentionDays: 90,
  runIntervalHours: 24,
};
```

#### Testing Strategy
1. Unit test: Verify deletion of old records only
2. Unit test: Verify retention of recent records
3. Integration test: Start/stop cleanup service

#### Estimated Effort
- **Implementation**: 3-4 hours
- **Testing**: 2 hours

---

## Phase 3: Medium-term (Next Month)

### 5. Adaptive Batch Sizing

#### Overview
Make `BATCH_SIZE` dynamic based on network conditions and operation payload sizes to optimize for poor connectivity.

#### Current State
- `BATCH_SIZE = 100` is hardcoded in `packages/app/app/lib/sync/config.ts`
- No adaptation to network conditions

#### Files to Create/Modify

**New Files:**
- `packages/app/app/lib/sync/adaptive-batch-strategy.ts` - Dynamic sizing logic

**Modified Files:**
- `packages/app/app/lib/sync/sync-batch-processor.ts` - Use adaptive sizing
- `packages/app/app/lib/sync/config.ts` - Add adaptive config

#### Implementation Steps

**Step 5.1: Create AdaptiveBatchStrategy**
```typescript
export interface NetworkConditions {
  latencyMs: number;
  estimatedBandwidthKbps: number;
  failureRate: number;
}

export class AdaptiveBatchStrategy {
  private currentSize: number;
  private history: Array<{ size: number; success: boolean; durationMs: number }> = [];
  
  constructor(
    private minSize = 10,
    private maxSize = 200,
    private defaultSize = 50
  ) {
    this.currentSize = defaultSize;
  }
  
  getCurrentBatchSize(): number
  recordResult(batchSize: number, success: boolean, durationMs: number): void
  adjustForNetwork(conditions: NetworkConditions): void
  getMetrics(): { currentSize: number; successRate: number; avgDurationMs: number }
}
```

**Step 5.2: Network Detection**
```typescript
// Simple network quality detection
function detectNetworkQuality(): NetworkConditions {
  const connection = (navigator as any).connection;
  
  if (connection) {
    return {
      latencyMs: connection.rtt || 100,
      estimatedBandwidthKbps: connection.downlink ? connection.downlink * 1000 : 10000,
      failureRate: 0, // Calculated from recent attempts
    };
  }
  
  return { latencyMs: 100, estimatedBandwidthKbps: 10000, failureRate: 0 };
}
```

**Step 5.3: Integration with Batch Processor**
```typescript
// In sync-batch-processor.ts
private batchStrategy = new AdaptiveBatchStrategy();

async processBatch(operations: SyncOperation[]) {
  const batchSize = this.batchStrategy.getCurrentBatchSize();
  const chunks = chunk(operations, batchSize);
  
  for (const chunk of chunks) {
    const startTime = performance.now();
    try {
      await this.sendBatch(chunk);
      this.batchStrategy.recordResult(chunk.length, true, performance.now() - startTime);
    } catch (error) {
      this.batchStrategy.recordResult(chunk.length, false, performance.now() - startTime);
      throw error;
    }
  }
}
```

#### API Contract
```typescript
interface BatchMetrics {
  currentSize: number;
  successRate: number;  // 0-1
  avgDurationMs: number;
  networkConditions: NetworkConditions;
}
```

#### Testing Strategy
1. Unit tests for strategy adjustments
2. Mock network conditions → verify batch size changes
3. Integration test: Verify batch sizes vary with failures

#### Estimated Effort
- **Implementation**: 4-6 hours
- **Testing**: 2-3 hours

---

### 6. Missing Database Indexes

#### Overview
Add composite index on sync_operations for pending lookups to improve query performance.

#### Current State
From `packages/backend/src/db/schema/sync-operations.ts`:
```typescript
(table) => [
  index("idx_sync_operations_business_id").on(table.businessId),
  index("idx_sync_operations_status").on(table.status),
  index("idx_sync_operations_processed_at").on(table.processedAt),
  index("idx_sync_operations_sync_group_id").on(table.syncGroupId),
]
```

Missing: Composite index for (businessId, status, createdAt) used by `getChanges()`

#### Files to Modify
- `packages/backend/src/db/schema/sync-operations.ts`

#### Implementation Steps

**Step 6.1: Add Composite Index**
```typescript
// Add to sync-operations.ts table definition
(table) => [
  // ... existing indexes
  index("idx_sync_operations_business_status_created")
    .on(table.businessId, table.status, table.createdAt),
  index("idx_sync_operations_business_entity_status")
    .on(table.businessId, table.entity, table.status),
]
```

**Step 6.2: Add Frontend Indexes (PGlite)**
```typescript
// In sync-operations schema setup
export const CREATE_SYNC_OPERATIONS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_sync_ops_business_status_created 
ON sync_operations(business_id, status, created_at);
`;
```

#### Database Migration
```sql
-- Backend migration
CREATE INDEX idx_sync_operations_business_status_created 
ON sync_operations(business_id, status, created_at);

CREATE INDEX idx_sync_operations_business_entity_status 
ON sync_operations(business_id, entity, status);
```

#### Testing Strategy
1. EXPLAIN ANALYZE queries before/after index creation
2. Verify query plans use index scans instead of seq scans
3. Performance benchmark with 100k+ operations

#### Estimated Effort
- **Migration**: 1 hour
- **Performance verification**: 2 hours

---

### 7. Column Naming Alignment (Optional)

#### Overview
Align frontend/backend column names for consistency:
- Frontend uses `entity_type`, backend uses `entity`
- Frontend uses `operation`, backend uses `action`

#### Current State

| Context | Column | Notes |
|---------|--------|-------|
| Frontend | `entity_type` | In PGlite sync_operations |
| Backend | `entity` | In PostgreSQL sync_operations |
| Frontend | `operation` | In PGlite sync_operations |
| Backend | `action` | In PostgreSQL sync_operations |

#### Approach Options

**Option A: Frontend Changes (Recommended - Smaller Impact)**
- Rename frontend columns to match backend
- Requires frontend PGlite schema migration only
- No API changes

**Option B: Backend Changes**
- Rename backend columns to match frontend
- Requires API and database changes
- Higher risk

**Option C: Accept Status Quo**
- Document the inconsistency
- Add mapping layer in API client
- Zero risk

#### Files to Modify (Option A - Frontend)
- `packages/app/app/lib/sync/schema/sync-operations.schema.ts`
- `packages/app/app/lib/sync/types/operations.types.ts`
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts`
- All sync service files using column names

#### Implementation Steps (if proceeding)

**Step 7.1: Update Frontend Schema**
```typescript
// Change column names to match backend
export const CREATE_SYNC_OPERATIONS_TABLE = `
  entity TEXT NOT NULL,  -- was: entity_type
  action TEXT NOT NULL,  -- was: operation
  ...
`;
```

**Step 7.2: Add Migration Script**
```typescript
// Run on app startup
export const MIGRATE_ENTITY_TYPE_TO_ENTITY = `
  ALTER TABLE sync_operations RENAME COLUMN entity_type TO entity;
  ALTER TABLE sync_operations RENAME COLUMN operation TO action;
`;
```

**Step 7.3: Update All References**
- Update `SyncOperationRecord` interface
- Update all SQL queries in `pg-sync-queue.ts`
- Update all service methods

#### Estimated Effort
- **Schema changes**: 2 hours
- **Code updates**: 4-6 hours
- **Testing**: 3-4 hours
- **Total**: 9-12 hours (defer if low priority)

---

## Execution Order & Dependencies

```
Phase 1 (Week 1)
├── 1. Backend DLQ ────────────────────────────┐
│   └── Depends on: None                        │
├── 2. Sync Health Metrics ────────────────────┤
│   └── Depends on: None                        │
│   └── Can parallel with DLQ                   │
└───────────────────────────────────────────────┘

Phase 2 (Weeks 2-3)
├── 3. PullService Refactor ───────────────────┐
│   └── Depends on: None                        │
├── 4. Automated Cleanup ────────────────────────┤
│   └── Depends on: None                        │
│   └── Can parallel with PullService refactor  │
└────────────────────────────────────────────────┘

Phase 3 (Month 2)
├── 5. Adaptive Batch Sizing ──────────────────┐
│   └── Depends on: PullService refactor        │
├── 6. Database Indexes ───────────────────────┤
│   └── Depends on: None                        │
├── 7. Column Naming Alignment ────────────────┤
│   └── Depends on: None                        │
│   └── Optional / Low Priority                 │
└────────────────────────────────────────────────┘
```

---

## Risk Assessment Per Phase

### Phase 1 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| DLQ table performance | Low | Medium | Add indexes; monitor query times |
| Metrics query slow | Medium | Medium | Add time-based index; materialized view if needed |

### Phase 2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| PullService regression | Medium | High | Comprehensive test coverage; feature flags |
| Cleanup deletes wrong data | Low | High | Strict date filtering; soft delete first |

### Phase 3 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Adaptive batch too aggressive | Low | Medium | Set minimum bounds; monitor failure rates |
| Index creation slow | Medium | Low | Run during low traffic; CONCURRENTLY option |
| Naming alignment breaks sync | Medium | High | Thorough testing; staged rollout |

---

## Rollback Strategy

### Phase 1 Rollback
```bash
# DLQ rollback
cd packages/backend
bun run db:drop --table=sync_dead_letter

# Revert code
git revert <dlq-commit>
```

### Phase 2 Rollback
```bash
# PullService - restore from git
git checkout HEAD~1 -- packages/app/app/lib/sync/pull-service.ts

# Cleanup - just stop the service
# No schema changes to rollback
```

### Phase 3 Rollback
```bash
# Batch sizing - revert code
git revert <adaptive-batch-commit>

# Indexes - drop new indexes
cd packages/backend
bun run db:drop-index --name=idx_sync_operations_business_status_created

# Naming - restore from backup
# Or run reverse migration
```

---

## Summary Timeline

| Phase | Item | Effort | Week |
|-------|------|--------|------|
| 1 | Backend DLQ | 8h | 1 |
| 1 | Sync Health Metrics | 5h | 1 |
| 2 | PullService Refactor | 13h | 2 |
| 2 | Automated Cleanup | 5h | 2-3 |
| 3 | Adaptive Batch Sizing | 8h | 4 |
| 3 | Database Indexes | 3h | 4 |
| 3 | Column Naming (Optional) | 12h | 5 |

**Total Required Effort**: ~42 hours (excluding optional naming alignment)
**Recommended Team**: 1 senior + 1 mid-level developer
**Buffer**: Add 20% for testing and unexpected issues

---

## Appendix: Key File References

### Backend
- `packages/backend/src/db/schema/sync-operations.ts`
- `packages/backend/src/services/sync/framework/SyncEngine.ts`
- `packages/backend/src/services/sync/sync.service.ts`
- `packages/backend/src/api/sync.ts`

### Frontend
- `packages/app/app/lib/sync/pull-service.ts`
- `packages/app/app/lib/sync/sync-auto-runner.ts`
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts`
- `packages/app/app/lib/sync/config.ts`

### Shared
- `packages/shared/src/sync-config.ts`
