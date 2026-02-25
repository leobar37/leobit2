import { db } from "../../lib/db";
import type { RequestContext } from "../../context/request-context";
import { ConflictError, NotFoundError, ValidationError } from "../../errors";
import {
  normalizeAmount,
  normalizeQuantity,
} from "../../lib/number-utils";
import type {
  CreateOrderInput,
  OrderRepository,
  OrderStatus,
  UpdateOrderInput,
} from "../repository/order.repository";
import type { OrderEventsRepository } from "../repository/order-events.repository";
import type { SaleService } from "./sale.service";

import type { RequestContext } from "../../context/request-context";
import { ConflictError, NotFoundError, ValidationError } from "../../errors";
import type {
  CreateOrderInput,
  OrderRepository,
  OrderStatus,
  UpdateOrderInput,
} from "../repository/order.repository";
import type { OrderEventsRepository } from "../repository/order-events.repository";
import type { SaleService } from "./sale.service";

export class OrderService {
  constructor(
    private repository: OrderRepository,
    private eventsRepository: OrderEventsRepository,
    private saleService: SaleService
  ) {}

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
      clientId: string;
      deliveryDate: string;
      paymentIntent: "contado" | "credito";
      totalAmount: number;
      items: Array<{
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
    this.validateItems(data.items);

    const orderDate = new Date().toISOString().slice(0, 10);
    const payload: CreateOrderInput = {
      clientId: data.clientId,
      deliveryDate: data.deliveryDate,
      orderDate,
      status: "draft",
      paymentIntent: data.paymentIntent,
      totalAmount: normalizeAmount(data.totalAmount, 2, "totalAmount"),
      version: 1,
      items: data.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        orderedQuantity: normalizeQuantity(item.orderedQuantity, "orderedQuantity"),
        unitPriceQuoted: normalizeAmount(item.unitPriceQuoted, 2, "unitPriceQuoted"),
      })),
      version: 1,
      items: data.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        orderedQuantity: this.normalizeQuantity(item.orderedQuantity).toString(),
        unitPriceQuoted: this.normalizeAmount(item.unitPriceQuoted).toFixed(2),
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

      return created;
    });
  }

  async updateOrder(
    ctx: RequestContext,
    id: string,
    data: {
      baseVersion: number;
      deliveryDate?: string;
      paymentIntent?: "contado" | "credito";
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
  ) {
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

      return updated;
    });
  }

  async confirmOrder(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    clientEventId?: string
  ) {
    const order = await this.repository.findById(ctx, id);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "draft") {
      throw new ValidationError("Solo pedidos en borrador pueden confirmarse");
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

      return confirmed;
    });
  }

  async cancelOrder(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    clientEventId?: string
  ) {
    const order = await this.repository.findById(ctx, id);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status === "delivered") {
      throw new ValidationError("No se puede cancelar un pedido entregado");
    }

    if (order.status === "cancelled") {
      return order;
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

      return cancelled;
    });
  }

  async modifyOrderItem(
    ctx: RequestContext,
    orderId: string,
    itemId: string,
    newQuantity: number,
    baseVersion: number,
    clientEventId?: string
  ) {
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
            newQuantity: normalizedQuantity,
          },
          clientEventId,
        },
        tx
      );

      return {
        order: updatedOrder,
        item,
      };
    });
  }

  async convertToSale(
    ctx: RequestContext,
    orderId: string,
    deliveredItems: Array<{ itemId: string; deliveredQuantity: number; unitPriceFinal?: number }>,
    baseVersion: number,
    clientEventId?: string
  ) {
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
            ...(delivered.unitPriceFinal !== undefined && {
              unitPriceFinal: this.normalizeAmount(delivered.unitPriceFinal).toFixed(2),
            }),
          },
          tx
        );
      }

      const refreshedOrder = await this.repository.findById(ctx, orderId);
      if (!refreshedOrder) {
        throw new NotFoundError("Order");
      }

      const sale = await this.saleService.createFromOrder(
        ctx,
        {
          orderId: refreshedOrder.id,
          clientId: refreshedOrder.clientId,
          saleType: refreshedOrder.paymentIntent,
          totalAmount: refreshedOrder.totalAmount,
          amountPaid:
            refreshedOrder.paymentIntent === "contado"
              ? refreshedOrder.totalAmount
              : "0.00",
          balanceDue:
            refreshedOrder.paymentIntent === "credito"
              ? refreshedOrder.totalAmount
              : "0.00",
          items: refreshedOrder.items.map((item) => {
            const qty = item.deliveredQuantity ?? item.orderedQuantity;
            const unitPrice = item.unitPriceFinal ?? item.unitPriceQuoted;
            const subtotal = (Number(qty) * Number(unitPrice)).toFixed(2);

            return {
              productId: item.productId,
              productName: item.productName,
              variantId: item.variantId,
              variantName: item.variantName,
              quantity: qty,
              unitPrice,
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
        order: delivered,
        sale,
      };
    });
  }

  private validateDeliveryDate(deliveryDate: string) {
    const parsed = new Date(`${deliveryDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError("Fecha de entrega inválida");
    }

    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

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
}
