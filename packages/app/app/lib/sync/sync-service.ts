import type { PGlite } from "@electric-sql/pglite";
import {
  ENTITY_PRIORITIES,
  SELF_HEAL_INSERTABLE,
  SYNC_STATUS_TRACKED,
} from "@avileo/shared";
import {
  MAX_RETRIES,
  BATCH_SIZE,
  SYNC_INTERVAL_MS,
  OPERATION_STATUS,
  CONFLICT_STRATEGY,
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  type OperationStatus,
  type ConflictStrategy,
} from "./config";
import type { ISyncQueue } from "./queue/sync-queue";
import type { ISyncHttpClient } from "./http/sync-http-client";
import { PgSyncQueue } from "./queue/pg-sync-queue";
import { FetchSyncHttpClient } from "./http/fetch-sync-http-client";
import { checkAndMigrateSchema } from "./schema-version";

/**
 * Generate a correlation ID for tracking an operation across the stack
 */
function generateCorrelationId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface EnqueueParams {
  entity_type: string;
  operation: "create" | "update" | "delete";
  entityId: string;
  data: Record<string, unknown>;
  idempotencyKey?: string;
  syncGroupId?: string;
}

export interface SyncOperationRecord {
  id: string;
  business_id: string;
  entity_type: string;
  operation: "create" | "update" | "delete";
  entity_id: string;
  payload: unknown;
  status: OperationStatus;
  version: number;
  sync_attempts: number;
  last_error: string | null;
  last_attempt_at: string | null;
  idempotency_key: string | null;
  sync_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeadLetterOperationRecord {
  id: string;
  business_id: string;
  operation_id: string;
  entity_type: string;
  operation: "create" | "update" | "delete";
  entity_id: string;
  data: string;
  error: string;
  sync_attempts: number;
  original_error: string | null;
  created_at: string;
}

export interface SyncStatus {
  pending: number;
  processing: number;
  syncing: number;
  completed: number;
  failed: number;
  conflict: number;
  deadLetter: number;
  total: number;
}

export interface BatchSyncResponse {
  results: Array<{
    idempotencyKey: string;
    success: boolean;
    error?: string;
    conflict?: {
      serverData: Record<string, unknown>;
      suggestedMerge: Record<string, unknown>;
    };
  }>;
}

export interface ConflictResolution {
  resolution: ConflictStrategy;
  mergedData?: Record<string, unknown>;
}

export interface BackendConflict {
  id: string;
  businessId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localVersion: number;
  serverVersion: number;
  status: "pending" | "resolved";
  resolution: "server" | "local" | "merge" | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface BackendConflictListResponse {
  success: boolean;
  data: {
    conflicts: BackendConflict[];
    pendingCount: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export interface BackendConflictResponse {
  success: boolean;
  data: BackendConflict;
}

type SyncApiResult = {
  idempotencyKey: string;
  success: boolean;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
};

type SyncOperationType = EnqueueParams["operation"];

type CoalescePlan =
  | {
      type: "merge";
      operation: SyncOperationType;
      payload: Record<string, unknown>;
    }
  | {
      type: "replace";
      operation: SyncOperationType;
      payload: Record<string, unknown>;
    }
  | {
      type: "cancel";
    }
  | {
      type: "none";
    };

const SYNC_STATUS_ENTITY_TABLES: ReadonlySet<string> = new Set(SYNC_STATUS_TRACKED);

const SELF_HEAL_INSERTABLE_ENTITIES: ReadonlySet<string> = new Set(SELF_HEAL_INSERTABLE);

function parsePayload(payload: unknown): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof payload === "object") {
    return payload as Record<string, unknown>;
  }
  return {};
}

/**
 * Date field names that should be normalized to ISO strings
 */
const DATE_FIELDS_SYNC = new Set([
  "saleDate",
  "deliveryDate",
  "orderDate",
  "cancelledAt",
  "refundDate",
  "createdAt",
  "updatedAt",
  "purchaseDate",
  "sale_date",
  "delivery_date",
  "order_date",
  "cancelled_at",
  "refund_date",
  "created_at",
  "updated_at",
  "purchase_date",
]);

/**
 * Recursively converts Date objects to ISO strings for safe JSON serialization.
 * This fixes the bug where Date.toString() produces "Tue Mar 24 2026 19:00:00 GMT-0500"
 * instead of "2026-03-25T00:00:00.000Z".
 * 
 * Simplified: Now converts ALL Date instances, not just whitelisted fields.
 */
function normalizeDatesToISO(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeDatesToISO(item));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Convert any Date instance to ISO string
      result[key] = normalizeDatesToISO(value);
    }
    return result;
  }

  return obj;
}

function normalizeStatusKey(status: string): keyof SyncStatus | null {
  switch (status) {
    case OPERATION_STATUS.PENDING:
      return "pending";
    case OPERATION_STATUS.PROCESSING:
      return "processing";
    case OPERATION_STATUS.SYNCING:
      return "syncing";
    case OPERATION_STATUS.COMPLETED:
      return "completed";
    case OPERATION_STATUS.FAILED:
      return "failed";
    case OPERATION_STATUS.CONFLICT:
      return "conflict";
    case OPERATION_STATUS.DEAD_LETTER:
      return "deadLetter";
    default:
      return null;
  }
}

function buildPlaceholders(count: number, offset: number = 1): string {
  return Array.from({ length: count }, (_, index) => `$${index + offset}`).join(", ");
}

/**
 * Error classification system for structured error handling
 */
export enum SyncErrorCode {
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN'
}

export interface ClassifiedError {
  code: SyncErrorCode;
  isRetryable: boolean;
  isSelfHealable: boolean;
  originalError: string;
}

/**
 * Classify an error using regex patterns instead of brittle string matching
 */
export function classifyError(error: string): ClassifiedError {
  const lower = error.toLowerCase();
  
  const patterns: Array<{
    code: SyncErrorCode;
    patterns: RegExp[];
    isRetryable: boolean;
    isSelfHealable: boolean;
  }> = [
    {
      code: SyncErrorCode.RECORD_NOT_FOUND,
      patterns: [
        /record.*not found/i,
        /no encontrad[oa]/i,
        /does not exist/i,
        /no existe/i,
        /404/i,
        /not found/i
      ],
      isRetryable: false,
      isSelfHealable: true
    },
    {
      code: SyncErrorCode.VERSION_CONFLICT,
      patterns: [
        /version.*conflict/i,
        /optimistic.*lock/i,
        /concurrent.*modification/i,
        /409/i
      ],
      isRetryable: false,
      isSelfHealable: false
    },
    {
      code: SyncErrorCode.NETWORK_ERROR,
      patterns: [
        /network.*error/i,
        /timeout/i,
        /connection.*refused/i,
        /fetch.*failed/i,
        /abort/i,
        /offline/i
      ],
      isRetryable: true,
      isSelfHealable: false
    },
    {
      code: SyncErrorCode.PERMISSION_DENIED,
      patterns: [
        /permission.*denied/i,
        /unauthorized/i,
        /forbidden/i,
        /403/i,
        /401/i
      ],
      isRetryable: false,
      isSelfHealable: false
    },
    {
      code: SyncErrorCode.VALIDATION_ERROR,
      patterns: [
        /validation.*failed/i,
        /invalid.*input/i,
        /required.*field/i,
        /constraint.*violated/i,
        /400/i
      ],
      isRetryable: false,
      isSelfHealable: false
    }
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

/**
 * @deprecated Use classifyError() instead for structured error handling
 */
function isNotFoundError(error: string): boolean {
  const classified = classifyError(error);
  return classified.code === SyncErrorCode.RECORD_NOT_FOUND;
}

function getCoalescePlan(
  existing: SyncOperationRecord,
  incoming: EnqueueParams
): CoalescePlan {
  const existingPayload = parsePayload(existing.payload);

  if (existing.operation === "create") {
    if (incoming.operation === "create" || incoming.operation === "update") {
      return {
        type: "merge",
        operation: "create",
        payload: { ...existingPayload, ...incoming.data },
      };
    }

    if (incoming.operation === "delete") {
      return { type: "cancel" };
    }
  }

  if (existing.operation === "update") {
    if (incoming.operation === "update") {
      return {
        type: "merge",
        operation: "update",
        payload: { ...existingPayload, ...incoming.data },
      };
    }

    if (incoming.operation === "delete") {
      return {
        type: "replace",
        operation: "delete",
        payload: incoming.data,
      };
    }
  }

  return { type: "none" };
}

function validateEntityTableName(entityType: string): string | null {
  return SYNC_STATUS_ENTITY_TABLES.has(entityType) ? entityType : null;
}

export class SyncService {
  private pg: PGlite;
  private businessId: string;
  private authToken: string;
  private queue: ISyncQueue;
  private httpClient: ISyncHttpClient;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private consecutiveFailures = 0;
  private currentBackoff = 0;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor(
    pg: PGlite,
    businessId: string,
    authToken: string,
    options?: {
      queue?: ISyncQueue;
      httpClient?: ISyncHttpClient;
    }
  ) {
    this.pg = pg;
    this.businessId = businessId;
    this.authToken = authToken;
    // Use injected dependencies or create default implementations
    this.queue = options?.queue ?? new PgSyncQueue(pg, businessId);
    this.httpClient = options?.httpClient ?? new FetchSyncHttpClient(authToken, businessId);
  }

  /**
   * Initialize the sync service (creates tables, runs migrations)
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    // Run schema migrations first
    await checkAndMigrateSchema(this.pg);
    
    // Initialize tables
    await this.initTables();
    
    this.isInitialized = true;
    console.log("[SyncService] Initialized successfully");
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("SyncService not initialized. Call initialize() first.");
    }
  }

  private getBackoffDelay(): number {
    if (this.consecutiveFailures === 0) return 0;

    return Math.min(
      BACKOFF_BASE_MS * Math.pow(2, this.consecutiveFailures - 1),
      BACKOFF_MAX_MS
    );
  }

  private async applyBackoff(): Promise<void> {
    if (this.currentBackoff > 0) {
      console.log(
        `[SyncService] Waiting ${this.currentBackoff}ms due to previous failures`
      );
      await new Promise((resolve) => setTimeout(resolve, this.currentBackoff));
    }
  }

  private async initTables(): Promise<void> {
    await this.pg.exec(`
      CREATE TABLE IF NOT EXISTS sync_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        sync_group_id TEXT,
        operation TEXT NOT NULL,
        payload JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        version INTEGER NOT NULL DEFAULT 1,
        sync_attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        last_attempt_at TIMESTAMP,
        idempotency_key TEXT UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS business_id UUID;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS entity_id TEXT;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS sync_group_id TEXT;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS payload JSONB;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS last_error TEXT;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_sync_operations_business ON sync_operations(business_id);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(business_id, entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(business_id, status);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_group ON sync_operations(business_id, sync_group_id);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_idempotency ON sync_operations(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_created ON sync_operations(created_at);
    `);

    await this.pg.query(
      `UPDATE sync_operations SET business_id = $1 WHERE business_id IS NULL`,
      [this.businessId]
    );

    await this.pg.exec(`
      CREATE TABLE IF NOT EXISTS sync_dead_letter (
        id TEXT PRIMARY KEY,
        business_id UUID NOT NULL,
        operation_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        operation TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        error TEXT NOT NULL,
        sync_attempts INTEGER NOT NULL,
        original_error TEXT,
        created_at TEXT NOT NULL
      );
      ALTER TABLE sync_dead_letter ADD COLUMN IF NOT EXISTS business_id UUID;
      CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_business ON sync_dead_letter(business_id);
      CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_operation_id ON sync_dead_letter(operation_id);
    `);

    await this.pg.query(
      `UPDATE sync_dead_letter SET business_id = $1 WHERE business_id IS NULL`,
      [this.businessId]
    );
  }

  async enqueue(params: EnqueueParams): Promise<string> {
    this.ensureInitialized();
    return this.queue.enqueue(params);
  }

  async processPending(): Promise<{ processed: number; failed: number; conflicts: number }> {
    if (this.isProcessing) {
      console.log(`[SYNC] ⏳ Already processing, skipping`);
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      await this.applyBackoff();

      console.log(`[SYNC] 📥 Fetching pending operations...`);

      const pendingOps = await this.pg.query<SyncOperationRecord>(
        `SELECT *
         FROM sync_operations
         WHERE business_id = $1
           AND status IN ($2, $3)
           AND sync_attempts < $4
          ORDER BY
            CASE entity_type
              WHEN 'customers' THEN 1
              WHEN 'products' THEN 1
              WHEN 'product_variants' THEN 2
              WHEN 'tags' THEN 1
              WHEN 'customer_groups' THEN 1
              WHEN 'customer_group_members' THEN 2
              WHEN 'suppliers' THEN 1
              WHEN 'sales' THEN 3
              WHEN 'abonos' THEN 3
              WHEN 'purchases' THEN 3
              WHEN 'distribuciones' THEN 3
              ELSE 4
            END,
           created_at ASC
         LIMIT ${BATCH_SIZE}`,
        [
          this.businessId,
          OPERATION_STATUS.PENDING,
          OPERATION_STATUS.FAILED,
          MAX_RETRIES,
         ]
      );

      // Log queue status
      const entityCounts = pendingOps.rows.reduce((acc, op) => {
        acc[op.entity_type] = (acc[op.entity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`[SYNC] 📋 Queue status:`, {
        total: pendingOps.rows.length,
        byEntity: entityCounts,
        maxRetries: MAX_RETRIES,
      });

      if (pendingOps.rows.length === 0) {
        console.log(`[SYNC] ✅ No pending operations`);
        return { processed: 0, failed: 0, conflicts: 0 };
      }

      // Group operations by sync_group_id so related ops are sent together
      const grouped = new Map<string, SyncOperationRecord[]>();
      const ungrouped: SyncOperationRecord[] = [];

      for (const op of pendingOps.rows) {
        if (op.sync_group_id) {
          const group = grouped.get(op.sync_group_id);
          if (group) {
            group.push(op);
          } else {
            grouped.set(op.sync_group_id, [op]);
          }
        } else {
          ungrouped.push(op);
        }
      }

      // For grouped operations, also pull in any siblings not yet in the query
      // (e.g. if BATCH_SIZE cut off part of a group)
      for (const [groupId, ops] of grouped) {
        const allGroupOps = await this.pg.query<SyncOperationRecord>(
          `SELECT *
           FROM sync_operations
           WHERE business_id = $1
             AND sync_group_id = $2
             AND status IN ($3, $4)
             AND sync_attempts < $5
           ORDER BY created_at ASC`,
          [
            this.businessId,
            groupId,
            OPERATION_STATUS.PENDING,
            OPERATION_STATUS.FAILED,
            MAX_RETRIES,
          ]
        );
        // Replace with the complete set (deduplicated)
        grouped.set(groupId, allGroupOps.rows);
      }

      // Sort operations within each group to ensure correct dependency order
      // Parent entities must be processed before child entities
      for (const [groupId, ops] of grouped) {
        const sortedOps = [...ops].sort((a, b) => {
          const priorityA = ENTITY_PRIORITIES[a.entity_type as keyof typeof ENTITY_PRIORITIES] ?? 99;
          const priorityB = ENTITY_PRIORITIES[b.entity_type as keyof typeof ENTITY_PRIORITIES] ?? 99;
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          // If same priority, maintain creation order
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        grouped.set(groupId, sortedOps);
      }

      // Process each group as a single batch
      for (const [groupId, ops] of grouped) {
        try {
          for (const op of ops) {
            await this.markProcessing(op.id);
          }

          console.log(`[SYNC] Sending grouped batch (syncGroupId=${groupId}, count=${ops.length})`);
          const response = await this.sendBatchToServer(ops);

          for (const op of ops) {
            const result = response.results.find(
              (item) => item.idempotencyKey === (op.idempotency_key ?? op.id)
            );

            if (!result) {
              await this.markFailed(op.id, "Batch sync returned no result for operation");
              failed++;
              continue;
            }

            if (result.conflict) {
              await this.markConflict(op.id, result.conflict);
              conflicts++;
            } else if (result.success) {
              await this.markCompleted(op.id);
              processed++;
            } else {
              await this.markFailed(op.id, result.error || "Unknown error");
              failed++;
            }
          }

          // Reset backoff on any group success
          if (ops.length > 0) {
            this.consecutiveFailures = 0;
            this.currentBackoff = 0;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          for (const op of ops) {
            await this.markFailed(op.id, errorMessage);
          }
          failed += ops.length;
        }
      }

      // Process ungrouped operations individually (original behavior)
      for (const op of ungrouped) {
        try {
          await this.markProcessing(op.id);
          const result = await this.syncOperation(op);

          if (result.conflict) {
            await this.markConflict(op.id, result.conflict);
            conflicts++;
          } else if (result.success) {
            await this.markCompleted(op.id);
            processed++;
            this.consecutiveFailures = 0;
            this.currentBackoff = 0;
          } else {
            await this.markFailed(op.id, result.error || "Unknown error");
            failed++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.markFailed(op.id, errorMessage);
          failed++;
        }
      }

      if (failed > 0) {
        this.consecutiveFailures++;
        this.currentBackoff = this.getBackoffDelay();
      }

      console.log(`[SYNC] 📤 Processing complete:`, {
        processed,
        failed,
        conflicts,
        consecutiveFailures: this.consecutiveFailures,
        backoffMs: this.currentBackoff,
      });
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed, conflicts };
  }

  async processGroup(groupId: string): Promise<{ success: boolean; errors: string[] }> {
    const groupOps = await this.pg.query<SyncOperationRecord>(
      `SELECT *
       FROM sync_operations
       WHERE business_id = $1
         AND sync_group_id = $2
         AND status IN ($3, $4)
       ORDER BY created_at ASC`,
      [
        this.businessId,
        groupId,
        OPERATION_STATUS.PENDING,
        OPERATION_STATUS.FAILED,
      ]
    );

    if (groupOps.rows.length === 0) {
      return { success: true, errors: [] };
    }

    try {
      const response = await this.sendBatchToServer(groupOps.rows);
      const errors: string[] = [];

      for (const op of groupOps.rows) {
        const result = response.results.find(
          (item) => item.idempotencyKey === (op.idempotency_key ?? op.id)
        );

        if (!result) {
          await this.markFailed(op.id, "Batch sync returned no result for operation");
          errors.push("Batch sync returned no result for operation");
          continue;
        }

        if (result.success) {
          await this.markCompleted(op.id);
        } else if (result.conflict) {
          await this.markConflict(op.id, result.conflict);
        } else {
          const error = result.error || "Batch sync failed";
          await this.markFailed(op.id, error);
          errors.push(error);
        }
      }

      return { success: errors.length === 0, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      for (const op of groupOps.rows) {
        await this.markFailed(op.id, errorMessage);
      }

      return { success: false, errors: [errorMessage] };
    }
  }

  async resolveConflict(
    operationId: string,
    resolution: ConflictStrategy,
    mergedData?: Record<string, unknown>
  ): Promise<boolean> {
    const op = await this.getOperation(operationId);
    if (!op || op.status !== OPERATION_STATUS.CONFLICT) {
      return false;
    }

    switch (resolution) {
      case CONFLICT_STRATEGY.SERVER_WINS:
        await this.markCompleted(operationId);
        return true;

      case CONFLICT_STRATEGY.CLIENT_WINS:
        await this.markProcessing(operationId);
        try {
          const result = await this.syncOperation({
            ...op,
            payload: mergedData || parsePayload(op.payload),
          });
          if (result.success) {
            await this.markCompleted(operationId);
            return true;
          }
          await this.markFailed(operationId, result.error || "Client-wins resolution failed");
          return false;
        } catch (error) {
          await this.markFailed(
            operationId,
            error instanceof Error ? error.message : String(error)
          );
          return false;
        }

      case CONFLICT_STRATEGY.FIELD_MERGE:
        if (!mergedData) {
          return false;
        }
        await this.markProcessing(operationId);
        try {
          const result = await this.syncOperation({
            ...op,
            payload: mergedData,
          });
          if (result.success) {
            await this.markCompleted(operationId);
            return true;
          }
          await this.markFailed(operationId, result.error || "Field-merge resolution failed");
          return false;
        } catch (error) {
          await this.markFailed(
            operationId,
            error instanceof Error ? error.message : String(error)
          );
          return false;
        }

      case CONFLICT_STRATEGY.MANUAL:
        return false;

      default:
        return false;
    }
  }

  async getFailedOperations(): Promise<SyncOperationRecord[]> {
    this.ensureInitialized();
    return this.queue.getFailedOperations(100);
  }

  async getProblemOperations(): Promise<SyncOperationRecord[]> {
    this.ensureInitialized();
    // Get pending, failed, and conflict operations
    const pending = await this.queue.getPending(50);
    const failed = await this.queue.getFailedOperations(50);
    // Combine and deduplicate
    const seen = new Set<string>();
    const result: SyncOperationRecord[] = [];
    for (const op of [...pending, ...failed]) {
      if (!seen.has(op.id)) {
        seen.add(op.id);
        result.push(op);
      }
    }
    return result.slice(0, 50);
  }

  async getDeadLetterOperations(): Promise<DeadLetterOperationRecord[]> {
    this.ensureInitialized();
    return this.queue.getDeadLetterOperations(100);
  }

  async retryOperation(operationId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.queue.retryOperation(operationId);
  }

  async retryDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    this.ensureInitialized();
    const record = await this.queue.getDeadLetterOperations(100).then(ops => 
      ops.find(op => op.id === deadLetterId)
    );
    if (!record) {
      return false;
    }

    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           sync_attempts = 0,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND business_id = $3`,
      [OPERATION_STATUS.PENDING, record.operation_id, this.businessId]
    );

    await this.pg.query(
      `DELETE FROM sync_dead_letter WHERE id = $1 AND business_id = $2`,
      [deadLetterId, this.businessId]
    );

    return true;
  }

  async deleteDeadLetterOperation(deadLetterId: string): Promise<boolean> {
    this.ensureInitialized();
    const record = await this.queue.getDeadLetterOperations(100).then(ops => 
      ops.find(op => op.id === deadLetterId)
    );
    if (!record) {
      return false;
    }

    await this.pg.query(
      `DELETE FROM sync_dead_letter WHERE id = $1 AND business_id = $2`,
      [deadLetterId, this.businessId]
    );

    return true;
  }

  async clearDeadLetterOperations(): Promise<number> {
    this.ensureInitialized();
    const records = await this.queue.getDeadLetterOperations(1000);
    if (records.length === 0) {
      return 0;
    }

    await this.pg.query(`DELETE FROM sync_dead_letter WHERE business_id = $1`, [this.businessId]);
    return records.length;
  }

  async getStatus(): Promise<SyncStatus> {
    this.ensureInitialized();
    return this.queue.getStatus();
  }

  async logDetailedStatus(): Promise<void> {
    console.log(`[SYNC] 📊 Detailed Queue Status for business: ${this.businessId}`);

    const status = await this.getStatus();
    console.log(`[SYNC] Summary:`, status);

    const byEntity = await this.pg.query<{ entity_type: string; status: string; count: string }>(
      `SELECT entity_type, status, COUNT(*) as count
       FROM sync_operations
       WHERE business_id = $1
       GROUP BY entity_type, status
       ORDER BY entity_type, status`,
      [this.businessId]
    );

    const entityStatus: Record<string, Record<string, number>> = {};
    for (const row of byEntity.rows) {
      if (!entityStatus[row.entity_type]) {
        entityStatus[row.entity_type] = {};
      }
      entityStatus[row.entity_type][row.status] = parseInt(row.count, 10);
    }
    console.log(`[SYNC] By Entity:`, entityStatus);

    const recentOps = await this.pg.query<SyncOperationRecord>(
      `SELECT * FROM sync_operations
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [this.businessId]
    );
    console.log(`[SYNC] Recent Operations:`, recentOps.rows.map(op => ({
      id: op.id.slice(0, 8),
      entity: op.entity_type,
      operation: op.operation,
      status: op.status,
      createdAt: op.created_at,
    })));
  }

  async deleteOperation(operationId: string): Promise<boolean> {
    try {
      const op = await this.getOperation(operationId);
      if (!op) {
        return false;
      }

      await this.pg.query(
        `DELETE FROM sync_operations WHERE id = $1 AND business_id = $2`,
        [operationId, this.businessId]
      );
      return true;
    } catch (error) {
      console.error("Failed to delete operation:", error);
      return false;
    }
  }

  async deleteOperations(operationIds: string[]): Promise<number> {
    if (operationIds.length === 0) {
      return 0;
    }

    try {
      const placeholders = buildPlaceholders(operationIds.length, 2);
      await this.pg.query(
        `DELETE FROM sync_operations
         WHERE business_id = $1
           AND id IN (${placeholders})`,
        [this.businessId, ...operationIds]
      );

      return operationIds.length;
    } catch (error) {
      console.error("Failed to delete operations:", error);
      return 0;
    }
  }

  startAutoSync(): void {
    if (this.syncIntervalId) {
      return;
    }

    this.syncIntervalId = setInterval(async () => {
      if (navigator.onLine) {
        await this.processPending();
      }
    }, SYNC_INTERVAL_MS);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  private async getOperation(id: string): Promise<SyncOperationRecord | null> {
    const result = await this.pg.query<SyncOperationRecord>(
      `SELECT *
       FROM sync_operations
       WHERE id = $1
         AND business_id = $2`,
      [id, this.businessId]
    );
    return result.rows[0] || null;
  }

  private async getDeadLetterOperation(
    id: string
  ): Promise<DeadLetterOperationRecord | null> {
    const result = await this.pg.query<DeadLetterOperationRecord>(
      `SELECT *
       FROM sync_dead_letter
       WHERE id = $1
         AND business_id = $2`,
      [id, this.businessId]
    );

    return result.rows[0] || null;
  }

  private async markProcessing(id: string): Promise<void> {
    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           last_attempt_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND business_id = $3`,
      [OPERATION_STATUS.PROCESSING, id, this.businessId]
    );
  }

  private async markCompleted(id: string): Promise<void> {
    const op = await this.getOperation(id);

    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND business_id = $3`,
      [OPERATION_STATUS.COMPLETED, id, this.businessId]
    );

    if (op) {
      console.log(`[SYNC] ✅ Completed: ${op.entity_type}:${op.entity_id} (${op.operation})`);
    }

    const tableName = op ? validateEntityTableName(op.entity_type) : null;
    if (op && tableName) {
      try {
        await this.pg.query(
          `UPDATE "${tableName}"
           SET sync_status = $1,
               sync_attempts = 0,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
             AND business_id = $3`,
          ["synced", op.entity_id, this.businessId]
        );
      } catch (error) {
        console.warn(
          `Failed to update ${op.entity_type} sync_status for ${op.entity_id}:`,
          error
        );
      }
    }
  }

  private async markFailed(id: string, error: string): Promise<void> {
    const op = await this.getOperation(id);

    const payloadStr = typeof op?.payload === 'string' ? op.payload : JSON.stringify(op?.payload);

    console.error(`[SYNC] Operation marked as FAILED:`, {
      operationId: id,
      entityType: op?.entity_type,
      operation: op?.operation,
      entityId: op?.entity_id,
      error,
      attempts: op?.sync_attempts,
      payload: payloadStr ? payloadStr.substring(0, 1000) : undefined,
      timestamp: new Date().toISOString(),
    });

    if (!op) return;

    const selfHealed = await this.trySelfHealOperation(op, error);
    if (selfHealed) {
      return;
    }

    const newAttempts = op.sync_attempts + 1;

    if (newAttempts >= MAX_RETRIES) {
      await this.moveToDeadLetter(id, error);
      return;
    }

    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           sync_attempts = $2,
           last_error = $3,
           last_attempt_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
         AND business_id = $5`,
      [OPERATION_STATUS.FAILED, newAttempts, error, id, this.businessId]
    );
  }

  private async trySelfHealOperation(
    op: SyncOperationRecord,
    error: string
  ): Promise<boolean> {
    const classifiedError = classifyError(error);
    
    if (
      op.operation !== "update" ||
      !SELF_HEAL_INSERTABLE_ENTITIES.has(op.entity_type) ||
      !classifiedError.isSelfHealable
    ) {
      return false;
    }

    console.log(
      `[SYNC] Self-healing: Converting ${op.entity_type} update to create for ${op.entity_id} (error: ${classifiedError.code})`
    );

    await this.pg.query(
      `UPDATE sync_operations
       SET operation = $1,
           status = $2,
           sync_attempts = 0,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
         AND business_id = $4`,
      ["create", OPERATION_STATUS.PENDING, op.id, this.businessId]
    );

    return true;
  }

  private async markConflict(
    id: string,
    conflictData: {
      serverData: Record<string, unknown>;
      suggestedMerge: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           last_error = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
         AND business_id = $4`,
      [OPERATION_STATUS.CONFLICT, JSON.stringify(conflictData), id, this.businessId]
    );
  }

  private async moveToDeadLetter(
    operationId: string,
    originalError: string
  ): Promise<void> {
    const op = await this.getOperation(operationId);
    if (!op) return;

    const dlqId = crypto.randomUUID();

    await this.pg.query(
      `INSERT INTO sync_dead_letter (
         id,
         business_id,
         operation_id,
         entity_type,
         operation,
         entity_id,
         data,
         error,
         sync_attempts,
         original_error,
         created_at
       ) VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8,
         $9,
         $10,
         $11
       )`,
      [
        dlqId,
        this.businessId,
        operationId,
        op.entity_type,
        op.operation,
        op.entity_id,
        JSON.stringify(parsePayload(op.payload)),
        "Max retries exceeded",
        op.sync_attempts + 1,
        originalError,
        new Date().toISOString(),
      ]
    );

    await this.pg.query(
      `UPDATE sync_operations
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND business_id = $3`,
      [OPERATION_STATUS.DEAD_LETTER, operationId, this.businessId]
    );
  }

  private async syncOperation(
    op: SyncOperationRecord
  ): Promise<{
    success: boolean;
    error?: string;
    conflict?: {
      serverData: Record<string, unknown>;
      suggestedMerge: Record<string, unknown>;
    };
  }> {
    try {
      const response = await this.sendBatchToServer([op]);
      const result = response.results.find(
        (item) => item.idempotencyKey === (op.idempotency_key ?? op.id)
      );

      if (!result) {
        return { success: false, error: "Sync batch returned no result for operation" };
      }

      if (result.conflict) {
        return { success: false, conflict: result.conflict };
      }

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async sendBatchToServer(
    operations: SyncOperationRecord[]
  ): Promise<BatchSyncResponse> {
    return this.httpClient.sendBatch(operations);
  }

  /**
   * Fetch pending conflicts from the backend API
   */
  async getBackendConflicts(options?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<BackendConflictListResponse> {
    this.ensureInitialized();
    const result = await this.httpClient.getConflicts(options);
    return result as BackendConflictListResponse;
  }

  /**
   * Fetch a single conflict from the backend API
   */
  async getBackendConflict(conflictId: string): Promise<BackendConflictResponse> {
    this.ensureInitialized();
    const result = await this.httpClient.getConflict(conflictId);
    return result as BackendConflictResponse;
  }

  /**
   * Resolve a conflict via the backend API
   */
  async resolveBackendConflict(
    conflictId: string,
    resolution: "server" | "local" | "merge",
    mergedData?: Record<string, unknown>
  ): Promise<BackendConflictResponse> {
    this.ensureInitialized();
    const result = await this.httpClient.resolveConflict(conflictId, resolution, mergedData);
    return result as BackendConflictResponse;
  }
}
