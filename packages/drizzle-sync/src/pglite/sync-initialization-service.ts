/**
 * Sync Initialization Service
 *
 * Initializes the local push-sync infrastructure (schema creation and migrations).
 * This is a generic implementation that can be extended by applications.
 */

import type { PGlite } from "@electric-sql/pglite";

/**
 * SQL statements for creating sync infrastructure tables.
 * Applications should override these with their own DDL if needed.
 */
export interface SyncInfrastructureSQL {
  createSyncOperationsTable: string;
  alterSyncOperationsTable: string;
  createSyncOperationsIndexes: string;
  createSyncDeadLetterTable: string;
  alterSyncDeadLetterTable: string;
  createSyncDeadLetterIndexes: string;
}

/**
 * Default sync infrastructure SQL statements.
 * These match the Avileo app schema but can be overridden.
 */
export const DEFAULT_SYNC_INFRASTRUCTURE_SQL: SyncInfrastructureSQL = {
  createSyncOperationsTable: `
    CREATE TABLE IF NOT EXISTS sync_operations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      version INTEGER NOT NULL DEFAULT 1,
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at TIMESTAMP,
      idempotency_key TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  alterSyncOperationsTable: `
    ALTER TABLE sync_operations
    ADD COLUMN IF NOT EXISTS business_id TEXT NOT NULL DEFAULT '';
  `,
  createSyncOperationsIndexes: `
    CREATE INDEX IF NOT EXISTS idx_sync_operations_business_id ON sync_operations(business_id);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_idempotency ON sync_operations(idempotency_key);
  `,
  createSyncDeadLetterTable: `
    CREATE TABLE IF NOT EXISTS sync_dead_letter (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT NOT NULL,
      error TEXT NOT NULL,
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      original_error TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  alterSyncDeadLetterTable: `
    ALTER TABLE sync_dead_letter
    ADD COLUMN IF NOT EXISTS business_id TEXT NOT NULL DEFAULT '';
  `,
  createSyncDeadLetterIndexes: `
    CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_business_id ON sync_dead_letter(business_id);
    CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_operation_id ON sync_dead_letter(operation_id);
  `,
};

/**
 * Options for SyncInitializationService
 */
export interface SyncInitializationServiceOptions {
  /**
   * Custom SQL for sync infrastructure tables.
   * If not provided, uses default SQL.
   */
  infrastructureSQL?: SyncInfrastructureSQL;
  /**
   * Optional logger for informational messages.
   * If not provided, console.log will be used.
   */
  logger?: {
    info(message: string, ...args: unknown[]): void;
  };
}

export class SyncInitializationService {
  private readonly infrastructureSQL: SyncInfrastructureSQL;
  private readonly logger?: { info(message: string, ...args: unknown[]): void };

  constructor(
    private pg: PGlite,
    private businessId: string,
    options?: SyncInitializationServiceOptions
  ) {
    this.infrastructureSQL = options?.infrastructureSQL ?? DEFAULT_SYNC_INFRASTRUCTURE_SQL;
    this.logger = options?.logger;
  }

  async initialize(): Promise<void> {
    await this.ensureSyncSchema();
  }

  private async ensureSyncSchema(): Promise<void> {
    // Create sync_operations table
    await this.pg.exec(this.infrastructureSQL.createSyncOperationsTable);
    await this.pg.exec(this.infrastructureSQL.alterSyncOperationsTable);
    await this.pg.exec(this.infrastructureSQL.createSyncOperationsIndexes);

    // Create sync_dead_letter table
    await this.pg.exec(this.infrastructureSQL.createSyncDeadLetterTable);
    await this.pg.exec(this.infrastructureSQL.alterSyncDeadLetterTable);
    await this.pg.exec(this.infrastructureSQL.createSyncDeadLetterIndexes);

    const message = `[SyncInitialization] Schema initialized for business: ${this.businessId}`;
    if (this.logger) {
      this.logger.info(message);
    } else {
      console.log(message);
    }
  }
}
