/**
 * EntityRegistry
 *
 * Tracks entity state changes within a sync batch for in-memory validation.
 * Avoids unnecessary DB queries when parent entities are created in the same batch.
 */

import type { EntityRegistry as IEntityRegistry } from "./types";

/**
 * EntityRegistry
 * Tracks entity state changes within a sync batch for in-memory validation
 * Avoids unnecessary DB queries when parent entities are created in the same batch
 */
export class EntityRegistry implements IEntityRegistry {
  private createdIds = new Set<string>();
  private updatedIds = new Set<string>();
  private deletedIds = new Set<string>();

  /**
   * Register an entity operation
   */
  register(operation: "create" | "update" | "delete", entityId: string): void {
    switch (operation) {
      case "create":
        this.createdIds.add(entityId);
        break;
      case "update":
        this.updatedIds.add(entityId);
        break;
      case "delete":
        this.deletedIds.add(entityId);
        break;
    }
  }

  /**
   * Check if entity was created in this batch
   */
  wasCreated(entityId: string): boolean {
    return this.createdIds.has(entityId);
  }

  /**
   * Check if entity was modified (created or updated) in this batch
   */
  wasModified(entityId: string): boolean {
    return this.updatedIds.has(entityId) || this.createdIds.has(entityId);
  }

  /**
   * Check if entity was deleted in this batch
   */
  wasDeleted(entityId: string): boolean {
    return this.deletedIds.has(entityId);
  }

  /**
   * Clear all tracked entities
   */
  clear(): void {
    this.createdIds.clear();
    this.updatedIds.clear();
    this.deletedIds.clear();
  }

  /**
   * Get stats for debugging
   */
  getStats(): { created: number; updated: number; deleted: number } {
    return {
      created: this.createdIds.size,
      updated: this.updatedIds.size,
      deleted: this.deletedIds.size,
    };
  }
}
