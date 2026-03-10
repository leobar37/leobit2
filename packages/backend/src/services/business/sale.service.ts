import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import type { SaleRepository, CreateSaleInput, UpdateSaleInput } from "../repository/sale.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { BusinessRepository } from "../repository/business.repository";
import type { RequestContext } from "../../context/request-context";
import { ValidationError, ForbiddenError, NotFoundError, ConflictError } from "../../errors";
import type { Sale, SaleItem, SaleToken } from "../../db/schema";
import { db, saleTokens } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import { toISODateString, now } from "../../lib/date-utils";
import { normalizeAmount, normalizeQuantity } from "../../lib/number-utils";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class SaleService {
  constructor(
    private repository: SaleRepository,
    private paymentRepository: PaymentRepository,
    private distribucionRepository: DistribucionRepository,
    private distribucionItemRepository: DistribucionItemRepository,
    private businessRepository: BusinessRepository
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
      clientId?: string;
      saleType: "contado" | "credito";
      totalAmount: number;
      amountPaid?: number;
      tara?: number;
      netWeight?: number;
      items: Array<{
        productId: string;
        productName: string;
        variantId: string;
        variantName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }>;
    }
  ): Promise<MutationResult<Sale>> {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError("La venta debe tener al menos un producto");
    }

    // Validate that all items have variant
    for (const item of data.items) {
      if (!item.variantId) {
        throw new ValidationError("Todos los productos deben tener una variante seleccionada");
      }
    }

    if (data.totalAmount <= 0) {
      throw new ValidationError("El monto total debe ser mayor a 0");
    }

    // Calculate total from items - this is the authoritative value
    const calculatedTotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
    const submittedTotal = data.totalAmount;

    // Validate that submitted total matches calculated total
    if (Math.abs(calculatedTotal - submittedTotal) > 0.01) {
      throw new ValidationError(
        `El total no coincide con la suma de productos. Calculado: S/ ${calculatedTotal.toFixed(2)}, Enviado: S/ ${submittedTotal.toFixed(2)}`
      );
    }

    // Use calculated total (not submitted) - ensures data integrity
    const totalAmount = parseFloat(normalizeAmount(calculatedTotal, 2, "totalAmount"));
    const amountPaidInput =
      data.amountPaid ?? (data.saleType === "contado" ? totalAmount : 0);
    const amountPaid = parseFloat(normalizeAmount(amountPaidInput, 2, "amountPaid"));

    const balanceDue = data.saleType === "credito" ? Math.max(totalAmount - amountPaid, 0) : 0;

    if (data.saleType === "credito" && !data.clientId) {
      throw new ValidationError("La venta a crédito requiere cliente");
    }

    if (data.saleType === "contado" && Math.abs(amountPaid - totalAmount) > 0.01) {
      throw new ValidationError("En venta al contado, el monto pagado debe ser igual al total");
    }

    if (data.saleType === "credito" && amountPaid > totalAmount) {
      throw new ValidationError("El monto pagado no puede ser mayor al total");
    }

    const today = toISODateString(now());
    const distribucion = await this.distribucionRepository.findByVendedorAndFecha(
      ctx,
      ctx.businessUserId,
      today
    );

    if (distribucion) {
      if (distribucion.modo === "estricto") {
        await this.validarStockEstricto(ctx, distribucion.id, data.items);
      }
    } else {
      const business = await this.businessRepository.findById(ctx, ctx.businessId);
      if (!ctx.isAdmin() && business?.modoDistribucion !== "libre") {
        throw new ValidationError("No tiene distribución asignada para hoy");
      }
    }

    const salePayload: CreateSaleInput = {
      clientId: data.clientId,
      saleType: data.saleType,
      totalAmount: totalAmount.toFixed(2),
      amountPaid: amountPaid.toFixed(2),
      balanceDue: balanceDue.toFixed(2),
      tara: data.tara?.toString(),
      netWeight: data.netWeight?.toString(),
      items: data.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        subtotal: item.subtotal.toString(),
      })),
    };

    return db.transaction(async (tx) => {
      const sale = await this.repository.create(ctx, salePayload, tx);

      if (distribucion && distribucion.modo !== "libre") {
        const distribucionItems = await this.distribucionItemRepository.findByDistribucionId(
          ctx,
          distribucion.id
        );

        for (const saleItem of data.items) {
          const distItem = distribucionItems.find(
            (di) => di.variantId === saleItem.variantId
          );

          if (distItem) {
            const currentVendida = parseFloat(distItem.cantidadVendida);
            const newVendida = currentVendida + saleItem.quantity;
            await this.distribucionItemRepository.updateVendido(
              ctx,
              distItem.id,
              newVendida.toString(),
              tx
            );
          }
        }
      }

      if (data.saleType === "credito" && data.clientId && amountPaid > 0) {
        const initialPaymentReference = `init-sale:${sale.id}`;
        await this.paymentRepository.createInitialPayment(
          ctx,
          {
            clientId: data.clientId,
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

  async deleteSale(ctx: RequestContext, id: string): Promise<void> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar ventas");
    }

    await this.repository.delete(ctx, id);
  }

  async confirmSale(
    ctx: RequestContext,
    id: string,
    baseVersion: number
  ): Promise<MutationResult<Sale>> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (sale.status !== "draft") {
      throw new ValidationError("Solo se pueden confirmar ventas en estado borrador");
    }

    if (sale.version !== baseVersion) {
      throw new ConflictError("La venta fue modificada por otro usuario");
    }

    const newStatus = sale.deliveryDate ? "confirmed" : "active";

    return db.transaction(async (tx) => {
      const confirmedSale = await this.repository.updateVersion(
        ctx,
        id,
        baseVersion,
        {
          status: newStatus,
          confirmedSnapshot: this.buildSnapshot(sale),
        },
        tx
      );

      if (!confirmedSale) {
        throw new ConflictError("La venta fue modificada por otro usuario");
      }

      return {
        data: confirmedSale,
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

    const amountPaid = parseFloat(sale.amountPaid);

    return db.transaction(async (tx) => {
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

        if (data.refundMethod === "saldo" && sale.clientId) {
          await this.paymentRepository.createReversal(
            ctx,
            {
              clientId: sale.clientId,
              amount: (-data.refundAmount).toFixed(2),
              paymentMethod: "saldo",
              notes: `Saldo a favor por cancelación de venta #${sale.id}`,
              relatedSaleId: sale.id,
            },
            tx
          );
        } else if (sale.clientId) {
          await this.paymentRepository.createReversal(
            ctx,
            {
              clientId: sale.clientId,
              amount: (-data.refundAmount).toFixed(2),
              paymentMethod: data.refundMethod || "efectivo",
              referenceNumber: data.refundReference,
              notes: `Reembolso por cancelación de venta #${sale.id}`,
              relatedSaleId: sale.id,
            },
            tx
          );
        }
      }

      const cancelledSale = await this.repository.update(ctx, id, updateData, tx);

      if (sale.distribucionId) {
        const saleItems = await this.repository.findSaleItems(ctx, id, tx);
        const distribucionItems = await this.distribucionItemRepository.findByDistribucionId(
          ctx,
          sale.distribucionId
        );

        for (const saleItem of saleItems) {
          const distItem = distribucionItems.find(
            (di) => di.variantId === saleItem.variantId
          );

          if (distItem) {
            const currentVendida = parseFloat(distItem.cantidadVendida);
            const newVendida = Math.max(currentVendida - parseFloat(saleItem.quantity), 0);
            await this.distribucionItemRepository.updateVendido(
              ctx,
              distItem.id,
              newVendida.toString(),
              tx
            );
          }
        }
      }

      return cancelledSale;
    });
  }

  async getTodayStats(ctx: RequestContext): Promise<{ count: number; total: string }> {
    return this.repository.getTotalSalesToday(ctx);
  }

  async createFromOrder(
    ctx: RequestContext,
    data: {
      orderId: string;
      clientId: string;
      saleType: "contado" | "credito";
      totalAmount: string;
      amountPaid: string;
      balanceDue: string;
      items: Array<{
        productId: string;
        productName: string;
        variantId: string;
        variantName: string;
        quantity: string;
        unitPrice: string;
        subtotal: string;
      }>;
    },
    tx?: DbTransaction
  ): Promise<Sale> {
    const existing = await this.repository.findByOrderId(ctx, data.orderId);
    if (existing) {
      return existing;
    }

    const payload: CreateSaleInput = {
      clientId: data.clientId,
      orderId: data.orderId,
      saleType: data.saleType,
      totalAmount: data.totalAmount,
      amountPaid: data.amountPaid,
      balanceDue: data.balanceDue,
      items: data.items,
    };

    return this.repository.create(ctx, payload, tx);
  }

  async deliverSale(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    deliveredItems: Array<{ itemId: string; deliveredQuantity: number; unitPriceFinal?: number }>
  ): Promise<MutationResult<Sale>> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    if (sale.status !== "confirmed") {
      throw new ValidationError("Solo ventas confirmadas pueden entregarse");
    }

    const today = toISODateString(now());
    if (sale.deliveryDate !== today) {
      throw new ValidationError("Solo se puede entregar en la fecha de entrega");
    }

    return db.transaction(async (tx) => {
      for (const delivered of deliveredItems) {
        const item = await this.repository.findItemById(ctx, id, delivered.itemId);
        if (!item) {
          throw new NotFoundError("SaleItem");
        }

        await this.repository.updateItem(
          ctx,
          id,
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

      const refreshedSale = await this.repository.findById(ctx, id);
      if (!refreshedSale) {
        throw new NotFoundError("Sale");
      }

      const deliveredSale = await this.repository.updateVersion(
        ctx,
        id,
        baseVersion,
        {
          status: "delivered",
          deliveredSnapshot: this.buildSnapshot(refreshedSale),
        },
        tx
      );

      if (!deliveredSale) {
        throw new ConflictError("La venta fue modificada por otro usuario");
      }

      return {
        data: deliveredSale,
        txid: await getTxid(tx),
      };
    });
  }

  async generateToken(
    ctx: RequestContext,
    saleId: string
  ): Promise<{ token: string }> {
    const sale = await this.repository.findById(ctx, saleId);
    if (!sale) {
      throw new NotFoundError("Sale");
    }

    const existingToken = await this.getTokenBySaleId(ctx, saleId);
    if (existingToken) {
      throw new ConflictError("Ya existe un token para esta venta");
    }

    const token = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(saleTokens).values({
      saleId,
      token,
      expiresAt,
    });

    return { token };
  }

  async validateToken(
    ctx: RequestContext,
    token: string
  ): Promise<{ valid: boolean; sale?: Sale }> {
    const tokenRecord = await this.validateTokenFormat(token);
    if (!tokenRecord) {
      return { valid: false };
    }

    if (tokenRecord.isActive === false) {
      return { valid: false };
    }

    if (new Date() > tokenRecord.expiresAt) {
      return { valid: false };
    }

    const sale = await this.repository.findById(ctx, tokenRecord.saleId);
    if (!sale) {
      return { valid: false };
    }

    return { valid: true, sale };
  }

  async getTokenBySaleId(
    ctx: RequestContext,
    saleId: string
  ): Promise<SaleToken | null> {
    const tokens = await db
      .select()
      .from(saleTokens)
      .where(eq(saleTokens.saleId, saleId));

    if (tokens.length === 0) {
      return null;
    }

    const validToken = tokens.find(t => t.isActive && new Date() <= t.expiresAt);
    return validToken || null;
  }

  private buildSnapshot(sale: Sale & { items?: SaleItem[] }) {
    return {
      id: sale.id,
      status: sale.status,
      totalAmount: sale.totalAmount,
      deliveryDate: sale.deliveryDate,
      items: sale.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        deliveredQuantity: item.deliveredQuantity,
        unitPrice: item.unitPrice,
        unitPriceFinal: item.unitPriceFinal,
      })),
    };
  }

  private generateSecureToken(): string {
    const TOKEN_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
    const TOKEN_LENGTH = 12;
    const bytes = randomBytes(8);
    let token = "";
    for (let i = 0; i < TOKEN_LENGTH; i++) {
      token += TOKEN_CHARS[bytes[i % bytes.length] % TOKEN_CHARS.length];
    }
    return token;
  }

  private async validateTokenFormat(token: string): Promise<SaleToken | undefined> {
    const TOKEN_LENGTH = 12;
    if (token.length !== TOKEN_LENGTH) {
      return undefined;
    }

    const [tokenRecord] = await db
      .select()
      .from(saleTokens)
      .where(eq(saleTokens.token, token));

    return tokenRecord;
  }



  private async validarStockEstricto(
    ctx: RequestContext,
    distribucionId: string,
    items: Array<{
      variantId: string;
      variantName: string;
      quantity: number;
    }>
  ): Promise<void> {
    const distribucionItems = await this.distribucionItemRepository.findByDistribucionId(
      ctx,
      distribucionId
    );

    for (const saleItem of items) {
      const distItem = distribucionItems.find(
        (di) => di.variantId === saleItem.variantId
      );

      if (!distItem) {
        throw new ValidationError(
          `${saleItem.variantName} no está en su distribución`
        );
      }

      const asignada = parseFloat(distItem.cantidadAsignada);
      const vendida = parseFloat(distItem.cantidadVendida);
      const disponible = asignada - vendida;

      if (saleItem.quantity > disponible) {
        throw new ValidationError(
          `Stock insuficiente para ${saleItem.variantName}. Disponible: ${disponible}, Venta: ${saleItem.quantity}`
        );
      }
    }
  }
}
