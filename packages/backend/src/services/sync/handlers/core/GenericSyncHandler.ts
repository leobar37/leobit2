import type { RequestContext } from "../../../../context/request-context";
import type { DbTransaction } from "../../../../lib/txid";
import type { SyncEntity, SyncOperationInput } from "../../types";
import type { IBuilderConfig } from "./types";
import { BaseSyncHandler } from "../BaseSyncHandler";
import { mapDefinedFields } from "./patch-utils";
import { z } from "zod";

export interface SyncHandlerResult {
  success: boolean;
  idempotencyKey: string;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp: string;
}

interface Repo {
  create(ctx: RequestContext, data: unknown, tx?: DbTransaction): Promise<unknown>;
  findById(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<unknown | undefined>;
  update(ctx: RequestContext, id: string, data: unknown, tx?: DbTransaction): Promise<boolean>;
  delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void>;
}

export class GenericSyncHandler<
  C extends Record<string, unknown> = Record<string, unknown>,
  U extends Record<string, unknown> = Record<string, unknown>,
> extends BaseSyncHandler {
  readonly entityType: SyncEntity;
  private config: IBuilderConfig<C, U>;
  private repo?: Repo;

  constructor(config: IBuilderConfig<C, U>) {
    super();
    this.config = config;
    this.entityType = config.entityType;
  }

  async validateBusinessRules(
    _ctx: RequestContext,
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

  async execute(
    ctx: RequestContext,
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

  private async handleCreate(
    ctx: RequestContext,
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
      ? { ...this.config.createDefaults, ...parsed }
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
      await this.config.customCreate(ctx, operation.entityId, { ...withDefaults, ...data, ...parsed }, tx);
    } else if (this.repo) {
      await this.repo.create(ctx, { id: operation.entityId, ...data }, tx);
    }

    if (this.config.postOperation) {
      await this.config.postOperation(ctx, parsed, operation, tx);
    }
  }

  private async handleUpdate(
    ctx: RequestContext,
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
      await this.config.customUpdate(ctx, operation.entityId, { ...data, ...parsed }, tx, operation);
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

  private async handleDelete(
    ctx: RequestContext,
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

  private mapFields(
    parsed: Record<string, unknown>,
    mapping: Record<string, string>
  ): Record<string, unknown> {
    return mapDefinedFields(parsed, mapping);
  }

  setRepo(repo: Repo): void {
    this.repo = repo;
  }

  static createWithRepo<C extends Record<string, unknown>, U extends Record<string, unknown>>(
    config: IBuilderConfig<C, U>,
    repo: Repo
  ): GenericSyncHandler<C, U> {
    const handler = new GenericSyncHandler<C, U>(config);
    handler.setRepo(repo);
    return handler;
  }
}
