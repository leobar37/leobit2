import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import type { RequestContext } from "../../context/request-context";
import { NotFoundError, ValidationError, ConflictError } from "../../errors";
import {
  normalizeAmount,
  normalizeQuantity,
  calculateTotal,
} from "../../lib/number-utils";
import type { OrderRepository } from "../repository/order.repository";
import type { OrderEventsRepository } from "../repository/order-events.repository";
import type { Order, OrderItem } from "../../db/schema";

type DraftMutationPayload = { item: OrderItem; order: Order };

export interface CreateDraftInput {
  clientId?: string | null;
  deliveryDate: string;
  paymentIntent?: "contado" | "credito";
}

export interface AddItemInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  orderedQuantity: number;
  unitPriceQuoted: number;
  baseVersion: number;
  clientEventId?: string;
}

export interface UpdateItemInput {
  orderedQuantity?: number;
  unitPriceQuoted?: number;
  baseVersion: number;
  clientEventId?: string;
}

export class OrderDraftService {
  constructor(
    private repository: OrderRepository,
    private eventsRepository: OrderEventsRepository
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

  async createDraft(
    ctx: RequestContext,
    data: CreateDraftInput,
    clientEventId?: string
  ): Promise<MutationResult<Order>> {
    this.validateDeliveryDate(data.deliveryDate);

    const orderDate = new Date().toISOString().slice(0, 10);
    const paymentIntent = data.paymentIntent ?? "contado";

    const payload = {
      clientId: this.normalizeClientId(data.clientId),
      deliveryDate: data.deliveryDate,
      orderDate,
      status: "draft" as const,
      paymentIntent,
      paymentStatus: "sin_pago" as const,
      advanceAmount: "0.00",
      balanceDue: "0.00",
      totalAmount: "0.00",
      version: 1,
      items: [],
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
            isDraft: true,
          },
          clientEventId,
        },
        tx
      );

      return {
        data: created,
        txid: await getTxid(tx),
      };
    });
  }

  async addItem(
    ctx: RequestContext,
    orderId: string,
    data: AddItemInput
  ): Promise<MutationResult<DraftMutationPayload>> {
    const order = await this.repository.findById(ctx, orderId);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "draft") {
      throw new ValidationError("Solo se pueden agregar items a pedidos en borrador");
    }

    this.validateItem(data);

    const normalizedQuantity = normalizeQuantity(data.orderedQuantity, "orderedQuantity");
    const normalizedPrice = normalizeAmount(data.unitPriceQuoted, 2, "unitPriceQuoted");
    const itemTotal = calculateTotal(data.orderedQuantity, data.unitPriceQuoted);

    return db.transaction(async (tx) => {
      // Add the item
      const [item] = await tx
        .insert(require("../../db/schema").orderItems)
        .values({
          orderId,
          productId: data.productId,
          variantId: data.variantId,
          productName: data.productName,
          variantName: data.variantName,
          orderedQuantity: normalizedQuantity,
          unitPriceQuoted: normalizedPrice,
        })
        .returning();

      // Recalculate order total
      const updatedItems = [...order.items, item];
      const newTotal = updatedItems.reduce(
        (sum, i) => sum + Number(i.orderedQuantity) * Number(i.unitPriceQuoted),
        0
      );

      // Update order with new total and version
      const updated = await this.repository.updateVersion(
        ctx,
        orderId,
        data.baseVersion,
        {
          totalAmount: normalizeAmount(newTotal, 2, "totalAmount"),
        },
        tx
      );

      if (!updated) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId,
          eventType: "item_added",
          payload: {
            itemId: item.id,
            productName: data.productName,
            variantName: data.variantName,
            orderedQuantity: normalizedQuantity,
            unitPriceQuoted: normalizedPrice,
          },
          clientEventId: data.clientEventId,
        },
        tx
      );

      return {
        data: {
          item,
          order: updated,
        },
        txid: await getTxid(tx),
      };
    });
  }

  async removeItem(
    ctx: RequestContext,
    orderId: string,
    itemId: string,
    baseVersion: number,
    clientEventId?: string
  ): Promise<MutationResult<Order>> {
    const order = await this.repository.findById(ctx, orderId);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "draft") {
      throw new ValidationError("Solo se pueden eliminar items de pedidos en borrador");
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError("OrderItem");
    }

    return db.transaction(async (tx) => {
      await tx
        .delete(require("../../db/schema").orderItems)
        .where(
          require("drizzle-orm").and(
            require("drizzle-orm").eq(require("../../db/schema").orderItems.id, itemId),
            require("drizzle-orm").eq(require("../../db/schema").orderItems.orderId, orderId)
          )
        );

      // Recalculate order total
      const remainingItems = order.items.filter((i) => i.id !== itemId);
      const newTotal = remainingItems.reduce(
        (sum, i) => sum + Number(i.orderedQuantity) * Number(i.unitPriceQuoted),
        0
      );

      const updated = await this.repository.updateVersion(
        ctx,
        orderId,
        baseVersion,
        {
          totalAmount: normalizeAmount(newTotal, 2, "totalAmount"),
        },
        tx
      );

      if (!updated) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId,
          eventType: "item_removed",
          payload: {
            itemId,
            productName: item.productName,
            variantName: item.variantName,
          },
          clientEventId,
        },
        tx
      );

      return {
        data: updated,
        txid: await getTxid(tx),
      };
    });
  }

  async updateItem(
    ctx: RequestContext,
    orderId: string,
    itemId: string,
    data: UpdateItemInput
  ): Promise<MutationResult<DraftMutationPayload>> {
    const order = await this.repository.findById(ctx, orderId);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "draft") {
      throw new ValidationError("Solo se pueden editar items de pedidos en borrador");
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError("OrderItem");
    }

    const updateData: Partial<OrderItem> = {};

    if (data.orderedQuantity !== undefined) {
      if (data.orderedQuantity <= 0) {
        throw new ValidationError("La cantidad debe ser mayor a 0");
      }
      updateData.orderedQuantity = normalizeQuantity(data.orderedQuantity, "orderedQuantity");
    }

    if (data.unitPriceQuoted !== undefined) {
      if (data.unitPriceQuoted < 0) {
        throw new ValidationError("El precio no puede ser negativo");
      }
      updateData.unitPriceQuoted = normalizeAmount(data.unitPriceQuoted, 2, "unitPriceQuoted");
    }

    return db.transaction(async (tx) => {
      const [updatedItem] = await tx
        .update(require("../../db/schema").orderItems)
        .set(updateData)
        .where(
          require("drizzle-orm").and(
            require("drizzle-orm").eq(require("../../db/schema").orderItems.id, itemId),
            require("drizzle-orm").eq(require("../../db/schema").orderItems.orderId, orderId)
          )
        )
        .returning();

      if (!updatedItem) {
        throw new NotFoundError("OrderItem");
      }

      // Recalculate order total
      const updatedItems = order.items.map((i) =>
        i.id === itemId ? { ...i, ...updateData } : i
      );
      const newTotal = updatedItems.reduce(
        (sum, i) => sum + Number(i.orderedQuantity) * Number(i.unitPriceQuoted),
        0
      );

      const updated = await this.repository.updateVersion(
        ctx,
        orderId,
        data.baseVersion,
        {
          totalAmount: normalizeAmount(newTotal, 2, "totalAmount"),
        },
        tx
      );

      if (!updated) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId,
          eventType: "item_updated",
          payload: {
            itemId,
            changes: updateData,
          },
          clientEventId: data.clientEventId,
        },
        tx
      );

      const payload: DraftMutationPayload = {
        item: updatedItem as OrderItem,
        order: updated,
      };

      return {
        data: {
          item: payload.item,
          order: payload.order,
        },
        txid: await getTxid(tx),
      };
    });
  }

  async updateDraftDetails(
    ctx: RequestContext,
    orderId: string,
    data: {
      clientId?: string;
      deliveryDate?: string;
      paymentIntent?: "contado" | "credito";
      baseVersion: number;
      clientEventId?: string;
    }
  ): Promise<MutationResult<Order>> {
    const order = await this.repository.findById(ctx, orderId);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "draft") {
      throw new ValidationError("Solo se pueden editar pedidos en borrador");
    }

    if (data.deliveryDate) {
      this.validateDeliveryDate(data.deliveryDate);
    }

    const updatePayload: Parameters<OrderRepository["updateVersion"]>[3] = {};

    if (data.clientId !== undefined) {
      updatePayload.clientId = data.clientId;
    }
    if (data.deliveryDate !== undefined) {
      updatePayload.deliveryDate = data.deliveryDate;
    }
    if (data.paymentIntent !== undefined) {
      updatePayload.paymentIntent = data.paymentIntent;
    }

    return db.transaction(async (tx) => {
      const updated = await this.repository.updateVersion(
        ctx,
        orderId,
        data.baseVersion,
        updatePayload,
        tx
      );

      if (!updated) {
        throw new ConflictError("El pedido fue modificado por otro usuario");
      }

      await this.eventsRepository.create(
        ctx,
        {
          orderId,
          eventType: "updated",
          payload: {
            changes: Object.keys(updatePayload),
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

  async getUserDrafts(ctx: RequestContext) {
    return this.repository.findMany(ctx, {
      status: "draft",
      limit: 50,
    });
  }

  private validateDeliveryDate(deliveryDate: string) {
    const [year, month, day] = deliveryDate.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);

    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError("Fecha de entrega invalida");
    }

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (parsed.getTime() < tomorrow.getTime()) {
      throw new ValidationError("La fecha de entrega debe ser desde manana");
    }
  }

  private validateItem(data: AddItemInput) {
    if (!data.variantId) {
      throw new ValidationError("El item debe incluir variante");
    }

    if (!Number.isFinite(data.orderedQuantity) || data.orderedQuantity <= 0) {
      throw new ValidationError("Cantidad invalida");
    }

    if (!Number.isFinite(data.unitPriceQuoted) || data.unitPriceQuoted < 0) {
      throw new ValidationError("Precio invalido");
    }
  }
}
