import type { z } from "zod";
import type { RequestContext } from "../../../../context/request-context";
import type { DbTransaction } from "../../../../lib/txid";
import type { SyncEntity, SyncOperationInput } from "../../types";

export type SyncOperationType = "create" | "update" | "delete";

export interface EntitySchemas<C = unknown, U = unknown> {
  create: z.ZodType<C>;
  update: z.ZodType<U>;
}

export type SupportedOperations = ("create" | "update" | "delete")[];

export interface FieldMapping {
  [schemaField: string]: string;
}

export interface PostCreateHook<C = unknown> {
  (ctx: RequestContext, entityId: string, parsed: C): Promise<void>;
}

export interface PostUpdateHook<U = unknown> {
  (ctx: RequestContext, entityId: string, parsed: U): Promise<void>;
}

export interface ParentCheck {
  parentIdField: string;
  parentName: string;
  /** Called at execution time with ctx and parentId — closure captures deps */
  findParent: (ctx: RequestContext, parentId: string) => Promise<unknown>;
}

export interface AdditionalParentCheck {
  field: string;
  parentName: string;
  findParent: (ctx: RequestContext, parentId: string) => Promise<unknown>;
}

/** Custom operation replacing repo.create */
export interface CustomCreateOp {
  (ctx: RequestContext, entityId: string, data: Record<string, unknown>, tx?: DbTransaction): Promise<void>;
}

/** Custom operation replacing repo.update */
export interface CustomUpdateOp {
  (ctx: RequestContext, entityId: string, data: Record<string, unknown>, tx?: DbTransaction, operation?: SyncOperationInput): Promise<void>;
}

/** Custom operation replacing repo.delete */
export interface CustomDeleteOp {
  (ctx: RequestContext, entityId: string, data: Record<string, unknown>, tx?: DbTransaction): Promise<void>;
}

/** Pre-validation hook called before schema parsing */
export interface PreValidationOp {
  (ctx: RequestContext, payload: Record<string, unknown>, operation: SyncOperationInput): Promise<void>;
}

/** Enrich payload with ctx-derived fields (e.g., sellerId injection) */
export interface PayloadEnricherOp {
  (ctx: RequestContext, payload: Record<string, unknown>, operation: SyncOperationInput): Record<string, unknown>;
}

/** Post-operation hook (e.g., recalculate totals) */
export interface PostOperationOp {
  (ctx: RequestContext, parsed: Record<string, unknown>, operation: SyncOperationInput, tx?: DbTransaction): Promise<void>;
}

export interface IBuilderConfig<C = unknown, U = unknown> {
  entityType: SyncEntity;
  schemas: EntitySchemas<C, U>;
  supportedOperations?: SupportedOperations;
  createFieldMapping?: FieldMapping;
  updateFieldMapping?: FieldMapping;
  postCreate?: PostCreateHook<C>;
  postUpdate?: PostUpdateHook<U>;
  parentCheck?: ParentCheck;
  txRequired?: boolean;
  // Custom operations for join tables and non-standard CRUD
  customCreate?: CustomCreateOp;
  customUpdate?: CustomUpdateOp;
  customDelete?: CustomDeleteOp;
  // Pre-validation hook
  preValidation?: PreValidationOp;
  // Payload enrichment (e.g., inject sellerId from ctx)
  payloadEnricher?: PayloadEnricherOp;
  // Post-operation hook (e.g., recalculate totals)
  postOperation?: PostOperationOp;
  // Additional parent checks beyond the primary parentCheck
  additionalParentChecks?: AdditionalParentCheck[];
  // For delete: skip if parent doesn't exist (parent must exist for item to exist)
  skipOnParentMissing?: boolean;
  // For version conflict detection on update
  versionConflictField?: string;
  // Default values for create operation (applied after parsing, before mapping)
  createDefaults?: Record<string, unknown>;
}

export type { RequestContext, DbTransaction };
