# T-001: Establish Library Boundaries and Contracts

## Objective

Create the library package structure and define core types/interfaces that both frontend and backend will depend on. This task establishes the foundational contracts that enable parallel extraction of frontend and backend adapters.

## Linked Requirements

- **FR-001:** Core Types and Interfaces
- **FR-002:** Sync Queue Abstraction (interface only)
- **FR-009:** Observability Interface (interface only)
- **FR-012:** Operation Coalescing
- **NFR-001:** Tree-Shakeable Bundle
- **NFR-002:** TypeScript Support
- **NFR-003:** Runtime Compatibility
- **NFR-004:** Minimal Dependencies

## Concrete Files and Directories

### New Files to Create

```
packages/drizzle-sync/
├── src/
│   ├── core/
│   │   ├── types.ts              # SyncOperation, SyncStatus, SyncResult, DeadLetterOperation
│   │   ├── interfaces.ts         # ISyncQueue, ISyncHandler, ISyncLogger
│   │   ├── priority.ts           # Entity priority configuration pattern
│   │   ├── coalesce.ts           # Operation coalescing logic
│   │   ├── backoff.ts            # Exponential backoff utilities
│   │   └── index.ts              # Core entrypoint
│   ├── shared/
│   │   ├── constants.ts          # OPERATION_STATUS constants
│   │   └── index.ts
│   └── index.ts                  # Main library entrypoint
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

### Source Files to Reference

| Source File | Purpose |
|-------------|---------|
| `packages/app/app/lib/sync/types/operations.types.ts` | Copy `SyncOperationRecord`, `DeadLetterOperationRecord` types |
| `packages/app/app/lib/sync/types/conflict.types.ts` | Copy conflict detection types |
| `packages/app/app/lib/sync/config.ts` | Copy `OPERATION_STATUS` constants |
| `packages/app/app/lib/sync/queue/coalesce.ts` | Extract `getCoalescePlan()` logic |
| `packages/app/app/lib/sync/backoff.ts` | Extract `withRetry()` and backoff utilities |
| `packages/app/app/lib/sync/interfaces.ts` | Reference for `ISyncQueue` interface |
| `packages/shared/src/sync-config.ts` | Reference for entity priority pattern |

## Implementation Outline

### Step 1: Create Package Structure

```bash
mkdir -p packages/drizzle-sync/src/{core,shared}
touch packages/drizzle-sync/src/core/{types,interfaces,priority,coalesce,backoff,index}.ts
touch packages/drizzle-sync/src/shared/{constants,index}.ts
touch packages/drizzle-sync/src/index.ts
touch packages/drizzle-sync/{package.json,tsconfig.json,tsup.config.ts,README.md}
```

### Step 2: Define Core Types (src/core/types.ts)

```typescript
// Extract from packages/app/app/lib/sync/types/operations.types.ts

export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncStatusType = 'pending' | 'processing' | 'syncing' | 'completed' | 'failed' | 'conflict' | 'dead_letter';

export interface SyncOperation {
  id: string;
  businessId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  syncGroupId?: string;
  version: number;
  status: SyncStatusType;
  syncAttempts: number;
  lastError?: string;
  lastAttemptAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  idempotencyKey: string;
  success: boolean;
  error?: string;
  conflict?: ConflictPayload;
  serverTimestamp: string;
}

export interface ConflictPayload {
  entityType: string;
  entityId: string;
  clientVersion: number;
  serverVersion: number;
  serverData: Record<string, unknown>;
}

export interface DeadLetterOperation extends SyncOperation {
  movedToDeadLetterAt: string;
  reason: string;
}

export interface SyncBatchResult {
  results: SyncResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  };
}
```

### Step 3: Define Core Interfaces (src/core/interfaces.ts)

```typescript
// Extract from packages/app/app/lib/sync/interfaces.ts and backend patterns

import type { SyncOperation, SyncResult, SyncStatusType } from './types';

export interface ISyncQueue {
  enqueue(params: EnqueueParams): Promise<string>;
  dequeue(limit?: number): Promise<SyncOperation[]>;
  markProcessing(id: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  getStatus(): Promise<SyncStatus>;
}

export interface EnqueueParams {
  entity_type: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  syncGroupId?: string;
  idempotencyKey?: string;
  fastPath?: boolean;
}

export interface SyncStatus {
  pending: number;
  processing: number;
  syncing: number;
  completed: number;
  failed: number;
  conflict: number;
  deadLetter: number;
}

export interface ISyncHandler {
  readonly entityType: string;
  execute(ctx: SyncContext, operation: SyncOperation, tx?: unknown): Promise<HandlerResult>;
  validateBusinessRules?(ctx: SyncContext, payload: Record<string, unknown>): Promise<void>;
}

export interface SyncContext {
  businessId: string;
  userId: string;
  correlationId?: string;
}

export interface HandlerResult {
  success: boolean;
  idempotencyKey: string;
  error?: string;
  conflict?: ConflictPayload;
  serverTimestamp: string;
}

export interface ISyncLogger {
  info(prefix: string, message: string, data?: unknown): void;
  warn(prefix: string, message: string, data?: unknown): void;
  error(prefix: string, message: string, data?: unknown): void;
  getEntries?(): SyncLogEntry[];
}

export interface SyncLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  prefix: string;
  message: string;
  data?: unknown;
}
```

### Step 4: Extract Coalescing Logic (src/core/coalesce.ts)

```typescript
// Extract from packages/app/app/lib/sync/queue/coalesce.ts

import type { SyncOperation } from './types';

export type CoalescePlanType = 'cancel' | 'merge' | 'replace' | 'keep-existing' | 'keep-new';

export interface CoalescePlan {
  type: CoalescePlanType;
  operation?: 'create' | 'update' | 'delete';
  payload?: Record<string, unknown>;
}

/**
 * Determine how to coalesce a new operation with an existing pending operation.
 */
export function getCoalescePlan(
  existing: SyncOperation,
  newParams: { operation: string; data: Record<string, unknown> }
): CoalescePlan {
  const { operation: existingOp } = existing;
  const { operation: newOp, data: newData } = newParams;

  // Create + Delete = Cancel (entity never reached server)
  if (existingOp === 'create' && newOp === 'delete') {
    return { type: 'cancel' };
  }

  // Update + Update = Merge (combine payloads)
  if (existingOp === 'update' && newOp === 'update') {
    return {
      type: 'merge',
      operation: 'update',
      payload: { ...existing.payload, ...newData },
    };
  }

  // Create + Update = Create with merged payload
  if (existingOp === 'create' && newOp === 'update') {
    return {
      type: 'merge',
      operation: 'create',
      payload: { ...existing.payload, ...newData },
    };
  }

  // Delete + Create = Update (recreate)
  if (existingOp === 'delete' && newOp === 'create') {
    return {
      type: 'replace',
      operation: 'update',
      payload: newData,
    };
  }

  // Default: keep new operation
  return {
    type: 'replace',
    operation: newOp as 'create' | 'update' | 'delete',
    payload: newData,
  };
}
```

### Step 5: Extract Backoff Utilities (src/core/backoff.ts)

```typescript
// Extract from packages/app/app/lib/sync/backoff.ts

export interface BackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
}

export function calculateBackoff(
  attempt: number,
  options: BackoffOptions = {}
): number {
  const { baseDelayMs = 1000, maxDelayMs = 30000, jitter = true } = options;
  
  // Exponential backoff with cap
  let delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  
  // Add jitter to prevent thundering herd
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
  context?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelayMs = 100, onRetry, context = 'unknown' } = options;
  
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        onRetry?.(attempt + 1, lastError);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
  }
  
  throw lastError;
}
```

### Step 6: Define Priority Configuration (src/core/priority.ts)

```typescript
// Pattern from packages/shared/src/sync-config.ts

export interface EntityPriorityConfig {
  [entityType: string]: number;
}

/**
 * Default priority tiers for sync entity processing.
 * Lower numbers = processed first (parents before children).
 */
export const DEFAULT_ENTITY_PRIORITIES: EntityPriorityConfig = {
  // Tier 1: Root/parent entities
  sales: 1,
  purchases: 1,
  products: 1,
  customers: 1,
  suppliers: 1,
  customer_groups: 1,
  distribuciones: 1,
  tags: 1,
  visitas: 1,
  abonos: 1,
  
  // Tier 2: Child entities
  sale_items: 2,
  purchase_items: 2,
  product_variants: 2,
  customer_group_members: 2,
  customer_tags: 2,
  distribucion_items: 2,
};

export function getEntityPriority(
  entityType: string,
  config: EntityPriorityConfig = DEFAULT_ENTITY_PRIORITIES
): number {
  return config[entityType] ?? 99;
}
```

### Step 7: Define Constants (src/shared/constants.ts)

```typescript
// Extract from packages/app/app/lib/sync/config.ts

export const OPERATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SYNCING: 'syncing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CONFLICT: 'conflict',
  DEAD_LETTER: 'dead_letter',
} as const;

export const MAX_SYNC_RETRIES = 5;
export const SYNC_BATCH_SIZE = 100;
export const DEFAULT_SYNC_INTERVAL_MS = 30000;
```

### Step 8: Create Entrypoints

```typescript
// src/core/index.ts
export * from './types';
export * from './interfaces';
export * from './priority';
export * from './coalesce';
export * from './backoff';

// src/shared/index.ts
export * from './constants';

// src/index.ts
export * from './core';
export * from './shared';
```

### Step 9: Configure Package (package.json)

```json
{
  "name": "@avileo/drizzle-sync",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./core": {
      "import": "./dist/core/index.js",
      "types": "./dist/core/index.d.ts"
    },
    "./shared": {
      "import": "./dist/shared/index.js",
      "types": "./dist/shared/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 10: Configure Build (tsup.config.ts)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'shared/index': 'src/shared/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Interface mismatches with existing implementations | Copy types exactly from source files first, then generalize |
| Circular dependencies between core and shared | Keep shared as pure constants, no imports from core |
| TypeScript strict mode failures | Run `tsc --noEmit` after each file creation |

## Validation Criteria

- [ ] `bun run build` succeeds in `packages/drizzle-sync/`
- [ ] Types importable: `import { SyncOperation } from '@avileo/drizzle-sync/core'`
- [ ] No runtime dependencies in `core` entrypoint (check `package.json`)
- [ ] TypeScript strict mode passes: `bun run typecheck`
- [ ] Tree-shakeable: `core` entrypoint has no side effects
- [ ] All types exported correctly from main entrypoint
