import { eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import type { RequestContext } from "../../context/request-context";
import { ConflictError, NotFoundError, ValidationError } from "../../errors";
import type { Order, OrderItem, Sale } from "../../db/schema";
import {
  normalizeAmount,
  normalizeQuantity,
  calculateTotal,
} from "../../lib/number-utils";
import type {
  CreateOrderInput,
  OrderRepository,
  OrderStatus,
  UpdateOrderInput,
} from "../repository/order.repository";
import type { OrderEventsRepository } from "../repository/order-events.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { SaleService } from "./sale.service";

export class OrderService {
  constructor(
    private repository: OrderRepository,
    private eventsRepository: OrderEventsRepository,
    private saleService: SaleService,
    private distribucionRepository: DistribucionRepository,
    private distribucionItemRepository: DistribucionItemRepository
  ) {}

  /**
   * Normalize clientId to null if empty or undefined.
   * Returns the UUID string if valid, null otherwise.
   */
  private normalizeClientId(clientId: string | undefined | null): string | null {
    if (!clientId || clientId.trim() === '') {
      return null;
    }
    return clientId;
  }

  async getOrders(
    ctx: RequestContext,
    filters?: {
      deliveryDateFrom?: string;
      deliveryDateTo?: string;
      status?: OrderStatus;
      limit?: number;
      offset?: number;
    }
  ) {
    return this.repository.findMany(ctx, filters);
  }

  async getOrder(ctx: RequestContext, id: string) {
    const order = await this.repository.findById(ctx, id);
    if (!order) {
      throw new NotFoundError("Order");
    }

    return order;
  }

  async getOrderEvents(ctx: RequestContext, orderId: string) {
    const order = await this.repository.findById(ctx, orderId);
    if (!order) {
      throw new NotFoundError("Order");
    }

    return this.eventsRepository.findByOrderId(ctx, orderId);
  }

  async createOrder(
    ctx: RequestContext,
    data: {
      id?: string;
      clientId?: string | null;
      deliveryDate: string;
      paymentIntent: "contado" | "credito";
      paymentStatus?: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
      advanceAmount?: number;
      balanceDue?: number;
      advancePaymentMethod?: "efectivo" | "yape" | "plin" | "transferencia";
      advanceReferenceNumber?: string;
      advanceProofImageId?: string;
      totalAmount: number;
      items?: Array<{
        productId: string;
        variantId: string;
        productName: string;
        variantName: string;
        orderedQuantity: number;
        unitPriceQuoted: number;
      }>;
      clientEventId?: string;
    }
  ) {
    this.validateDeliveryDate(data.deliveryDate);

    // Validate clientId only if provided
    if (data.clientId && data.clientId.trim() !== "") {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(data.clientId)) {
        throw new ValidationError("ID de cliente inválido");
      }
    }

    const items = data.items ?? [];
    if (items.length > 0) {
      this.validateItems(items);
    }

    const totalAmount = normalizeAmount(data.totalAmount, 2, "totalAmount");
    const advanceAmount = data.advanceAmount 
      ? normalizeAmount(data.advanceAmount, 2, "advanceAmount") 
      : "0.00";
    const balanceDue = data.balanceDue !== undefined 
      ? normalizeAmount(data.balanceDue, 2, "balanceDue")
      : (data.paymentIntent === "contado" && !data.advanceAmount) 
        ? "0.00" 
        : normalizeAmount(data.totalAmount - (data.advanceAmount || 0), 2, "balanceDue");
    
    const paymentStatus = data.paymentStatus || this.calculatePaymentStatus(
      data.paymentIntent, 
      Number(advanceAmount), 
      Number(totalAmount)
    );

    const orderDate = new Date().toISOString().slice(0, 10);
    const payload: CreateOrderInput = {
      id: data.id,
      clientId: this.normalizeClientId(data.clientId),
      deliveryDate: data.deliveryDate,
      orderDate,
      status: "draft",
      paymentIntent: data.paymentIntent,
      paymentStatus,
      advanceAmount,
      balanceDue,
      advancePaymentMethod: data.advancePaymentMethod || null,
      advanceReferenceNumber: data.advanceReferenceNumber || null,
      advanceProofImageId: data.advanceProofImageId || null,
      totalAmount,
      version: 1,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        orderedQuantity: normalizeQuantity(item.orderedQuantity, "orderedQuantity"),
        unitPriceQuoted: normalizeAmount(item.unitPriceQuoted, 2, "unitPriceQuoted"),
      })),
    };

    return db.transaction(async (tx) => {
      const created = await this.repository.create(ctx, payload, tx);
      await this.eventsRepository.create(
        ctx,
        {
          orderId: created.id,
          eventType: "created",
          payload: {
            status: created.status,
            deliveryDate: created.deliveryDate,
          },
          clientEventId: data.clientEventId,
        },
        tx
      );

      return {
        data: created,
        txid: await getTxid(tx),
      };
    });
  }

  async updateOrder(
    ctx: RequestContext,
    id: string,
    data: {
      baseVersion: number;
      deliveryDate?: string;
      paymentIntent?: "contado" | "credito";
      paymentStatus?: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
      advanceAmount?: number;
      balanceDue?: number;
      advancePaymentMethod?: "efectivo" | "yape" | "plin" | "transferencia";
      advanceReferenceNumber?: string;
      advanceProofImageId?: string;
      totalAmount?: number;
      items?: Array<{
        productId: string;
        variantId: string;
        productName: string;
        variantName: string;
        orderedQuantity: number;
        unitPriceQuoted: number;
      }>;
      clientEventId?: string;
    }
  ): Promise<MutationResult<Order>> {
    const order = await this.repository.findById(ctx, id);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "draft" && order.status !== "confirmed") {
      throw new ValidationError("Solo se pueden editar pedidos en borrador o confirmados");
    }

    if (data.deliveryDate) {
      this.validateDeliveryDate(data.deliveryDate);
    }

    if (data.items) {
      this.validateItems(data.items);
    }

    return db.transaction(async (tx) => {
      const updatePayload: UpdateOrderInput = {
        ...(data.deliveryDate !== undefined && { deliveryDate: data.deliveryDate }),
        ...(data.paymentIntent !== undefined && { paymentIntent: data.paymentIntent }),
        ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
        ...(data.advanceAmount !== undefined && {
          advanceAmount: normalizeAmount(data.advanceAmount, 2, "advanceAmount"),
        }),
        ...(data.balanceDue !== undefined && {
          balanceDue: normalizeAmount(data.balanceDue, 2, "balanceDue"),
        }),
        ...(data.advancePaymentMethod !== undefined && { advancePaymentMethod: data.advancePaymentMethod }),
        ...(data.advanceReferenceNumber !== undefined && { advanceReferenceNumber: data.advanceReferenceNumber }),
        ...(data.advanceProofImageId !== undefined && { advanceProofImageId: data.advanceProofImageId }),
        ...(data.totalAmount !== undefined && {
          totalAmount: normalizeAmount(data.totalAmount, 2, "totalAmount"),
        }),
      };

      const updated = await this.repository.updateVersion(
        ctx,
        id,
        data.baseVersion,
        updatePayload,
        tx
      );
      if (!updated) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      if (data.items) {
        await this.repository.replaceItems(
          ctx,
          id,
          data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            orderedQuantity: normalizeQuantity(item.orderedQuantity, "orderedQuantity"),
            unitPriceQuoted: normalizeAmount(item.unitPriceQuoted, 2, "unitPriceQuoted"),
          })),
          tx
        );
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId: id,
          eventType: "updated",
          payload: {
            deliveryDate: updated.deliveryDate,
            paymentIntent: updated.paymentIntent,
            hasItemsUpdate: Boolean(data.items),
          },
          clientEventId: data.clientEventId,
        },
        tx
      );

      return {
        data: updated,
        txid: await getTxid(tx),
      };
    });
  }

  async confirmOrder(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    clientEventId?: string
  ): Promise<MutationResult<Order>> {
    const order = await this.repository.findById(ctx, id);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "draft") {
      throw new ValidationError("Solo pedidos en borrador pueden confirmarse");
    }

    if (order.items.length === 0) {
      throw new ValidationError("No se puede confirmar un pedido sin productos");
    }

    return db.transaction(async (tx) => {
      const confirmed = await this.repository.updateVersion(
        ctx,
        id,
        baseVersion,
        {
          status: "confirmed",
          confirmedSnapshot: this.buildSnapshot(order),
        },
        tx
      );

      if (!confirmed) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId: id,
          eventType: "confirmed",
          payload: { status: confirmed.status },
          clientEventId,
        },
        tx
      );

      return {
        data: confirmed,
        txid: await getTxid(tx),
      };
    });
  }

  async cancelOrder(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    clientEventId?: string
  ): Promise<MutationResult<Order>> {
    const order = await this.repository.findById(ctx, id);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status === "delivered") {
      throw new ValidationError("No se puede cancelar un pedido entregado");
    }

    if (order.status === "cancelled") {
      throw new ValidationError("El pedido ya fue cancelado");
    }

    return db.transaction(async (tx) => {
      const cancelled = await this.repository.updateVersion(
        ctx,
        id,
        baseVersion,
        { status: "cancelled" },
        tx
      );
      if (!cancelled) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId: id,
          eventType: "cancelled",
          payload: { status: cancelled.status },
          clientEventId,
        },
        tx
      );

      return {
        data: cancelled,
        txid: await getTxid(tx),
      };
    });
  }

  async deleteOrder(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    clientEventId?: string
  ): Promise<MutationResult<Order>> {
    const order = await this.repository.findById(ctx, id);
    if (!order) {
      throw new NotFoundError("Order");
    }

    // Only allow deletion of draft orders or orders without items
    if (order.status !== "draft" && order.items.length > 0) {
      throw new ValidationError("Solo se pueden eliminar pedidos en borrador o sin items");
    }

    return db.transaction(async (tx) => {
      // Delete order items first (cascade should handle this, but being explicit)
      for (const item of order.items) {
        await tx.delete(require("../../db/schema").orderItems).where(
          eq(require("../../db/schema").orderItems.id, item.id)
        );
      }

      const deleted = await this.repository.delete(ctx, id, tx);
      if (!deleted) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId: id,
          eventType: "deleted",
          payload: { status: deleted.status },
          clientEventId,
        },
        tx
      );

      return {
        data: deleted,
        txid: await getTxid(tx),
      };
    });
  }

  async modifyOrderItem(
    ctx: RequestContext,
    orderId: string,
    itemId: string,
    newQuantity: number,
    baseVersion: number,
    clientEventId?: string
  ): Promise<MutationResult<{ order: Order; item: OrderItem }>> {
    const order = await this.repository.findById(ctx, orderId);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "draft" && order.status !== "confirmed") {
      throw new ValidationError("No se puede modificar items en este estado");
    }

    const currentItem = await this.repository.findItemById(ctx, orderId, itemId);
    if (!currentItem) {
      throw new NotFoundError("OrderItem");
    }

    const normalizedQuantityValue = normalizeQuantity(newQuantity, "newQuantity");

    return db.transaction(async (tx) => {
      const item = await this.repository.updateItem(
        ctx,
        orderId,
        itemId,
        {
          orderedQuantity: normalizedQuantityValue,
          isModified: true,
          originalQuantity: currentItem.originalQuantity ?? currentItem.orderedQuantity,
        },
        tx
      );

      if (!item) {
        throw new NotFoundError("OrderItem");
      }

      const updatedOrder = await this.repository.updateVersion(
        ctx,
        orderId,
        baseVersion,
        {},
        tx
      );
      if (!updatedOrder) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId,
          eventType: "item_updated",
          payload: {
            itemId,
            newQuantity: normalizedQuantityValue,
          },
          clientEventId,
        },
        tx
      );

      return {
        data: {
          order: updatedOrder,
          item,
        },
        txid: await getTxid(tx),
      };
    });
  }

  async convertToSale(
    ctx: RequestContext,
    orderId: string,
    deliveredItems: Array<{ itemId: string; deliveredQuantity: number; unitPriceFinal?: number }>,
    baseVersion: number,
    clientEventId?: string,
    additionalPaymentAmount?: number,
    paymentMethod?: "efectivo" | "yape" | "plin" | "transferencia",
    referenceNumber?: string,
    proofImageId?: string
  ): Promise<MutationResult<{ order: Order; sale: Sale }>> {
    const order = await this.repository.findById(ctx, orderId);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "confirmed") {
      throw new ValidationError("Solo pedidos confirmados pueden convertirse a venta");
    }

    const today = new Date().toISOString().slice(0, 10);
    if (order.deliveryDate !== today) {
      throw new ValidationError("Solo se puede entregar en la fecha de entrega");
    }

    return db.transaction(async (tx) => {
      for (const delivered of deliveredItems) {
        const item = await this.repository.findItemById(ctx, orderId, delivered.itemId);
        if (!item) {
          throw new NotFoundError("OrderItem");
        }

        await this.repository.updateItem(
          ctx,
          orderId,
          delivered.itemId,
          {
            deliveredQuantity: normalizeQuantity(delivered.deliveredQuantity, "deliveredQuantity"),
            ...(delivered.unitPriceFinal !== undefined && {
              unitPriceFinal: normalizeAmount(delivered.unitPriceFinal, 2, "unitPriceFinal"),
            }),
          },
          tx
        );
      }

      const refreshedOrder = await this.repository.findById(ctx, orderId);
      if (!refreshedOrder) {
        throw new NotFoundError("Order");
      }

      // Validate stock if there's an active distribution in strict mode
      await this.validateStockForDelivery(ctx, refreshedOrder.items);

      // Calculate sale total based on delivered quantities and final prices
      const calculatedTotal = refreshedOrder.items.reduce((sum, item) => {
        const qty = Number(item.deliveredQuantity ?? item.orderedQuantity);
        const price = Number(item.unitPriceFinal ?? item.unitPriceQuoted);
        return sum + (qty * price);
      }, 0);

      const saleTotalAmount = normalizeAmount(calculatedTotal, 2, "saleTotalAmount");
      const existingAdvance = Number(refreshedOrder.advanceAmount || "0");
      const additionalPayment = additionalPaymentAmount || 0;
      const totalPaid = existingAdvance + additionalPayment;
      
      const saleAmountPaid = normalizeAmount(totalPaid, 2, "saleAmountPaid");
      const saleBalanceDue = normalizeAmount(Math.max(calculatedTotal - totalPaid, 0), 2, "saleBalanceDue");

      const sale = await this.saleService.createFromOrder(
        ctx,
        {
          orderId: refreshedOrder.id,
          clientId: refreshedOrder.clientId,
          saleType: refreshedOrder.paymentIntent,
          totalAmount: saleTotalAmount,
          amountPaid: saleAmountPaid,
          balanceDue: saleBalanceDue,
          items: refreshedOrder.items.map((item) => {
            const qty = item.deliveredQuantity ?? item.orderedQuantity;
            const unitPrice = item.unitPriceFinal ?? item.unitPriceQuoted;
            const subtotal = calculateTotal(Number(qty), Number(unitPrice));

            return {
              productId: item.productId,
              productName: item.productName,
              variantId: item.variantId,
              variantName: item.variantName,
              quantity: normalizeQuantity(Number(qty), "quantity"),
              unitPrice: normalizeAmount(Number(unitPrice), 2, "unitPrice"),
              subtotal,
            };
          }),
        },
        tx
      );

      const delivered = await this.repository.updateVersion(
        ctx,
        orderId,
        baseVersion,
        {
          status: "delivered",
          deliveredSnapshot: this.buildSnapshot(refreshedOrder),
        },
        tx
      );
      if (!delivered) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId,
          eventType: "delivered",
          payload: {
            saleId: sale.id,
            status: delivered.status,
          },
          clientEventId,
        },
        tx
      );

      return {
        data: {
          order: delivered,
          sale,
        },
        txid: await getTxid(tx),
      };
    });
  }

  private validateDeliveryDate(deliveryDate: string) {
    const [year, month, day] = deliveryDate.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);

    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError("Fecha de entrega inválida");
    }

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (parsed.getTime() < tomorrow.getTime()) {
      throw new ValidationError("La fecha de entrega debe ser desde mañana");
    }
  }

  private validateItems(
    items: Array<{ orderedQuantity: number; unitPriceQuoted: number; variantId: string }>
  ) {
    if (items.length === 0) {
      throw new ValidationError("El pedido debe incluir al menos un item");
    }

    for (const item of items) {
      if (!item.variantId) {
        throw new ValidationError("Todos los items deben incluir variante");
      }

      if (!Number.isFinite(item.orderedQuantity) || item.orderedQuantity <= 0) {
        throw new ValidationError("Cantidad inválida");
      }

      if (!Number.isFinite(item.unitPriceQuoted) || item.unitPriceQuoted < 0) {
        throw new ValidationError("Precio inválido");
      }
    }
  }


  private buildSnapshot(order: {
    id: string;
    status: string;
    totalAmount: string;
    deliveryDate: string;
    items: Array<{
      id: string;
      productId: string;
      variantId: string;
      orderedQuantity: string;
      deliveredQuantity: string | null;
      unitPriceQuoted: string;
      unitPriceFinal: string | null;
    }>;
  }) {
    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      deliveryDate: order.deliveryDate,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        orderedQuantity: item.orderedQuantity,
        deliveredQuantity: item.deliveredQuantity,
        unitPriceQuoted: item.unitPriceQuoted,
        unitPriceFinal: item.unitPriceFinal,
      })),
    };
  }

  private async validateStockForDelivery(
    ctx: RequestContext,
    items: Array<{
      variantId: string;
      productName: string;
      variantName: string;
      deliveredQuantity: string | null;
      orderedQuantity: string;
    }>
  ): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const distribucion = await this.distribucionRepository.findByVendedorAndFecha(
      ctx,
      ctx.businessUserId,
      today
    );

    if (!distribucion || distribucion.modo !== "estricto") {
      return; // No validation needed for non-strict modes
    }

    const distribucionItems = await this.distribucionItemRepository.findByDistribucionId(
      ctx,
      distribucion.id
    );

    for (const item of items) {
      const deliveredQty = Number(item.deliveredQuantity ?? item.orderedQuantity);
      if (deliveredQty <= 0) continue;

      const distItem = distribucionItems.find(
        (di) => di.variantId === item.variantId
      );

      if (!distItem) {
        throw new ValidationError(
          `${item.variantName} no está en su distribución`
        );
      }

      const asignada = parseFloat(distItem.cantidadAsignada);
      const vendida = parseFloat(distItem.cantidadVendida);
      const disponible = asignada - vendida;

      if (deliveredQty > disponible) {
        throw new ValidationError(
          `Stock insuficiente para ${item.variantName}. Disponible: ${disponible.toFixed(3)}, Venta: ${deliveredQty}`
        );
      }
    }
  }

  private calculatePaymentStatus(
    paymentIntent: "contado" | "credito",
    advanceAmount: number,
    totalAmount: number
  ): "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente" {
    if (advanceAmount <= 0) {
      return "sin_pago";
    }
    if (advanceAmount >= totalAmount) {
      return "pagado_total";
    }
    if (paymentIntent === "credito") {
      return "adelanto_parcial";
    }
    return "saldo_pendiente";
  }
}
