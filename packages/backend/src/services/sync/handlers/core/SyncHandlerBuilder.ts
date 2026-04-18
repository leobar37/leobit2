import type { RequestContext } from "../../../../context/request-context";
import type { DbTransaction } from "../../../../lib/txid";
import type { SyncEntity } from "../../types";
import type {
  IBuilderConfig,
  PostCreateHook,
  PostUpdateHook,
  ParentCheck,
  AdditionalParentCheck,
  CustomCreateOp,
  CustomUpdateOp,
  CustomDeleteOp,
  PreValidationOp,
  PayloadEnricherOp,
  PostOperationOp,
} from "./types";
import { GenericSyncHandler } from "./GenericSyncHandler";
import { z } from "zod";

interface Repo {
  create(ctx: RequestContext, data: unknown, tx?: DbTransaction): Promise<unknown>;
  findById(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<unknown | undefined>;
  update(ctx: RequestContext, id: string, data: unknown, tx?: DbTransaction): Promise<boolean>;
  delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void>;
}

export class SyncHandlerBuilder<
  C extends Record<string, unknown> = Record<string, unknown>,
  U extends Record<string, unknown> = Record<string, unknown>,
> {
  private config: IBuilderConfig<C, U>;
  private repo?: Repo;

  constructor(entityType: SyncEntity) {
    this.config = {
      entityType,
      schemas: { create: z.unknown() as z.ZodType<C>, update: z.unknown() as z.ZodType<U> },
      supportedOperations: ["create", "update", "delete"],
    };
  }

  withSchemas(create: z.ZodType<C>, update: z.ZodType<U>): this {
    this.config.schemas = { create, update };
    return this;
  }

  withSupportedOperations(ops: ("create" | "update" | "delete")[]): this {
    this.config.supportedOperations = ops;
    return this;
  }

  withCreateFields(mapping: Record<string, string>): this {
    this.config.createFieldMapping = mapping;
    return this;
  }

  withUpdateFields(mapping: Record<string, string>): this {
    this.config.updateFieldMapping = mapping;
    return this;
  }

  withPostCreate(hook: PostCreateHook<C>): this {
    this.config.postCreate = hook;
    return this;
  }

  withPostUpdate(hook: PostUpdateHook<U>): this {
    this.config.postUpdate = hook;
    return this;
  }

  withParentCheck(check: ParentCheck): this {
    this.config.parentCheck = check;
    return this;
  }

  withTxRequired(required: true): this {
    this.config.txRequired = required;
    return this;
  }

  withRepo(repo: Repo): this {
    this.repo = repo;
    return this;
  }

  // ─── Custom operations for non-standard CRUD ──────────────────────────────────

  withCustomCreate(op: CustomCreateOp): this {
    this.config.customCreate = op;
    return this;
  }

  withCustomUpdate(op: CustomUpdateOp): this {
    this.config.customUpdate = op;
    return this;
  }

  withCustomDelete(op: CustomDeleteOp): this {
    this.config.customDelete = op;
    return this;
  }

  withPreValidation(op: PreValidationOp): this {
    this.config.preValidation = op;
    return this;
  }

  withPayloadEnricher(op: PayloadEnricherOp): this {
    this.config.payloadEnricher = op;
    return this;
  }

  withPostOperation(op: PostOperationOp): this {
    this.config.postOperation = op;
    return this;
  }

  withAdditionalParentChecks(checks: AdditionalParentCheck[]): this {
    this.config.additionalParentChecks = checks;
    return this;
  }

  withSkipOnParentMissing(): this {
    this.config.skipOnParentMissing = true;
    return this;
  }

  withVersionConflictField(field: string): this {
    this.config.versionConflictField = field;
    return this;
  }

  withCreateDefaults(defaults: Record<string, unknown>): this {
    this.config.createDefaults = defaults;
    return this;
  }

  build(): GenericSyncHandler<C, U> {
    const handler = new GenericSyncHandler<C, U>(this.config);
    if (this.repo) {
      handler.setRepo(this.repo);
    }
    return handler;
  }
}
