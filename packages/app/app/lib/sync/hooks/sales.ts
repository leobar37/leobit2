/**
 * Sales Sync Hooks
 * Hooks that control when sales should be synced to the server
 */
import type { PGlite } from "@electric-sql/pglite";
import { createHook, type SyncHookContext } from "../create-sync-hook";

/**
 * Hook that prevents syncing empty sales (no customer and no items)
 * A sale is considered valid for sync if it has:
 * - A customer assigned, OR
 * - At least one item
 */
export const saleSyncHook = createHook("sales")
  .onBeforeSync(async (context: SyncHookContext, options: { pg: PGlite; businessId: string }) => {
    // Only check on create operations
    if (context.operation !== "create") {
      return { allow: true };
    }

    const pg = options.pg;
    const businessId = options.businessId;

    // Check if sale has a customer
    const hasCustomer = Boolean(context.data.customerId);

    // Check if sale has items
    const itemsResult = await pg.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM sale_items WHERE sale_id = $1 AND business_id = $2`,
      [context.entityId, businessId]
    );
    const hasItems = (itemsResult.rows[0]?.count ?? 0) > 0;

    // Allow sync if has customer OR has items
    if (hasCustomer || hasItems) {
      return { allow: true };
    }

    return {
      allow: false,
      reason: "Venta vacía: sin cliente ni productos",
    };
  })
  .build();
