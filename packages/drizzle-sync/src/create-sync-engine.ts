import type { SyncEngineConfig, EntityConfig } from "./config/types";
import { assertValidConfig } from "./config/validator";
import { SyncEngineInstance } from "./sync-engine-instance";
import { GenericHandlerRegistry, type GenericHandlerFactory } from "./server/handler-registry";
import { GenericConflictResolverRegistry, NoOpConflictResolver } from "./server/conflict-resolver";
import { createSyncEventEmitter } from "./core/sync-events";
import type { ISyncEventEmitter } from "./core/sync-events";
import type { IGenericSyncHandler, IGenericConflictResolver } from "./server/types";

export function createSyncEngine<
  TEntity extends string,
  TContext = unknown,
  TTransaction = unknown
>(
  config: SyncEngineConfig<TEntity, TContext, TTransaction>
): SyncEngineInstance<TEntity, TContext, TTransaction> {
  assertValidConfig(config as SyncEngineConfig<TEntity>);

  const eventEmitter: ISyncEventEmitter = createSyncEventEmitter();

  const deps: Record<string, unknown> = {
    config,
    eventEmitter,
    ...config.database,
    ...config.entities,
  };

  const handlerRegistry = initializeHandlerRegistry(
    config as SyncEngineConfig<TEntity>,
    deps
  );

  const conflictResolverRegistry = initializeConflictResolverRegistry(
    config as SyncEngineConfig<TEntity>
  );

  return new SyncEngineInstance({
    config: config as SyncEngineConfig<TEntity>,
    handlerRegistry,
    conflictResolverRegistry,
    eventEmitter,
  });
}

function initializeHandlerRegistry<TEntity extends string>(
  config: SyncEngineConfig<TEntity>,
  deps: unknown
): GenericHandlerRegistry<TEntity> {
  const registry = new GenericHandlerRegistry<TEntity>(deps);

  if (config.handlers) {
    for (const [entity, factory] of Object.entries(config.handlers) as [
      TEntity,
      GenericHandlerFactory<TEntity>
    ][]) {
      if (factory) {
        registry.register(entity, factory as GenericHandlerFactory<TEntity>);
      }
    }
  }

  for (const [entity, entityConfig] of Object.entries(config.entities) as [
    TEntity,
    EntityConfig<TEntity>
  ][]) {
    if (!registry.hasHandler(entity)) {
      const defaultFactory = createDefaultHandlerFactory(entity, entityConfig);
      registry.register(entity, defaultFactory);
    }
  }

  return registry;
}

function initializeConflictResolverRegistry<TEntity extends string>(
  config: SyncEngineConfig<TEntity>
): GenericConflictResolverRegistry<TEntity> {
  const registry = new GenericConflictResolverRegistry<TEntity>();

  if (config.conflictResolvers) {
    for (const [strategy, resolver] of Object.entries(config.conflictResolvers)) {
      registry.register(strategy, resolver as IGenericConflictResolver);
    }
  }

  for (const [, entityConfig] of Object.entries(config.entities) as [
    TEntity,
    EntityConfig<TEntity>
  ][]) {
    if (entityConfig.conflictResolver && !registry.hasResolver(entityConfig.conflictResolver)) {
      const resolver = createDefaultConflictResolver(entityConfig.conflictResolver);
      registry.register(entityConfig.conflictResolver, resolver);
    }
  }

  return registry;
}

function createDefaultHandlerFactory<TEntity extends string>(
  entityType: TEntity,
  config: EntityConfig<TEntity>
): GenericHandlerFactory<TEntity> {
  return ((deps: unknown) => {
    return {
      entityType,

      async validateBusinessRules(ctx: unknown, payload: Record<string, unknown>) {
        if (config.hooks?.beforeSync) {
          await config.hooks.beforeSync(payload, ctx);
        }
      },

      async execute(ctx: unknown, operation: { idempotencyKey: string; payload: Record<string, unknown> }) {
        const payload = operation.payload;

        const validFields = new Set(config.fields as readonly string[]);
        const filteredPayload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(payload)) {
          if (validFields.has(key)) {
            filteredPayload[key] = value;
          }
        }

        if (config.hooks?.afterSync) {
          await config.hooks.afterSync(filteredPayload, ctx);
        }

        return {
          success: true,
          idempotencyKey: operation.idempotencyKey,
          serverTimestamp: new Date().toISOString(),
        };
      },

      supportsSelfHeal() {
        return config.selfHeal;
      },
    };
  }) as GenericHandlerFactory<TEntity>;
}

function createDefaultConflictResolver(
  strategy: string
): IGenericConflictResolver {
  switch (strategy) {
    case "last-write-wins":
      return new NoOpConflictResolver() as IGenericConflictResolver;

    case "first-write-wins":
      return new NoOpConflictResolver() as IGenericConflictResolver;

    case "version-based":
      return new NoOpConflictResolver() as IGenericConflictResolver;

    default:
      return new NoOpConflictResolver() as IGenericConflictResolver;
  }
}

export { SyncEngineInstance } from "./sync-engine-instance";
export type { SyncEngineInstance as SyncEngine } from "./sync-engine-instance";
