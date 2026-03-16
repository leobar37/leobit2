import type { SyncEntity } from "../types";
import type { ISyncHandler } from "./types";
import type { SyncEngineDeps } from "./SyncEngine";

type HandlerFactory = (deps: SyncEngineDeps) => ISyncHandler;

const handlers: Map<SyncEntity, HandlerFactory> = new Map();

export class HandlerRegistry {
  static register(entityType: SyncEntity, factory: HandlerFactory): void {
    handlers.set(entityType, factory);
  }

  static getHandler(entityType: SyncEntity, deps: SyncEngineDeps): ISyncHandler {
    const factory = handlers.get(entityType);
    if (!factory) {
      throw new Error(`No handler registered for entity: ${entityType}`);
    }
    return factory(deps);
  }

  static hasHandler(entityType: SyncEntity): boolean {
    return handlers.has(entityType);
  }

  static getRegisteredEntities(): SyncEntity[] {
    return Array.from(handlers.keys()) as SyncEntity[];
  }

  static clear(): void {
    handlers.clear();
  }
}

export type { HandlerFactory };
