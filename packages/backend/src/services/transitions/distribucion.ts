import type { StateMachine } from "../../lib/state-machine";
import type { DistribucionWithItems, DistribucionState } from "./index";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";

export function setupDistribucionTransitions(
  machine: StateMachine<DistribucionWithItems, DistribucionState>,
  variantRepo: ProductVariantRepository
): void {
  machine
    .onTransition(null, "activo", async (ctx: RequestContext, distribucion: DistribucionWithItems) => {
      // Hook: Crear distribución → Reservar stock del inventario
      for (const item of distribucion.items) {
        const cantidadAsignada = parseFloat(item.cantidadAsignada);
        if (cantidadAsignada > 0) {
          await variantRepo.adjustInventory(ctx, item.variantId, -cantidadAsignada);
        }
      }
    })
    .onTransition("activo", "cerrado", async (ctx: RequestContext, distribucion: DistribucionWithItems) => {
      // Hook: Cerrar distribución → Retornar sobrante al inventario
      for (const item of distribucion.items) {
        const asignada = parseFloat(item.cantidadAsignada);
        const vendida = parseFloat(item.cantidadVendida);
        const sobrante = asignada - vendida;

        if (sobrante > 0) {
          await variantRepo.adjustInventory(ctx, item.variantId, sobrante);
        }
      }
    })
    .onTransition("activo", "en_ruta", async (_ctx: RequestContext, _distribucion: DistribucionWithItems) => {
      // Hook: Distribución en ruta (sin side effects por ahora)
    })
    .onTransition("en_ruta", "cerrado", async (ctx: RequestContext, distribucion: DistribucionWithItems) => {
      // Hook: Cerrar desde ruta → Retornar sobrante al inventario
      for (const item of distribucion.items) {
        const asignada = parseFloat(item.cantidadAsignada);
        const vendida = parseFloat(item.cantidadVendida);
        const sobrante = asignada - vendida;

        if (sobrante > 0) {
          await variantRepo.adjustInventory(ctx, item.variantId, sobrante);
        }
      }
    });
}