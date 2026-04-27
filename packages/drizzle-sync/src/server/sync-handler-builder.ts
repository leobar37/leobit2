/**
 * SyncHandlerBuilder - Fluent builder for GenericSyncHandler
 *
 * Provides a chainable API for configuring GenericSyncHandler instances.
 * Makes it easy to set up handlers with various configuration options
 * without dealing with complex object structures.
 */

import { z } from "zod";
import type {
  GenericAdditionalParentCheck,
  GenericCustomCreateOp,
  GenericCustomDeleteOp,
  GenericCustomUpdateOp,
  GenericParentCheck,
  GenericPayloadEnricherOp,
  GenericPostCreateHook,
  GenericPostOperationOp,
  GenericPostUpdateHook,
  GenericPreValidationOp
} from "./generic-handler";
import { GenericSyncHandler, type GenericRepo, type IGenericHandlerConfig } from "./generic-handler";
import type { SyncEntity } from "./types";

// ============================================================================
// SyncHandlerBuilder
// ============================================================================

/**
 * Fluent builder for creating GenericSyncHandler instances
 *
 * @example
 * ```typescript
 * const handler = new SyncHandlerBuilder("customers")
 *   .withSchemas(customerCreateSchema, customerUpdateSchema)
 *   .withCreateFields({ name: "name", phone: "phone" })
 *   .withUpdateFields({ name: "name", phone: "phone" })
 *   .withRepo({
 *     create: async (ctx, data) => { ... },
 *     findById: async (ctx, id) => { ... },
 *     update: async (ctx, id, data) => { ... },
 *     delete: async (ctx, id) => { ... },
 *   })
 *   .build();
 * ```
 */
export class SyncHandlerBuilder<
  C extends Record<string, unknown> = Record<string, unknown>,
  U extends Record<string, unknown> = Record<string, unknown>,
> {
  private config: IGenericHandlerConfig<C, U>;
  private repo?: GenericRepo;

  constructor(entityType: SyncEntity) {
    this.config = {
      entityType,
      schemas: { create: z.unknown() as z.ZodType<C>, update: z.unknown() as z.ZodType<U> },
      supportedOperations: ["create", "update", "delete"],
    };
  }

  /**
   * Set the Zod schemas for create and update operations
   */
  withSchemas(create: z.ZodType<C>, update: z.ZodType<U>): this {
    this.config.schemas = { create, update };
    return this;
  }

  /**
   * Set which operations are supported (defaults to all three)
   */
  withSupportedOperations(ops: ("create" | "update" | "delete")[]): this {
    this.config.supportedOperations = ops;
    return this;
  }

  /**
   * Set field mapping for create operations
   * Maps payload field names to database column names
   */
  withCreateFields(mapping: Record<string, string>): this {
    this.config.createFieldMapping = mapping;
    return this;
  }

  /**
   * Set field mapping for update operations
   * Maps payload field names to database column names
   */
  withUpdateFields(mapping: Record<string, string>): this {
    this.config.updateFieldMapping = mapping;
    return this;
  }

  /**
   * Set a hook to run after successful entity creation
   */
  withPostCreate(hook: GenericPostCreateHook<C>): this {
    this.config.postCreate = hook;
    return this;
  }

  /**
   * Set a hook to run after successful entity update
   */
  withPostUpdate(hook: GenericPostUpdateHook<U>): this {
    this.config.postUpdate = hook;
    return this;
  }

  /**
   * Set parent entity validation check
   * Ensures parent exists before creating/updating child entity
   */
  withParentCheck(check: GenericParentCheck): this {
    this.config.parentCheck = check;
    return this;
  }

  /**
   * Require a transaction for operations
   */
  withTxRequired(required: true): this {
    this.config.txRequired = required;
    return this;
  }

  /**
   * Set the repository for standard CRUD operations
   */
  withRepo(repo: GenericRepo): this {
    this.repo = repo;
    return this;
  }

  // ─── Custom operations for non-standard CRUD ──────────────────────────────────

  /**
   * Set a custom create operation
   * Replaces the standard repo.create call
   * Use for join tables and non-standard CRUD operations
   */
  withCustomCreate(op: GenericCustomCreateOp): this {
    this.config.customCreate = op;
    return this;
  }

  /**
   * Set a custom update operation
   * Replaces the standard repo.update call
   */
  withCustomUpdate(op: GenericCustomUpdateOp): this {
    this.config.customUpdate = op;
    return this;
  }

  /**
   * Set a custom delete operation
   * Replaces the standard repo.delete call
   */
  withCustomDelete(op: GenericCustomDeleteOp): this {
    this.config.customDelete = op;
    return this;
  }

  /**
   * Set a pre-validation hook
   * Called before schema parsing, useful for normalizing payload
   */
  withPreValidation(op: GenericPreValidationOp): this {
    this.config.preValidation = op;
    return this;
  }

  /**
   * Set a payload enricher hook
   * Called to inject additional fields from context into payload
   * e.g., injecting sellerId from ctx into payment records
   */
  withPayloadEnricher(op: GenericPayloadEnricherOp): this {
    this.config.payloadEnricher = op;
    return this;
  }

  /**
   * Set a post-operation hook
   * Called after any CRUD operation succeeds
   * Useful for recalculating totals, updating caches, etc.
   */
  withPostOperation(op: GenericPostOperationOp): this {
    this.config.postOperation = op;
    return this;
  }

  /**
   * Set additional parent checks
   * For entities that need validation against multiple parents
   */
  withAdditionalParentChecks(checks: GenericAdditionalParentCheck[]): this {
    this.config.additionalParentChecks = checks;
    return this;
  }

  /**
   * Skip delete if parent doesn't exist
   * Useful for child entities that can't exist without their parent
   */
  withSkipOnParentMissing(): this {
    this.config.skipOnParentMissing = true;
    return this;
  }

  /**
   * Set version conflict field for optimistic concurrency
   * Handler will check server version against client version on updates
   */
  withVersionConflictField(field: string): this {
    this.config.versionConflictField = field;
    return this;
  }

  /**
   * Set default values for create operations
   * Applied after schema parsing, before field mapping
   */
  withCreateDefaults(defaults: Record<string, unknown>): this {
    this.config.createDefaults = defaults;
    return this;
  }

  /**
   * Build the GenericSyncHandler instance
   * Returns configured handler with repo attached if provided
   */
  build(): GenericSyncHandler<C, U> {
    const handler = new GenericSyncHandler<C, U>(this.config);
    if (this.repo) {
      handler.setRepo(this.repo);
    }
    return handler;
  }
}
