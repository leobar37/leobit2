/**
 * ConflictResolver
 *
 * Version-based conflict detection for sync operations.
 * Provides base class and registry for entity-specific resolvers.
 */

import { and, eq, getTableName } from "drizzle-orm";
import type { SyncEntity, SyncOperationInput, ConflictCheckResult, IConflictResolver, IGenericConflictResolver, GenericSyncOperationInput } from "./types";

/**
 * Base class for version-based conflict detection
 *
 * Uses entity version numbers to detect conflicts when server version
 * is greater than the client's local version.
 */
export abstract class BaseVersionConflictResolver<
  TRequestContext = unknown,
  TTransaction = unknown,
  TTable = unknown
> implements IConflictResolver<TRequestContext, TTransaction>
{
  protected abstract getEntityName(): string;
  protected abstract getTable(): TTable;
  protected abstract getIdField(): string;
  protected abstract getTenantIdField(): string;
  protected abstract getVersionField(): string;
  protected abstract getServerDataFields(record: unknown): Record<string, unknown>;

  protected getQueryRelationName(): string | null {
    return null;
  }

  protected abstract getTenantIdFromContext(ctx: TRequestContext): string;

  protected abstract executeQuery(
    tx: TTransaction,
    queryName: string,
    where: unknown
  ): Promise<unknown | undefined>;

  async checkConflict(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx: TTransaction
  ): Promise<ConflictCheckResult> {
    if (operation.operation === "create" || operation.operation === "delete") {
      return { hasConflict: false };
    }

    const table = this.getTable() as Record<string, unknown>;
    const idField = this.getIdField();
    const tenantIdField = this.getTenantIdField();
    const versionField = this.getVersionField();

    const queryName = this.getQueryRelationName() ?? getTableName(table as unknown as Parameters<typeof getTableName>[0]);

    const record = await this.executeQuery(
      tx,
      queryName,
      and(
        eq(table[idField] as Parameters<typeof eq>[0], operation.entityId),
        eq(table[tenantIdField] as Parameters<typeof eq>[0], this.getTenantIdFromContext(ctx))
      )
    );

    if (!record) {
      return { hasConflict: false };
    }

    const serverVersion = (record as Record<string, unknown>)[versionField] as number;
    const localVersion = operation.localVersion ?? 1;

    if (serverVersion > localVersion) {
      console.warn({
        msg: `⚠️ ${this.getEntityName()} conflict detected`,
        entityId: operation.entityId,
        serverVersion,
        clientVersion: localVersion,
      });

      return {
        hasConflict: true,
        serverVersion,
        serverData: this.getServerDataFields(record),
      };
    }

    return { hasConflict: false };
  }
}

/**
 * No-op conflict resolver that always returns no conflict
 */
export class NoOpConflictResolver<TRequestContext = unknown, TTransaction = unknown>
  implements IConflictResolver<TRequestContext, TTransaction>, IGenericConflictResolver<TRequestContext, TTransaction, string>
{
  async checkConflict(
    _ctx: TRequestContext,
    _operation: SyncOperationInput | GenericSyncOperationInput<string>,
    _tx: TTransaction
  ): Promise<ConflictCheckResult> {
    return { hasConflict: false };
  }
}

/**
 * Generic conflict resolver registry (instance-based)
 */
export class GenericConflictResolverRegistry<
  TEntity extends string = string,
  TRequestContext = unknown,
  TTransaction = unknown
> {
  private resolvers: Map<TEntity | string, IGenericConflictResolver<TRequestContext, TTransaction, TEntity>>;
  private defaultResolver: IGenericConflictResolver<TRequestContext, TTransaction, TEntity>;

  constructor(
    options?: {
      resolvers?: Map<TEntity | string, IGenericConflictResolver<TRequestContext, TTransaction, TEntity>>;
      defaultResolver?: IGenericConflictResolver<TRequestContext, TTransaction, TEntity>;
    }
  ) {
    this.resolvers = options?.resolvers ?? new Map();
    this.defaultResolver = options?.defaultResolver ?? new NoOpConflictResolver() as IGenericConflictResolver<TRequestContext, TTransaction, TEntity>;
  }

  register(
    key: TEntity | string,
    resolver: IGenericConflictResolver<TRequestContext, TTransaction, TEntity>
  ): void {
    this.resolvers.set(key, resolver);
  }

  getResolver(
    entityType: TEntity,
    strategy?: string
  ): IGenericConflictResolver<TRequestContext, TTransaction, TEntity> {
    if (strategy && this.resolvers.has(strategy)) {
      return this.resolvers.get(strategy)!;
    }

    if (this.resolvers.has(entityType)) {
      return this.resolvers.get(entityType)!;
    }

    return this.defaultResolver;
  }

  hasResolver(key: TEntity | string): boolean {
    return this.resolvers.has(key);
  }

  setDefaultResolver(
    resolver: IGenericConflictResolver<TRequestContext, TTransaction, TEntity>
  ): void {
    this.defaultResolver = resolver;
  }
}
