/**
 * Purchase Sync Hooks
 * Hooks that control when purchases should be synced to the server
 */
import type { PGlite } from "@electric-sql/pglite";
import { createHook, type SyncHookContext } from "../create-sync-hook";

/**
 * Hook that prevents syncing empty purchases (no supplier and no items)
 * A purchase is considered valid for sync if it has:
 * - A supplier assigned, OR
 * - At least one item
 */
export const purchaseSyncHook = createHook("purchases")
  .onBeforeSync(async (context: SyncHookContext, options: { pg: PGlite; businessId: string }) => {
    // Only check on insert operations
    if (context.operation !== "insert") {
      return { allow: true };
    }

    const pg = options.pg;
    const businessId = options.businessId;

    // Check if purchase has a supplier
    const hasSupplier = Boolean(context.data.supplierId);

    // Check if purchase has items
    const itemsResult = await pg.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM purchase_items WHERE purchase_id = $1 AND business_id = $2`,
      [context.entityId, businessId]
    );
    const hasItems = (itemsResult.rows[0]?.count ?? 0) > 0;

    // Allow sync if has supplier OR has items
    if (hasSupplier || hasItems) {
      return { allow: true };
    }

    return {
      allow: false,
      reason: "Compra vacía: sin proveedor ni productos",
    };
  })
  .build();
