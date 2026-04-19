/**
 * GenericSyncHandler - Config-based sync handler for generic CRUD operations
 *
 * A flexible handler implementation that supports create, update, and delete operations
 * through configuration rather than subclassing. Supports field mapping, parent validation,
 * custom operations, and various hooks for business logic integration.
 */

import type { SyncEntity } from "@avileo/shared";
import type {
  SyncOperationInput,
  SyncHandlerResult,
  EntityRegistry,
} from "./types";
import type { SyncRequestContext, DbTransaction } from "./sync-engine";
import { BaseSyncHandler } from "./base-handler";
import { z } from "zod";

// ============================================================================
// Repository Interface
// ============================================================================

/**
 * Repository interface for generic handler operations
 * Abstracts the data access layer for CRUD operations
 */
export interface GenericRepo {
  create(ctx: SyncRequestContext, data: Record<string, unknown>, tx?: DbTransaction): Promise<unknown>;
  findById(ctx: SyncRequestContext, id: string, tx?: DbTransaction): Promise<unknown | undefined>;
  update(ctx: SyncRequestContext, id: string, data: Record<string, unknown>, tx?: DbTransaction): Promise<boolean>;
  delete(ctx: SyncRequestContext, id: string, tx?: DbTransaction): Promise<void>;
}

// ============================================================================
// Hook Types
// ============================================================================

/** Post-create hook called after entity creation */
export interface GenericPostCreateHook<C = Record<string, unknown>> {
  (ctx: SyncRequestContext, entityId: string, parsed: C): Promise<void>;
}

/** Post-update hook called after entity update */
export interface GenericPostUpdateHook<U = Record<string, unknown>> {
  (ctx: SyncRequestContext, entityId: string, parsed: U): Promise<void>;
}

/** Parent entity validation check */
export interface GenericParentCheck {
  parentIdField: string;
  parentName: string;
  findParent: (ctx: SyncRequestContext, parentId: string) => Promise<unknown>;
}

/** Additional parent check for multi-parent relationships */
export interface GenericAdditionalParentCheck {
  field: string;
  parentName: string;
  findParent: (ctx: SyncRequestContext, parentId: string) => Promise<unknown>;
}

/** Custom create operation replacing repo.create */
export interface GenericCustomCreateOp {
  (ctx: SyncRequestContext, entityId: string, data: Record<string, unknown>, tx?: DbTransaction): Promise<void>;
}

/** Custom update operation replacing repo.update */
export interface GenericCustomUpdateOp {
  (ctx: SyncRequestContext, entityId: string, data: Record<string, unknown>, tx?: DbTransaction, operation?: SyncOperationInput): Promise<void>;
}

/** Custom delete operation replacing repo.delete */
export interface GenericCustomDeleteOp {
  (ctx: SyncRequestContext, entityId: string, data: Record<string, unknown>, tx?: DbTransaction): Promise<void>;
}

/** Pre-validation hook called before schema parsing */
export interface GenericPreValidationOp {
  (ctx: SyncRequestContext, payload: Record<string, unknown>, operation: SyncOperationInput): Promise<void>;
}

/** Payload enrichment hook for injecting ctx-derived fields */
export interface GenericPayloadEnricherOp {
  (ctx: SyncRequestContext, payload: Record<string, unknown>, operation: SyncOperationInput): Record<string, unknown>;
}

/** Post-operation hook called after any CRUD operation */
export interface GenericPostOperationOp {
  (ctx: SyncRequestContext, parsed: Record<string, unknown>, operation: SyncOperationInput, tx?: DbTransaction): Promise<void>;
}

// ============================================================================
// Builder Config
// ============================================================================

/**
 * Entity schemas for create and update operations
 */
export interface GenericEntitySchemas<C = Record<string, unknown>, U = Record<string, unknown>> {
  create: z.ZodType<C>;
  update: z.ZodType<U>;
}

/**
 * Field mapping for transforming payload fields to database columns
 */
export interface GenericFieldMapping {
  [schemaField: string]: string;
}

/**
 * Configuration for GenericSyncHandler builder
 * Defines the behavior and capabilities of a sync handler
 */
export interface IGenericHandlerConfig<
  C extends Record<string, unknown> = Record<string, unknown>,
  U extends Record<string, unknown> = Record<string, unknown>,
> {
  entityType: SyncEntity;
  schemas: GenericEntitySchemas<C, U>;
  supportedOperations?: ("create" | "update" | "delete")[];
  createFieldMapping?: GenericFieldMapping;
  updateFieldMapping?: GenericFieldMapping;
  postCreate?: GenericPostCreateHook<C>;
  postUpdate?: GenericPostUpdateHook<U>;
  parentCheck?: GenericParentCheck;
  txRequired?: boolean;
  customCreate?: GenericCustomCreateOp;
  customUpdate?: GenericCustomUpdateOp;
  customDelete?: GenericCustomDeleteOp;
  preValidation?: GenericPreValidationOp;
  payloadEnricher?: GenericPayloadEnricherOp;
  postOperation?: GenericPostOperationOp;
  additionalParentChecks?: GenericAdditionalParentCheck[];
  skipOnParentMissing?: boolean;
  versionConflictField?: string;
  createDefaults?: Record<string, unknown>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Pick defined fields from a source object
 */
function pickDefinedFields<T extends Record<string, unknown>, K extends keyof T>(
  source: T,
  fields: readonly K[]
): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};
  for (const field of fields) {
    const value = source[field];
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result;
}

/**
 * Map defined fields from source to target using a mapping object
 */
function mapDefinedFields(
  source: Record<string, unknown>,
  mapping: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [sourceField, targetField] of Object.entries(mapping)) {
    const value = source[sourceField];
    if (value !== undefined) {
      result[targetField] = value;
    }
  }
  return result;
}

/**
 * Merge defined fields from multiple sources
 */
function mergeDefined(
  base: Record<string, unknown>,
  ...partials: Record<string, unknown>[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const partial of partials) {
    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

// ============================================================================
// GenericSyncHandler
// ============================================================================

/**
 * GenericSyncHandler - A configurable sync handler for CRUD operations
 *
 * This handler can be configured through IGenericHandlerConfig to support
 * create, update, and delete operations without subclassing. It supports:
 * - Field mapping between payload and database columns
 * - Parent entity validation
 * - Custom operations for non-standard CRUD
 * - Various hooks for business logic integration
 * - Version conflict detection
 * - Transaction requirements
 *
 * @example
 * ```typescript
 * const handler = new GenericSyncHandler({
 *   entityType: "customers",
 *   schemas: { create: customerCreateSchema, update: customerUpdateSchema },
 *   createFieldMapping: { name: "name", phone: "phone" },
 *   customCreate: async (ctx, entityId, data) => {
 *     await repo.create(ctx, { id: entityId, ...data });
 *   },
 * });
 * ```
 */
export class GenericSyncHandler<
  C extends Record<string, unknown> = Record<string, unknown>,
  U extends Record<string, unknown> = Record<string, unknown>,
> extends BaseSyncHandler<SyncRequestContext, DbTransaction> {
  readonly entityType: SyncEntity;
  private config: IGenericHandlerConfig<C, U>;
  private repo?: GenericRepo;

  constructor(config: IGenericHandlerConfig<C, U>) {
    super();
    this.config = config;
    this.entityType = config.entityType;
  }

  /**
   * Validate business rules before execution
   * For update operations, validates against update schema
   * For create/delete, validates against create schema
   */
  async validateBusinessRules(
    _ctx: SyncRequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    if (operation === "update") {
      this.config.schemas.update.parse(payload);
    } else if (operation !== "delete") {
      this.config.schemas.create.parse(payload);
    }
  }

  /**
   * Execute the sync operation (create, update, or delete)
   */
  async execute(
    ctx: SyncRequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation);

    try {
      const supportedOps = this.config.supportedOperations ?? ["create", "update", "delete"];
      if (!supportedOps.includes(operation.operation as "create" | "update" | "delete")) {
        throw new Error(`Acción no soportada: ${operation.operation}`);
      }

      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation, tx);
        // If payloadEnricher was used, update operation.payload for sync records
        if (this.config.payloadEnricher) {
          operation.payload = this.config.payloadEnricher(ctx, operation.payload, operation);
        }
        if (this.config.postCreate) {
          const parsed = this.config.schemas.create.parse(operation.payload) as C;
          await this.config.postCreate(ctx, operation.entityId, parsed);
        }
      } else if (operation.operation === "update") {
        await this.handleUpdate(ctx, operation, tx);
        if (this.config.postUpdate) {
          const parsed = this.config.schemas.update.parse(operation.payload) as U;
          await this.config.postUpdate(ctx, operation.entityId, parsed);
        }
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation, tx);
      }

      this.logSuccess(ctx, operation);
      return this.createSuccessResult(operation);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logError(ctx, operation, err);
      return this.createErrorResult(operation, err.message);
    }
  }

  /**
   * Handle create operation
   */
  private async handleCreate(
    ctx: SyncRequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    let payload = operation.payload;

    // Enrich payload with ctx-derived fields
    if (this.config.payloadEnricher) {
      payload = this.config.payloadEnricher(ctx, payload, operation);
    }

    // Pre-validation hook
    if (this.config.preValidation) {
      await this.config.preValidation(ctx, payload, operation);
    }

    const parsed = this.config.schemas.create.parse(payload) as C;
    // Apply schema defaults before mapping
    const withDefaults = this.config.createDefaults
      ? mergeDefined(this.config.createDefaults, parsed)
      : parsed;
    const data = this.mapFields(withDefaults, this.config.createFieldMapping ?? {});

    if (this.config.parentCheck) {
      const parentId = parsed[this.config.parentCheck.parentIdField] as string | undefined;
      if (parentId) {
        await this.ensureParentExists(
          parentId,
          () => this.config.parentCheck!.findParent(ctx, parentId),
          this.config.parentCheck.parentName
        );
      }
    }

    // Additional parent checks (e.g., CustomerTagSyncHandler needs both customerId and tagId)
    if (this.config.additionalParentChecks) {
      for (const check of this.config.additionalParentChecks) {
        const parentId = parsed[check.field] as string | undefined;
        if (parentId) {
          await this.ensureParentExists(
            parentId,
            () => check.findParent(ctx, parentId),
            check.parentName
          );
        }
      }
    }

    if (this.config.txRequired && !tx) {
      throw new Error("Transaction is required for this operation");
    }

    if (this.config.customCreate) {
      await this.config.customCreate(ctx, operation.entityId, mergeDefined(withDefaults, data, parsed), tx);
    } else if (this.repo) {
      await this.repo.create(ctx, { id: operation.entityId, ...data }, tx);
    }

    if (this.config.postOperation) {
      await this.config.postOperation(ctx, parsed, operation, tx);
    }
  }

  /**
   * Handle update operation
   */
  private async handleUpdate(
    ctx: SyncRequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    let payload = operation.payload;

    // Enrich payload with ctx-derived fields
    if (this.config.payloadEnricher) {
      payload = this.config.payloadEnricher(ctx, payload, operation);
    }

    // Pre-validation hook
    if (this.config.preValidation) {
      await this.config.preValidation(ctx, payload, operation);
    }

    const parsed = this.config.schemas.update.parse(payload) as U;
    const data = this.mapFields(parsed, this.config.updateFieldMapping ?? {});

    if (this.config.txRequired && !tx) {
      throw new Error("Transaction is required for this operation");
    }

    // Version conflict detection (applies to both customUpdate and repo.update)
    if (this.config.versionConflictField && this.repo) {
      const existing = await this.repo.findById(ctx, operation.entityId, tx);
      if (existing) {
        const existingRecord = existing as Record<string, unknown>;
        const serverVersion = existingRecord[this.config.versionConflictField] as number | undefined;
        const clientVersion = operation.localVersion ?? (parsed as Record<string, unknown>)[this.config.versionConflictField] as number | undefined;
        if (serverVersion !== undefined && clientVersion !== undefined && serverVersion > clientVersion) {
          throw new Error(
            `Version conflict: expected version ${clientVersion} but server has version ${serverVersion}. ` +
            `The record was modified by another device. Please refresh and try again.`
          );
        }
      }
    }

    if (this.config.customUpdate) {
      await this.config.customUpdate(ctx, operation.entityId, mergeDefined(data, parsed), tx, operation);
    } else if (this.repo) {
      const updated = await this.repo.update(ctx, operation.entityId, data, tx);
      if (!updated) {
        throw new Error(`${this.entityType} no encontrado`);
      }
    }

    if (this.config.postOperation) {
      await this.config.postOperation(ctx, parsed, operation, tx);
    }
  }

  /**
   * Handle delete operation
   */
  private async handleDelete(
    ctx: SyncRequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    // Pre-validation hook
    if (this.config.preValidation) {
      await this.config.preValidation(ctx, operation.payload, operation);
    }

    // For delete, we still parse to get parent ID for skipOnParentMissing check
    const parsed = this.config.schemas.create.parse(operation.payload) as C;

    // skipOnParentMissing: if parent doesn't exist, item can't exist either
    if (this.config.skipOnParentMissing && this.config.parentCheck) {
      const parentId = parsed[this.config.parentCheck.parentIdField] as string | undefined;
      if (parentId) {
        if (!this.registry?.wasCreated(parentId)) {
          const parent = await this.config.parentCheck.findParent(ctx, parentId);
          if (!parent) {
            return; // Skip delete silently
          }
        }
      }
    }

    if (this.config.customDelete) {
      await this.config.customDelete(ctx, operation.entityId, parsed, tx);
    } else if (this.repo) {
      const existing = await this.repo.findById(ctx, operation.entityId);
      if (!existing) return;
      await this.repo.delete(ctx, operation.entityId, tx);
    }

    if (this.config.postOperation) {
      await this.config.postOperation(ctx, parsed, operation, tx);
    }
  }

  /**
   * Map fields using field mapping configuration
   * If no mapping provided (empty object), passes through all fields
   */
  private mapFields(
    parsed: Record<string, unknown>,
    mapping: Record<string, string>
  ): Record<string, unknown> {
    // If no mapping provided, pass through all fields
    if (!mapping || Object.keys(mapping).length === 0) {
      return { ...parsed };
    }
    return mapDefinedFields(parsed, mapping);
  }

  /**
   * Set the repository for standard CRUD operations
   */
  setRepo(repo: GenericRepo): void {
    this.repo = repo;
  }

  /**
   * Static factory to create handler with repo pre-configured
   */
  static createWithRepo<C extends Record<string, unknown>, U extends Record<string, unknown>>(
    config: IGenericHandlerConfig<C, U>,
    repo: GenericRepo
  ): GenericSyncHandler<C, U> {
    const handler = new GenericSyncHandler<C, U>(config);
    handler.setRepo(repo);
    return handler;
  }
}
