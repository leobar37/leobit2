/**
 * OperationSorter
 *
 * Sorts sync operations by FK-based topological order.
 * Ensures parent entities are processed before children based on payload FK references.
 */

import type { SyncOperationInput } from "./types";
import type { ParentRelationConfig, ChildRelationConfig } from "../config/types";

/**
 * Result of sorting operations
 */
export interface SortResult {
  operations: SyncOperationInput[];
  groupCount: number;
}

/**
 * Parent entity reference from relations config
 */
interface ParentReference {
  entity: string;
  foreignKey: string;
}

/**
 * Build a map of entity type -> parent references from entity config
 */
function buildParentMap(
  entityConfigs: Record<string, { relations?: { parents?: ParentRelationConfig[]; children?: ChildRelationConfig[] } }>
): Map<string, ParentReference[]> {
  const parentMap = new Map<string, ParentReference[]>();

  const addParent = (entityName: string, parent: ParentReference): void => {
    const existing = parentMap.get(entityName) ?? [];
    if (!existing.some((entry) => entry.entity === parent.entity && entry.foreignKey === parent.foreignKey)) {
      existing.push(parent);
    }
    parentMap.set(entityName, existing);
  };

  for (const [entityName, config] of Object.entries(entityConfigs)) {
    for (const parent of config.relations?.parents ?? []) {
      addParent(entityName, {
        entity: parent.entity,
        foreignKey: parent.foreignKey,
      });
    }

    for (const child of config.relations?.children ?? []) {
      addParent(child.entity, {
        entity: entityName,
        foreignKey: child.foreignKey,
      });
    }
  }

  return parentMap;
}

/**
 * Find all parent entity IDs referenced in an operation's payload
 */
function findParentRefs(
  operation: SyncOperationInput,
  parentMap: Map<string, ParentReference[]>
): Map<string, string> {
  const refs = new Map<string, string>();
  const parents = parentMap.get(operation.entityType);

  if (!parents) return refs;

  for (const parent of parents) {
    const fkValue = operation.payload[parent.foreignKey];
    if (fkValue && typeof fkValue === "string") {
      refs.set(parent.entity, fkValue);
    }
  }

  return refs;
}

/**
 * Build a dependency graph: parent index -> set of dependent indices
 * graph[parentIdx] = Set of operation indices that depend on the parent
 * A child operation depends on its parent if the child's payload contains FK reference to parent's entityId
 */
function buildDependencyGraph(
  operations: SyncOperationInput[],
  parentMap: Map<string, ParentReference[]>
): Map<number, Set<number>> {
  const graph = new Map<number, Set<number>>();

  // Create maps for quick lookup by entityType + entityId
  const entityIndexMap = new Map<string, number>();
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const key = `${op.entityType}:${op.entityId}`;
    entityIndexMap.set(key, i);
  }

  // Initialize graph with empty sets
  for (let i = 0; i < operations.length; i++) {
    graph.set(i, new Set());
  }

  // Build dependencies: for each operation, find its parents and add edges
  // graph[parentIdx] includes childIdx if childIdx depends on parentIdx
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const parentRefs = findParentRefs(op, parentMap);

    for (const [parentEntity, parentId] of parentRefs) {
      const parentKey = `${parentEntity}:${parentId}`;
      const parentIdx = entityIndexMap.get(parentKey);
      if (parentIdx !== undefined) {
        // child i depends on parent parentIdx
        // Add edge: parentIdx -> i
        graph.get(parentIdx)!.add(i);
      }
    }
  }

  return graph;
}

/**
 * Topological sort using Kahn's algorithm with cycle detection
 * Falls back to original index order for nodes in cycles
 */
function topologicalSort(
  operations: SyncOperationInput[],
  graph: Map<number, Set<number>>
): number[] {
  const n = operations.length;
  const inDegree = new Array(n).fill(0);
  const result: number[] = [];

  // Calculate in-degrees: for each node, count how many other nodes depend on it
  // graph[A] = Set of nodes that depend on A (A must come before those nodes)
  // If graph[A] = {B}, then B depends on A, so B's in-degree increases
  for (const [node, deps] of graph) {
    // node is the dependency, deps are the nodes that depend on node
    for (const dep of deps) {
      inDegree[dep]++;
    }
  }

  // Start with nodes that have no dependencies (in-degree = 0)
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) {
      queue.push(i);
    }
  }

  // Sort queue by timestamp for deterministic ordering
  queue.sort(
    (a, b) =>
      new Date(operations[a].localTimestamp).getTime() -
      new Date(operations[b].localTimestamp).getTime()
  );

  // Process in topological order
  while (queue.length > 0) {
    const idx = queue.shift()!;
    result.push(idx);

    // For each node that depends on this one, reduce its in-degree
    const deps = graph.get(idx) || new Set();
    for (const dependent of deps) {
      inDegree[dependent]--;
      if (inDegree[dependent] === 0) {
        queue.push(dependent);
        // Keep queue sorted for deterministic output
        queue.sort(
          (a, b) =>
            new Date(operations[a].localTimestamp).getTime() -
            new Date(operations[b].localTimestamp).getTime()
        );
      }
    }
  }

  // If we have a cycle (not all nodes processed), append remaining nodes
  // sorted by timestamp to break ties gracefully
  if (result.length < n) {
    const processed = new Set(result);
    const remaining: number[] = [];

    for (let i = 0; i < n; i++) {
      if (!processed.has(i)) {
        remaining.push(i);
      }
    }

    // Sort remaining by timestamp to handle cycles deterministically
    remaining.sort(
      (a, b) =>
        new Date(operations[a].localTimestamp).getTime() -
        new Date(operations[b].localTimestamp).getTime()
    );

    result.push(...remaining);
  }

  return result;
}

/**
 * OperationSorter
 * Sorts operations for proper processing order
 */
export class OperationSorter {
  private parentMap: Map<string, ParentReference[]>;
  private priorityMap: Record<string, number>;

  constructor(
    entityConfigs: Record<
      string,
      { relations?: { parents?: ParentRelationConfig[]; children?: ChildRelationConfig[] }; priority?: number }
    >,
    options?: { priorities?: Record<string, number> }
  ) {
    this.parentMap = buildParentMap(entityConfigs);
    this.priorityMap = this.buildDerivedPriorityMap(entityConfigs);

    for (const [entityType, config] of Object.entries(entityConfigs)) {
      if (typeof config.priority === "number") {
        this.priorityMap[entityType] = config.priority;
      }
    }

    if (options?.priorities) {
      Object.assign(this.priorityMap, options.priorities);
    }
  }

  private buildDerivedPriorityMap(
    entityConfigs: Record<string, { relations?: { parents?: ParentRelationConfig[]; children?: ChildRelationConfig[] } }>
  ): Record<string, number> {
    const parentEdges = buildParentMap(entityConfigs);
    const cache = new Map<string, number>();
    const visiting = new Set<string>();

    const resolve = (entityType: string): number => {
      const cached = cache.get(entityType);
      if (cached !== undefined) {
        return cached;
      }

      if (visiting.has(entityType)) {
        return 1;
      }

      visiting.add(entityType);

      const parentPriorities = (parentEdges.get(entityType) ?? [])
        .map((parent) => resolve(parent.entity))
        .filter((priority) => Number.isFinite(priority));

      const derived = parentPriorities.length > 0
        ? Math.max(...parentPriorities) + 1
        : 1;

      visiting.delete(entityType);
      cache.set(entityType, derived);
      return derived;
    };

    const result: Record<string, number> = {};
    for (const entityType of Object.keys(entityConfigs)) {
      result[entityType] = resolve(entityType);
    }
    return result;
  }

  private getEntityPriority(entityType: string): number {
    return this.priorityMap[entityType] ?? 99;
  }

  /**
   * Sort operations by FK-based topological order:
   * 1. Parent entities before children (based on FK references in payload)
   * 2. Entity priority (secondary)
   * 3. Local timestamp (tertiary)
   */
  sort(operations: SyncOperationInput[]): SortResult {
    if (operations.length === 0) {
      return { operations: [], groupCount: 0 };
    }

    const graph = buildDependencyGraph(operations, this.parentMap);

    let hasFkDependencies = false;
    for (const [, deps] of graph) {
      if (deps.size > 0) {
        hasFkDependencies = true;
        break;
      }
    }

    if (hasFkDependencies) {
      const sortedIndices = topologicalSort(operations, graph);
      const sortedOperations = sortedIndices.map((i) => operations[i]);

      return {
        operations: sortedOperations,
        groupCount: 0,
      };
    }

    const sortedOperations = [...operations].sort((a, b) => {
      const priorityA = this.getEntityPriority(a.entityType);
      const priorityB = this.getEntityPriority(b.entityType);
      if (priorityA !== priorityB) return priorityA - priorityB;

      return (
        new Date(a.localTimestamp).getTime() - new Date(b.localTimestamp).getTime()
      );
    });

    return {
      operations: sortedOperations,
      groupCount: 0,
    };
  }

  /**
   * Get the entity priority map
   */
  getPriorityMap(): Partial<Record<string, number>> {
    return { ...this.priorityMap };
  }
}
