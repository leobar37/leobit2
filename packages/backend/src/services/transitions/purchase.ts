import type { StateMachine } from "../../lib/state-machine";
import type { PurchaseWithItems, PurchaseState } from "./index";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";

export function setupPurchaseTransitions(
  machine: StateMachine<PurchaseWithItems, PurchaseState>,
  variantRepo: ProductVariantRepository
): void {
  machine
    .onTransition("pending", "received", async (ctx: RequestContext, purchase: PurchaseWithItems) => {
      // Hook: Compra recibida → Agregar stock al inventario
      for (const item of purchase.items) {
        const quantity = parseFloat(item.quantity);
        if (quantity > 0) {
          const variantId = item.variantId || item.productId;
          const existingInventory = await variantRepo.getInventory(ctx, variantId);
          
          if (existingInventory) {
            const currentQty = parseFloat(existingInventory.quantity);
            const newQty = currentQty + quantity;
            await variantRepo.updateInventory(ctx, variantId, newQty.toString());
          } else {
            await variantRepo.createInventory(ctx, { variantId, quantity: quantity.toString() });
          }
        }
      }
    })
    .onTransition("received", "cancelled", async (ctx: RequestContext, purchase: PurchaseWithItems) => {
      // Hook: Compra cancelada (después de recibida) → Remover stock del inventario
      for (const item of purchase.items) {
        const quantity = parseFloat(item.quantity);
        const variantId = item.variantId || item.productId;
        
        if (quantity > 0) {
          const existingInventory = await variantRepo.getInventory(ctx, variantId);
          
          if (existingInventory) {
            const currentQty = parseFloat(existingInventory.quantity);
            const newQty = Math.max(0, currentQty - quantity);
            await variantRepo.updateInventory(ctx, variantId, newQty.toString());
          }
        }
      }
    });
}