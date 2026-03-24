/**
 * Sync Hook Builder
 * Fluent API for creating sync hooks that can block or allow synchronization
 */
import type { PGlite } from "@electric-sql/pglite";

export type SyncOperation = "create" | "update" | "delete";

export interface SyncHookContext {
  operation: SyncOperation;
  entityId: string;
  data: Record<string, unknown>;
}

export interface SyncHookResult {
  allow: boolean;
  reason?: string;
}

export type SyncCondition = (
  context: SyncHookContext,
  options: { pg: PGlite; businessId: string }
) => Promise<SyncHookResult> | SyncHookResult;

export interface SyncHook {
  entityType: string;
  condition: SyncCondition;
}

interface SyncHookBuilder {
  entityType: string;
  _condition?: SyncCondition;
  onBeforeSync(condition: SyncCondition): SyncHookBuilder;
  build(): SyncHook;
}

/**
 * Creates a sync hook builder with fluent API
 * @param entityType - The entity type (e.g., 'sales', 'customers')
 * @returns A builder to configure the hook
 *
 * @example
 * const saleHook = createHook('sales')
 *   .onBeforeSync(async ({ operation, data }) => {
 *     if (operation === 'create' && !data.customerId) {
 *       return { allow: false, reason: 'Venta sin cliente' };
 *     }
 *     return { allow: true };
 *   });
 */
export function createHook(entityType: string): SyncHookBuilder {
  const builder: SyncHookBuilder = {
    entityType,

    onBeforeSync(condition: SyncCondition): SyncHookBuilder {
      builder._condition = condition;
      return builder;
    },

    build(): SyncHook {
      return {
        entityType: builder.entityType,
        condition: builder._condition || (() => ({ allow: true })),
      };
    },
  };

  return builder;
}
