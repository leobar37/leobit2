import type { StateMachine } from "../../lib/state-machine";
import type { Sale, SaleItem } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { SaleRepository } from "../repository/sale.repository";

export type SaleState = "draft" | "confirmed" | "active" | "delivered" | "cancelled";

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export interface SaleTransitionDeps {
  paymentRepository: PaymentRepository;
  distribucionItemRepository: DistribucionItemRepository;
  saleRepository: SaleRepository;
}

export function setupSaleTransitions(
  machine: StateMachine<SaleWithItems, SaleState>,
  deps: SaleTransitionDeps
): void {
  machine
    // draft → cancelled: Cleanup (no side effects needed, just status change)
    .onTransition("draft", "cancelled", async (_ctx, _sale) => {
      // No inventory or payment side effects for draft cancellations
      // Items are simply discarded
    })

    // active → cancelled: Return inventory to distribución + create reversal payment
    .onTransition("active", "cancelled", async (ctx: RequestContext, sale: SaleWithItems & { _refundData?: { refundAmount?: number; refundMethod?: string; refundReference?: string } }, tx?: unknown) => {
      // 1. Create reversal payment if there was a payment
      const refundData = sale._refundData;
      const refundAmount = refundData?.refundAmount;
      const refundMethod = refundData?.refundMethod;
      
      if (refundAmount && refundAmount > 0 && sale.customerId) {
        const validMethods = ["efectivo", "yape", "plin", "transferencia", "saldo", "tarjeta"] as const;
        const method = (refundMethod && validMethods.includes(refundMethod as any)) 
          ? refundMethod as typeof validMethods[number]
          : "efectivo";
        
        await deps.paymentRepository.createReversal(
          ctx,
          {
            customerId: sale.customerId,
            amount: (-refundAmount).toFixed(2),
            paymentMethod: method,
            referenceNumber: refundData?.refundReference,
            notes: `Reembolso por cancelación de venta #${sale.id}`,
            relatedSaleId: sale.id,
          },
          tx as any
        );
      }

      // 2. Return inventory to distribución
      if (sale.distribucionId) {
        const saleItems = await deps.saleRepository.findSaleItems(ctx, sale.id, tx as any);
        const distribucionItems = await deps.distribucionItemRepository.findByDistribucionId(
          ctx,
          sale.distribucionId
        );

        for (const saleItem of saleItems) {
          const distItem = distribucionItems.find(
            (di) => di.variantId === saleItem.variantId
          );

          if (distItem && saleItem.quantity) {
            const currentVendida = parseFloat(distItem.cantidadVendida);
            const newVendida = Math.max(currentVendida - parseFloat(saleItem.quantity), 0);
            
            await deps.distribucionItemRepository.updateVendido(
              ctx,
              distItem.id,
              newVendida.toString(),
              tx as any
            );
          }
        }
      }
    })

    // confirmed → delivered: Create snapshot for pre_orders
    .onTransition("confirmed", "delivered", async (ctx: RequestContext, sale: SaleWithItems, tx?: unknown) => {
      // For pre_orders, creating a snapshot is handled in the repository
      // This hook can be used for additional side effects like:
      // - Sending notifications
      // - Updating visita status
      // - Creating delivery tracking

      if (sale.visitaId) {
        // Update visita status to indicate purchase was made
        // This would require visitaRepository dependency
      }
    })

    // confirmed → cancelled: Return inventory to distribución for pre_orders
    .onTransition("confirmed", "cancelled", async (ctx: RequestContext, sale: SaleWithItems, tx?: unknown) => {
      // For pre_orders, when cancelled at confirmed stage, return allocated inventory
      // No payment reversal needed since no payment was made at confirmation
      if (sale.distribucionId) {
        const saleItems = await deps.saleRepository.findSaleItems(ctx, sale.id, tx as any);
        const distribucionItems = await deps.distribucionItemRepository.findByDistribucionId(
          ctx,
          sale.distribucionId
        );

        for (const saleItem of saleItems) {
          const distItem = distribucionItems.find(
            (di) => di.variantId === saleItem.variantId
          );

          // For pre-orders, we track orderedQuantity not quantity
          const orderedQty = saleItem.orderedQuantity || saleItem.quantity;
          if (distItem && orderedQty) {
            const currentVendida = parseFloat(distItem.cantidadVendida);
            const newVendida = Math.max(currentVendida - parseFloat(orderedQty), 0);

            await deps.distribucionItemRepository.updateVendido(
              ctx,
              distItem.id,
              newVendida.toString(),
              tx as any
            );
          }
        }
      }
    });
}
