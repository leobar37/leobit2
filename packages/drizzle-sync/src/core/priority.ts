/**
 * Entity Priority Configuration
 *
 * Defines processing order for sync entities.
 * Parent entities (lower priority) are processed before children (higher priority).
 * This ensures referential integrity during batch operations.
 *
 * Uses canonical configuration from @avileo/shared to avoid duplication.
 * Also provides generic config-based functions for use with the new config system.
 */

import {
  ENTITY_PRIORITIES,
  getEntityPriority as sharedGetEntityPriority,
  type SyncEntity,
} from "@avileo/shared";

import type { EntityConfig } from "../config/types";

export type { SyncEntity } from "@avileo/shared";

export interface EntityPriorityConfig {
  [entityType: string]: number;
}

/**
 * Default priority tiers for sync entity processing.
 * @deprecated Use config-based getEntityPriority(entity, entities) instead
 */
export const DEFAULT_ENTITY_PRIORITIES: EntityPriorityConfig = ENTITY_PRIORITIES as EntityPriorityConfig;

// ============================================================================
// Generic Config-Based Functions (NEW)
// ============================================================================

export const DEFAULT_PRIORITY = 99;

export function getEntityPriorityFromConfig<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): number {
  return entities[entityType]?.priority ?? DEFAULT_PRIORITY;
}

export function sortEntitiesByPriorityFromConfig<TEntity extends string>(
  entityTypes: TEntity[],
  entities: Record<TEntity, EntityConfig<TEntity>>
): TEntity[] {
  return [...entityTypes].sort((a, b) => {
    const priorityA = getEntityPriorityFromConfig(a, entities);
    const priorityB = getEntityPriorityFromConfig(b, entities);
    return priorityA - priorityB;
  });
}

export function groupEntitiesByPriorityFromConfig<TEntity extends string>(
  entityTypes: TEntity[],
  entities: Record<TEntity, EntityConfig<TEntity>>
): Map<number, TEntity[]> {
  const groups = new Map<number, TEntity[]>();

  for (const entityType of entityTypes) {
    const priority = getEntityPriorityFromConfig(entityType, entities);
    const existing = groups.get(priority) ?? [];
    existing.push(entityType);
    groups.set(priority, existing);
  }

  return groups;
}

export function isParentEntityFromConfig<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): boolean {
  const config = entities[entityType];
  if (!config) return false;
  return config.priority === 1 || (config.childEntities != null && config.childEntities.length > 0);
}

export function isChildEntityFromConfig<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): boolean {
  const priority = getEntityPriorityFromConfig(entityType, entities);
  return priority > 1 && priority < DEFAULT_PRIORITY;
}

export function getChildEntities<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): TEntity[] {
  const config = entities[entityType];
  if (!config?.childEntities) return [];
  return config.childEntities.filter(
    (child): child is TEntity => child in entities
  );
}

export function getParentEntity<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): TEntity | undefined {
  const config = entities[entityType];
  if (!config?.parentFields) return undefined;
  for (const [otherEntity, otherConfig] of Object.entries(entities) as [
    TEntity,
    EntityConfig<TEntity>
  ][]) {
    if (otherEntity === entityType) continue;
    if (otherConfig.childEntities?.includes(entityType)) {
      return otherEntity;
    }
  }
  return undefined;
}

export function buildEntityProcessingOrder<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): TEntity[] {
  const sorted: TEntity[] = [];
  const visited = new Set<TEntity>();
  const visiting = new Set<TEntity>();

  function visit(entityType: TEntity) {
    if (visited.has(entityType)) return;
    if (visiting.has(entityType)) {
      throw new Error(`Circular dependency detected involving ${entityType}`);
    }

    visiting.add(entityType);

    const config = entities[entityType];
    if (config?.childEntities) {
      for (const child of config.childEntities) {
        if (child in entities) {
          visit(child as TEntity);
        }
      }
    }

    visiting.delete(entityType);
    visited.add(entityType);
    sorted.push(entityType);
  }

  const allEntities = Object.keys(entities) as TEntity[];
  const byPriority = sortEntitiesByPriorityFromConfig(allEntities, entities);

  for (const entity of byPriority) {
    visit(entity);
  }

  return sorted;
}

export function buildPriorityConfigFromEntities<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): EntityPriorityConfig {
  const config: EntityPriorityConfig = {};
  for (const [entityType, entityConfig] of Object.entries(entities) as [
    TEntity,
    EntityConfig<TEntity>
  ][]) {
    config[entityType] = entityConfig.priority;
  }
  return config;
}

// ============================================================================
// Legacy Functions (backward compat)
// ============================================================================

/**
 * @deprecated Use getEntityPriorityFromConfig(entity, entities) instead
 */
export function getEntityPriority(
  entityType: string,
  config: EntityPriorityConfig = DEFAULT_ENTITY_PRIORITIES
): number {
  if (config === DEFAULT_ENTITY_PRIORITIES) {
    return sharedGetEntityPriority(entityType as SyncEntity);
  }
  return config[entityType] ?? 99;
}

/**
 * @deprecated Use sortEntitiesByPriorityFromConfig(entityTypes, entities) instead
 */
export function sortEntitiesByPriority(
  entityTypes: string[],
  config: EntityPriorityConfig = DEFAULT_ENTITY_PRIORITIES
): string[] {
  return [...entityTypes].sort((a, b) => {
    const priorityA = getEntityPriority(a, config);
    const priorityB = getEntityPriority(b, config);
    return priorityA - priorityB;
  });
}

/**
 * @deprecated Use groupEntitiesByPriorityFromConfig(entityTypes, entities) instead
 */
export function groupEntitiesByPriority(
  entityTypes: string[],
  config: EntityPriorityConfig = DEFAULT_ENTITY_PRIORITIES
): Map<number, string[]> {
  const groups = new Map<number, string[]>();

  for (const entityType of entityTypes) {
    const priority = getEntityPriority(entityType, config);
    const existing = groups.get(priority) ?? [];
    existing.push(entityType);
    groups.set(priority, existing);
  }

  return groups;
}

/**
 * @deprecated Use isParentEntityFromConfig(entity, entities) instead
 */
export function isParentEntity(
  entityType: string,
  config: EntityPriorityConfig = DEFAULT_ENTITY_PRIORITIES
): boolean {
  return getEntityPriority(entityType, config) === 1;
}

/**
 * @deprecated Use isChildEntityFromConfig(entity, entities) instead
 */
export function isChildEntity(
  entityType: string,
  config: EntityPriorityConfig = DEFAULT_ENTITY_PRIORITIES
): boolean {
  const priority = getEntityPriority(entityType, config);
  return priority > 1 && priority < 99;
}
