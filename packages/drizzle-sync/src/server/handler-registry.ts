/**
 * HandlerRegistry
 *
 * Registry for sync handlers by entity type.
 * Allows dynamic registration and retrieval of handlers.
 *
 * Supports both:
 * - Static (legacy): HandlerRegistry.register() / getHandler()
 * - Instance (new): new HandlerRegistry(deps) with generic TEntity
 */

import type { SyncEntity } from "@avileo/shared";
import type { ISyncHandler, IGenericSyncHandler, SyncEngineDeps } from "./types";

/**
 * Factory function type for creating handlers (legacy)
 */
export type HandlerFactory<TDeps extends SyncEngineDeps = SyncEngineDeps> = (
  deps: TDeps
) => ISyncHandler<unknown, unknown>;

/**
 * Generic factory function type (config-based)
 */
export type GenericHandlerFactory<
  TEntity extends string = string,
  TDeps = unknown
> = (deps: TDeps) => IGenericSyncHandler<unknown, unknown, TEntity>;

/**
 * Generic handler registry (instance-based)
 */
export class GenericHandlerRegistry<
  TEntity extends string = string,
  TDeps = unknown
> {
  private handlers: Map<TEntity, GenericHandlerFactory<TEntity, TDeps>>;
  private deps: TDeps;

  constructor(deps: TDeps, initialHandlers?: Map<TEntity, GenericHandlerFactory<TEntity, TDeps>>) {
    this.deps = deps;
    this.handlers = initialHandlers ?? new Map();
  }

  register(entityType: TEntity, factory: GenericHandlerFactory<TEntity, TDeps>): void {
    this.handlers.set(entityType, factory);
  }

  getHandler(entityType: TEntity): IGenericSyncHandler<unknown, unknown, TEntity> {
    const factory = this.handlers.get(entityType);
    if (!factory) {
      throw new Error(`No handler registered for entity: ${entityType}`);
    }
    return factory(this.deps);
  }

  hasHandler(entityType: TEntity): boolean {
    return this.handlers.has(entityType);
  }

  getRegisteredEntities(): TEntity[] {
    return Array.from(this.handlers.keys());
  }

  unregister(entityType: TEntity): boolean {
    return this.handlers.delete(entityType);
  }

  clear(): void {
    this.handlers.clear();
  }

  createHandlers(): Map<TEntity, IGenericSyncHandler<unknown, unknown, TEntity>> {
    const handlers = new Map<TEntity, IGenericSyncHandler<unknown, unknown, TEntity>>();
    for (const [entityType, factory] of this.handlers) {
      handlers.set(entityType, factory(this.deps));
    }
    return handlers;
  }
}

/**
 * HandlerRegistry (legacy static registry)
 * @deprecated Use GenericHandlerRegistry instance instead
 */
export class HandlerRegistry {
  private static handlers: Map<SyncEntity, HandlerFactory> = new Map();

  static register(entityType: SyncEntity, factory: HandlerFactory): void {
    HandlerRegistry.handlers.set(entityType, factory);
  }

  static getHandler(
    entityType: SyncEntity,
    deps: SyncEngineDeps
  ): ISyncHandler<unknown, unknown> {
    const factory = HandlerRegistry.handlers.get(entityType);
    if (!factory) {
      throw new Error(`No handler registered for entity: ${entityType}`);
    }
    return factory(deps);
  }

  static hasHandler(entityType: SyncEntity): boolean {
    return HandlerRegistry.handlers.has(entityType);
  }

  static getRegisteredEntities(): SyncEntity[] {
    return Array.from(HandlerRegistry.handlers.keys()) as SyncEntity[];
  }

  static clear(): void {
    HandlerRegistry.handlers.clear();
  }
}

/**
 * Create a typed handler registry
 */
export function createHandlerRegistry<TEntity extends string>(
  deps: unknown,
  handlers?: Partial<Record<TEntity, GenericHandlerFactory<TEntity>>>
): GenericHandlerRegistry<TEntity> {
  const registry = new GenericHandlerRegistry<TEntity>(deps);

  if (handlers) {
    for (const [entity, factory] of Object.entries(handlers) as [TEntity, GenericHandlerFactory<TEntity>][]) {
      registry.register(entity, factory);
    }
  }

  return registry;
}
