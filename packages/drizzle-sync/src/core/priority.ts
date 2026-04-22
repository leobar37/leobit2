/**
 * Entity Priority Configuration
 *
 * Defines processing order for sync entities.
 * Parent entities (lower priority) are processed before children (higher priority).
 * This ensures referential integrity during batch operations.
 */

import type { EntityConfig } from "../config/types";

export type SyncEntity = string;

export interface EntityPriorityConfig {
  [entityType: string]: number;
}

/**
 * Optional default priority map.
 *
 * Domain consumers can configure this via `configureDefaultEntityPriorities`.
 */
const defaultEntityPrioritiesStore: EntityPriorityConfig = {};
export const DEFAULT_ENTITY_PRIORITIES: EntityPriorityConfig = defaultEntityPrioritiesStore;

export function configureDefaultEntityPriorities(
  priorities: Record<string, number>
): void {
  for (const key of Object.keys(defaultEntityPrioritiesStore)) {
    delete defaultEntityPrioritiesStore[key];
  }
  for (const [entityType, priority] of Object.entries(priorities)) {
    defaultEntityPrioritiesStore[entityType] = priority;
  }
}

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
