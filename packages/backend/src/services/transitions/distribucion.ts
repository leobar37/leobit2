import type { StateMachine } from "../../lib/state-machine";
import type { DistribucionWithItems, DistribucionState } from "./index";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";

export function setupDistribucionTransitions(
  machine: StateMachine<DistribucionWithItems, DistribucionState>,
  _variantRepo: ProductVariantRepository
): void {
  // State transitions without side effects
  // Stock management is now separate from distribution lifecycle
  machine
    .onTransition(null, "activo", async (_ctx: RequestContext, _distribucion: DistribucionWithItems) => {
      // No-op: Stock no longer reserved on activation
    })
    .onTransition("activo", "cerrado", async (_ctx: RequestContext, _distribucion: DistribucionWithItems) => {
      // No-op: Stock no longer returned on close
    })
    .onTransition("activo", "en_ruta", async (_ctx: RequestContext, _distribucion: DistribucionWithItems) => {
      // No-op
    })
    .onTransition("en_ruta", "cerrado", async (_ctx: RequestContext, _distribucion: DistribucionWithItems) => {
      // No-op: Stock no longer returned on close
    });
}