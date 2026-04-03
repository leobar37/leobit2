import type { SaleRepository, CreateSaleInput } from "../repository/sale.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { BusinessRepository } from "../repository/business.repository";
import type { VisitaRepository } from "../repository/visita.repository";
import type { RequestContext } from "../../context/request-context";
import { ValidationError, ForbiddenError, NotFoundError } from "../../errors";
import type { Sale, SaleItem } from "../../db/schema";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import { toISODateString, now } from "../../lib/date-utils";
import { normalizeAmount } from "../../lib/number-utils";
import { saleMachine } from "../transitions";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class SaleService {
  constructor(
    private repository: SaleRepository,
    private paymentRepository: PaymentRepository,
    private distribucionRepository: DistribucionRepository,
    private distribucionItemRepository: DistribucionItemRepository,
    private businessRepository: BusinessRepository,
    private visitaRepository: VisitaRepository
  ) {}

  async getSales(
    ctx: RequestContext,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      saleType?: "contado" | "credito";
      limit?: number;
      offset?: number;
    }
  ) {
    return this.repository.findMany(ctx, filters);
  }

  async getSale(ctx: RequestContext, id: string): Promise<Sale> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }
    return sale;
  }

  async createSale(
    ctx: RequestContext,
    data: {
      id?: string;
      customerId?: string;
      distribucionId?: string;
      visitaId?: string;
      type?: "instant_sale" | "pre_order";
      saleType: "contado" | "credito";
      totalAmount: number;
      amountPaid?: number;
      tara?: number;
      netWeight?: number;
      saleDate?: string;
      deliveryDate?: string;
      orderDate?: string;
      items: Array<{
        productId: string;
        productName: string;
        variantId: string;
        variantName: string;
        quantity?: number;
        orderedQuantity?: number;
        unitPrice?: number;
        unitPriceQuoted?: number;
        subtotal: number;
      }>;
    }
  ): Promise<MutationResult<Sale>> {
    const items = data.items || [];
    const isEmptyDraft =
      items.length === 0 &&
      data.totalAmount === 0 &&
      (data.amountPaid ?? 0) === 0;

    if (!isEmptyDraft && items.length === 0) {
      throw new ValidationError("La venta debe tener al menos un producto");
    }

    // Validate that all items have variant
    for (const item of items) {
      if (!item.variantId) {
        throw new ValidationError("Todos los productos deben tener una variante seleccionada");
      }
    }

    if (!isEmptyDraft && data.totalAmount <= 0) {
      throw new ValidationError("El monto total debe ser mayor a 0");
    }

    // Calculate total from items - this is the authoritative value
    const calculatedTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const submittedTotal = data.totalAmount;

    // Validate that submitted total matches calculated total
    if (!isEmptyDraft && Math.abs(calculatedTotal - submittedTotal) > 0.01) {
      throw new ValidationError(
        `El total no coincide con la suma de productos. Calculado: S/ ${calculatedTotal.toFixed(2)}, Enviado: S/ ${submittedTotal.toFixed(2)}`
      );
    }

    // Use calculated total (not submitted) - ensures data integrity
    const totalAmount = parseFloat(
      normalizeAmount(isEmptyDraft ? 0 : calculatedTotal, 2, "totalAmount")
    );
    const amountPaidInput =
      data.amountPaid ?? (data.saleType === "contado" ? totalAmount : 0);
    const amountPaid = parseFloat(normalizeAmount(amountPaidInput, 2, "amountPaid"));

    const balanceDue = data.saleType === "credito" ? Math.max(totalAmount - amountPaid, 0) : 0;

    if (data.saleType === "credito" && !data.customerId) {
      throw new ValidationError("La venta a crédito requiere cliente");
    }

    if (!isEmptyDraft && data.saleType === "contado" && Math.abs(amountPaid - totalAmount) > 0.01) {
      throw new ValidationError("En venta al contado, el monto pagado debe ser igual al total");
    }

    if (!isEmptyDraft && data.saleType === "credito" && amountPaid > totalAmount) {
      throw new ValidationError("El monto pagado no puede ser mayor al total");
    }

    const today = toISODateString(now());
    const distribucion = await this.distribucionRepository.findByVendedorAndFecha(
      ctx,
      ctx.businessUserId,
      today
    );

    const isPreOrder = data.type === "pre_order";

    if (!isEmptyDraft && distribucion) {
      // NOTE: Pre-orders skip stock validation at confirmation time because:
    }

    const salePayload: CreateSaleInput = {
      customerId: data.customerId,
      distribucionId: data.distribucionId,
      visitaId: data.visitaId,
      type: data.type || "instant_sale",
      saleType: data.saleType,
      totalAmount: totalAmount.toFixed(2),
      amountPaid: amountPaid.toFixed(2),
      balanceDue: balanceDue.toFixed(2),
      tara: isPreOrder ? undefined : data.tara?.toString(),
      netWeight: isPreOrder ? undefined : data.netWeight?.toString(),
      deliveryDate: isPreOrder ? data.deliveryDate : undefined,
      orderDate: isPreOrder ? data.orderDate : undefined,
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        // For instant_sales
        quantity: item.quantity?.toString(),
        unitPrice: item.unitPrice?.toString(),
        // For pre_orders
        orderedQuantity: item.orderedQuantity?.toString(),
        unitPriceQuoted: item.unitPriceQuoted?.toString(),
        subtotal: item.subtotal.toString(),
      })),
    };

    return db.transaction(async (tx) => {
      const sale = await this.repository.create(ctx, salePayload, tx);

      // If sale was created from a visita, update the visita status to "compro"
      if (data.visitaId) {
        await this.visitaRepository.updateStatus(
          ctx,
          data.visitaId,
          { status: "compro", saleId: sale.id },
          tx
        );
      }

      if (data.saleType === "credito" && data.customerId && amountPaid > 0) {
        const initialPaymentReference = `init-sale:${sale.id}`;
        await this.paymentRepository.createInitialPayment(
          ctx,
          {
            customerId: data.customerId,
            amount: amountPaid.toFixed(2),
            referenceNumber: initialPaymentReference,
          },
          tx
        );
      }

      return {
        data: sale,
        txid: await getTxid(tx),
      };
    });
  }

  async updateSale(
    ctx: RequestContext,
    id: string,
    data: {
      customerId?: string | null;
      deliveryDate?: string | null;
      saleType?: "contado" | "credito";
      paymentMode?: "pago_total" | "a_cuenta" | "debe_todo" | null;
      totalAmount?: number;
      amountPaid?: number;
    }
  ): Promise<MutationResult<Sale>> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (sale.status !== "draft") {
      throw new ValidationError("Solo se pueden editar ventas en borrador");
    }

    const totalAmount = parseFloat(
      normalizeAmount(
        data.totalAmount ?? Number(sale.totalAmount),
        2,
        "totalAmount"
      )
    );
    const amountPaid = parseFloat(
      normalizeAmount(
        data.amountPaid ?? Number(sale.amountPaid),
        2,
        "amountPaid"
      )
    );
    const saleType = data.saleType ?? sale.saleType;
    const customerId =
      data.customerId !== undefined ? data.customerId : sale.customerId;

    if (saleType === "credito" && !customerId) {
      throw new ValidationError("La venta a crédito requiere cliente");
    }

    if (saleType === "contado" && Math.abs(amountPaid - totalAmount) > 0.01) {
      throw new ValidationError("En venta al contado, el monto pagado debe ser igual al total");
    }

    if (saleType === "credito" && amountPaid > totalAmount) {
      throw new ValidationError("El monto pagado no puede ser mayor al total");
    }

    const balanceDue =
      saleType === "credito" ? Math.max(totalAmount - amountPaid, 0) : 0;
    const paymentMode =
      data.paymentMode !== undefined
        ? data.paymentMode
        : this.derivePaymentMode(saleType, totalAmount, amountPaid);

    this.validatePaymentMode(paymentMode, saleType, totalAmount, amountPaid);

    return db.transaction(async (tx) => {
      const updatedSale = await this.repository.update(
        ctx,
        id,
        {
          customerId,
          deliveryDate: data.deliveryDate !== undefined ? data.deliveryDate : sale.deliveryDate,
          saleType,
          paymentMode,
          totalAmount: totalAmount.toFixed(2),
          amountPaid: amountPaid.toFixed(2),
          balanceDue: balanceDue.toFixed(2),
        },
        tx
      );

      return {
        data: updatedSale,
        txid: await getTxid(tx),
      };
    });
  }

  async deleteSale(ctx: RequestContext, id: string): Promise<void> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar ventas");
    }

    // Draft sales: hard delete
    // Processed sales: soft delete (change to cancelled)
    if (sale.status === "draft") {
      await this.repository.delete(ctx, id);
    } else {
      // Soft delete - change status to cancelled
      await this.repository.update(ctx, id, {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: ctx.businessUserId,
      });
    }
  }

  private derivePaymentMode(
    saleType: "contado" | "credito",
    totalAmount: number,
    amountPaid: number
  ): "pago_total" | "a_cuenta" | "debe_todo" {
    if (saleType === "contado") {
      return "pago_total";
    }

    if (amountPaid <= 0) {
      return "debe_todo";
    }

    if (amountPaid >= totalAmount) {
      return "pago_total";
    }

    return "a_cuenta";
  }

  private validatePaymentMode(
    paymentMode: "pago_total" | "a_cuenta" | "debe_todo" | null,
    saleType: "contado" | "credito",
    totalAmount: number,
    amountPaid: number
  ) {
    if (!paymentMode) {
      return;
    }

    if (saleType === "contado" && paymentMode !== "pago_total") {
      throw new ValidationError("La venta al contado debe usar pago total");
    }

    if (saleType === "credito" && paymentMode === "pago_total" && amountPaid < totalAmount) {
      throw new ValidationError("paymentMode no coincide con el estado de pago");
    }

    if (paymentMode === "debe_todo" && amountPaid > 0) {
      throw new ValidationError("Debe todo no puede tener monto pagado");
    }

    if (paymentMode === "a_cuenta" && (amountPaid <= 0 || amountPaid > totalAmount)) {
      throw new ValidationError("A cuenta requiere un monto pagado válido");
    }

    if (paymentMode === "pago_total" && Math.abs(amountPaid - totalAmount) > 0.01) {
      throw new ValidationError("Pago total requiere cubrir el monto completo");
    }
  }

  async confirmSale(
    ctx: RequestContext,
    id: string,
    baseVersion?: number
  ): Promise<MutationResult<Sale>> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (sale.status !== "draft") {
      throw new ValidationError("Solo se pueden confirmar ventas en estado borrador");
    }

    // Validate that sale has items before confirming
    const saleItems = await this.repository.findSaleItems(ctx, id);
    if (saleItems.length === 0) {
      throw new ValidationError("No puedes confirmar una venta sin productos");
    }

    // For pre_orders, use versioned confirm
    if (sale.type === "pre_order") {
      if (baseVersion === undefined) {
        throw new ValidationError("baseVersion es requerido para confirmar pedidos");
      }
      return db.transaction(async (tx) => {
        const confirmedSale = await this.repository.confirmPreOrder(ctx, id, baseVersion, tx);
        return {
          data: confirmedSale,
          txid: await getTxid(tx),
        };
      });
    }

    // For instant_sales
    return db.transaction(async (tx) => {
      const confirmedSale = await this.repository.update(
        ctx,
        id,
        { status: "active" },
        tx
      );

      return {
        data: confirmedSale,
        txid: await getTxid(tx),
      };
    });
  }

  async deliverPreOrder(
    ctx: RequestContext,
    id: string,
    baseVersion: number
  ): Promise<MutationResult<Sale>> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (sale.type !== "pre_order") {
      throw new ValidationError("Solo los pedidos pueden ser entregados");
    }

    if (sale.status !== "confirmed") {
      throw new ValidationError("Solo se pueden entregar pedidos confirmados");
    }

    return db.transaction(async (tx) => {
      const deliveredSale = await this.repository.deliverPreOrder(ctx, id, baseVersion, tx);
      return {
        data: deliveredSale,
        txid: await getTxid(tx),
      };
    });
  }

  async cancelSale(
    ctx: RequestContext,
    id: string,
    data: {
      reason: string;
      refundAmount?: number;
      refundMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "saldo";
      refundReference?: string;
      refundNotes?: string;
    }
  ): Promise<Sale> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden cancelar ventas");
    }

    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (sale.status === "cancelled") {
      return sale;
    }

    const previousStatus = sale.status as "draft" | "confirmed" | "active" | "delivered";
    
    // Get sale items for the transition hook
    const saleItems = await this.repository.findSaleItems(ctx, id);
    const saleWithItems = { ...sale, items: saleItems };

    return db.transaction(async (tx) => {
      // Execute state machine transition first (for active status, handles side effects)
      if (previousStatus === "active") {
        // Temporarily attach refund data to sale for the hook
        (saleWithItems as any)._refundData = {
          refundAmount: data.refundAmount,
          refundMethod: data.refundMethod,
          refundReference: data.refundReference,
        };
        await saleMachine.executeTransition(ctx, saleWithItems, previousStatus, "cancelled", tx);
      }

      const updateData: Partial<Sale> = {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: ctx.businessUserId,
        cancelReason: data.reason,
      };

      if (data.refundAmount && data.refundAmount > 0) {
        updateData.refundAmount = data.refundAmount.toFixed(2);
        updateData.refundDate = new Date();
        updateData.refundMethod = data.refundMethod as any;
        updateData.refundReference = data.refundReference;
        updateData.refundNotes = data.refundNotes;
      }

      const cancelledSale = await this.repository.update(ctx, id, updateData, tx);

      return cancelledSale;
    });
  }

  async getTodayStats(ctx: RequestContext): Promise<{ count: number; total: string }> {
    return this.repository.getTotalSalesToday(ctx);
  }

  /**
   * Get items for a sale
   */
  async getSaleItems(ctx: RequestContext, saleId: string): Promise<SaleItem[]> {
    const sale = await this.repository.findById(ctx, saleId);
    if (!sale) {
      throw new NotFoundError("Sale");
    }
    return this.repository.findSaleItems(ctx, saleId);
  }

  /**
   * Cleanup stale draft sales
   * - Drafts older than X days with no items
   * - Drafts older than 30 days regardless of items
   */
  async cleanupStaleDraftSales(
    ctx: RequestContext,
    options: {
      olderThanDays?: number;
      withNoItems?: boolean;
      olderThan30Days?: number;
    }
  ): Promise<{ deletedCount: number; deletedIds: string[] }> {
    const staleDrafts = await this.repository.findDrafts(ctx, {
      olderThanDays: options.olderThanDays ?? 7,
      withNoItems: options.withNoItems ?? true,
    });

    // Also find drafts older than 30 days regardless of items
    const veryOldDrafts = await this.repository.findDrafts(ctx, {
      olderThanDays: options.olderThan30Days ?? 30,
      withNoItems: false,
    });

    // Combine and deduplicate
    const allDrafts = [...staleDrafts];
    for (const draft of veryOldDrafts) {
      if (!allDrafts.find((d) => d.id === draft.id)) {
        allDrafts.push(draft);
      }
    }

    const deletedIds: string[] = [];

    for (const draft of allDrafts) {
      try {
        await this.repository.delete(ctx, draft.id);
        deletedIds.push(draft.id);
      } catch (error) {
        console.error(`Failed to delete stale draft ${draft.id}:`, error);
      }
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
    };
  }

  async addItem(
    ctx: RequestContext,
    saleId: string,
    data: {
      productId: string;
      productName: string;
      variantId: string;
      variantName: string;
      quantity?: number;
      orderedQuantity?: number;
      unitPrice?: number;
      unitPriceQuoted?: number;
      subtotal: number;
    }
  ): Promise<MutationResult<SaleItem>> {
    const sale = await this.repository.findById(ctx, saleId);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (sale.status !== "draft") {
      throw new ValidationError("Solo se pueden agregar items a ventas en estado borrador");
    }

    if (!data.variantId) {
      throw new ValidationError("El variantId es requerido");
    }

    const subtotal = parseFloat(normalizeAmount(data.subtotal, 2, "subtotal"));

    if (subtotal <= 0) {
      throw new ValidationError("El subtotal debe ser mayor a 0");
    }

    // Validate quantity > 0
    const quantity = data.quantity ?? data.orderedQuantity;
    if (quantity !== undefined && quantity <= 0) {
      throw new ValidationError("La cantidad debe ser mayor a 0");
    }

    // Validate subtotal matches quantity * unitPrice (for instant_sales)
    if (data.quantity !== undefined && data.unitPrice !== undefined) {
      const expectedSubtotal = data.quantity * data.unitPrice;
      if (Math.abs(expectedSubtotal - subtotal) > 0.01) {
        throw new ValidationError(
          `El subtotal no coincide. Esperado: S/ ${expectedSubtotal.toFixed(2)}, Recibido: S/ ${subtotal.toFixed(2)}`
        );
      }
    }

    // Validate subtotal matches orderedQuantity * unitPriceQuoted (for pre_orders)
    if (data.orderedQuantity !== undefined && data.unitPriceQuoted !== undefined) {
      const expectedSubtotal = data.orderedQuantity * data.unitPriceQuoted;
      if (Math.abs(expectedSubtotal - subtotal) > 0.01) {
        throw new ValidationError(
          `El subtotal no coincide. Esperado: S/ ${expectedSubtotal.toFixed(2)}, Recibido: S/ ${subtotal.toFixed(2)}`
        );
      }
    }

    return db.transaction(async (tx) => {
      const existingItemsInSale = await this.repository.findSaleItems(ctx, saleId, tx);
      const existingItem = existingItemsInSale.find(
        (item) => item.productId === data.productId && item.variantId === data.variantId
      );

      if (existingItem) {
        throw new ValidationError("El producto ya está en la venta. Edita la cantidad desde el carrito.");
      }

      const item = await this.repository.addItem(
        ctx,
        saleId,
        {
          productId: data.productId,
          productName: data.productName,
          variantId: data.variantId,
          variantName: data.variantName,
          quantity: data.quantity?.toString(),
          orderedQuantity: data.orderedQuantity?.toString(),
          unitPrice: data.unitPrice?.toString(),
          unitPriceQuoted: data.unitPriceQuoted?.toString(),
          subtotal: subtotal.toFixed(2),
        },
        tx
      );

      // Recalculate total
      const newItemsList = await this.repository.findSaleItems(ctx, saleId, tx);
      const newTotal = newItemsList.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);
      await this.repository.updateTotalAmount(ctx, saleId, newTotal.toFixed(2), tx);

      return {
        data: item,
        txid: await getTxid(tx),
      };
    });
  }

  async updateItem(
    ctx: RequestContext,
    saleId: string,
    itemId: string,
    data: {
      quantity?: number;
      orderedQuantity?: number;
      unitPrice?: number;
      unitPriceQuoted?: number;
      unitPriceFinal?: number;
      subtotal?: number;
      deliveredQuantity?: number;
      isModified?: boolean;
    }
  ): Promise<MutationResult<SaleItem>> {
    const sale = await this.repository.findById(ctx, saleId);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    const item = await this.repository.findItemById(ctx, saleId, itemId);
    if (!item) {
      throw new NotFoundError("Sale item");
    }

    // Allow updates to pre_orders in confirmed status (for versioning)
    if (sale.status !== "draft" && sale.status !== "confirmed") {
      throw new ValidationError("No se pueden modificar items de esta venta");
    }

    // Validate quantity >= 0
    if (data.quantity !== undefined && data.quantity < 0) {
      throw new ValidationError("La cantidad no puede ser negativa");
    }
    if (data.orderedQuantity !== undefined && data.orderedQuantity < 0) {
      throw new ValidationError("La cantidad no puede ser negativa");
    }

    // Validate unitPrice >= 0
    if (data.unitPrice !== undefined && data.unitPrice < 0) {
      throw new ValidationError("El precio no puede ser negativo");
    }
    if (data.unitPriceQuoted !== undefined && data.unitPriceQuoted < 0) {
      throw new ValidationError("El precio no puede ser negativo");
    }

    // Validate subtotal >= 0 if provided
    if (data.subtotal !== undefined && data.subtotal < 0) {
      throw new ValidationError("El subtotal no puede ser negativo");
    }

    // Validate subtotal matches quantity * unitPrice if both are provided
    if (data.quantity !== undefined && data.unitPrice !== undefined && data.subtotal !== undefined) {
      const expectedSubtotal = data.quantity * data.unitPrice;
      if (Math.abs(expectedSubtotal - data.subtotal) > 0.01) {
        throw new ValidationError(
          `El subtotal no coincide. Esperado: S/ ${expectedSubtotal.toFixed(2)}, Recibido: S/ ${data.subtotal.toFixed(2)}`
        );
      }
    }

    // Validate subtotal matches orderedQuantity * unitPriceQuoted for pre_orders
    if (data.orderedQuantity !== undefined && data.unitPriceQuoted !== undefined && data.subtotal !== undefined) {
      const expectedSubtotal = data.orderedQuantity * data.unitPriceQuoted;
      if (Math.abs(expectedSubtotal - data.subtotal) > 0.01) {
        throw new ValidationError(
          `El subtotal no coincide. Esperado: S/ ${expectedSubtotal.toFixed(2)}, Recibido: S/ ${data.subtotal.toFixed(2)}`
        );
      }
    }

    return db.transaction(async (tx) => {
      const updatedItem = await this.repository.updateItem(
        ctx,
        saleId,
        itemId,
        {
          quantity: data.quantity?.toString(),
          orderedQuantity: data.orderedQuantity?.toString(),
          unitPrice: data.unitPrice?.toString(),
          unitPriceQuoted: data.unitPriceQuoted?.toString(),
          unitPriceFinal: data.unitPriceFinal?.toString(),
          subtotal: data.subtotal?.toFixed(2),
          deliveredQuantity: data.deliveredQuantity?.toString(),
          isModified: data.isModified,
        },
        tx
      );

      // Recalculate total if subtotal changed
      if (data.subtotal !== undefined) {
        const existingItems = await this.repository.findSaleItems(ctx, saleId, tx);
        const newTotal = existingItems.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);
        await this.repository.updateTotalAmount(ctx, saleId, newTotal.toFixed(2), tx);
      }

      return {
        data: updatedItem,
        txid: await getTxid(tx),
      };
    });
  }

  async removeItem(
    ctx: RequestContext,
    saleId: string,
    itemId: string
  ): Promise<MutationResult<void>> {
    const sale = await this.repository.findById(ctx, saleId);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (sale.status !== "draft") {
      throw new ValidationError("Solo se pueden eliminar items de ventas en estado borrador");
    }

    const item = await this.repository.findItemById(ctx, saleId, itemId);
    if (!item) {
      throw new NotFoundError("Sale item");
    }

    return db.transaction(async (tx) => {
      await this.repository.deleteItem(ctx, saleId, itemId, tx);

      // Verify at least one item remains
      const existingItems = await this.repository.findSaleItems(ctx, saleId, tx);
      if (existingItems.length === 0) {
        throw new ValidationError("La venta debe tener al menos un producto");
      }

      // Recalculate total
      const newTotal = existingItems.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);
      await this.repository.updateTotalAmount(ctx, saleId, newTotal.toFixed(2), tx);

      return {
        data: undefined,
        txid: await getTxid(tx),
      };
    });
  }

}
