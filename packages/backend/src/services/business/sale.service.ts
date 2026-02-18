import type { SaleRepository, CreateSaleInput } from "../repository/sale.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { BusinessRepository } from "../repository/business.repository";
import type { RequestContext } from "../../context/request-context";
import { ValidationError, ForbiddenError } from "../../errors";
import type { Sale } from "../../db/schema";
import { db } from "../../lib/db";

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
      throw new ValidationError("Venta no encontrada");
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
  ): Promise<Sale> {
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

    const totalAmount = this.normalizeAmount(data.totalAmount, "totalAmount");
    const amountPaidInput =
      data.amountPaid ?? (data.saleType === "contado" ? totalAmount : 0);
    const amountPaid = this.normalizeAmount(amountPaidInput, "amountPaid");
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

    const today = new Date().toISOString().split("T")[0];
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
              newVendida.toString()
            );
          }
        }
      }

      if (data.saleType === "credito" && data.clientId && amountPaid > 0) {
        const initialPaymentReference = `init-sale:${sale.id}`;
        const existingInitialPayment = await this.paymentRepository.findByReferenceNumber(
          ctx,
          initialPaymentReference
        );

        if (!existingInitialPayment) {
          await this.paymentRepository.create(
            ctx,
            {
              clientId: data.clientId,
              amount: amountPaid.toFixed(2),
              paymentMethod: "efectivo",
              notes: "Abono inicial registrado en la venta",
              referenceNumber: initialPaymentReference,
            },
            tx
          );
        }
      }

      return sale;
    });
  }

  async deleteSale(ctx: RequestContext, id: string): Promise<void> {
    const sale = await this.repository.findById(ctx, id);
    if (!sale) {
      throw new ValidationError("Venta no encontrada");
    }

    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar ventas");
    }

    await this.repository.delete(ctx, id);
  }

  async getTodayStats(ctx: RequestContext): Promise<{ count: number; total: string }> {
    return this.repository.getTotalSalesToday(ctx);
  }

  private normalizeAmount(value: number, field: string): number {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`${field} inválido`);
    }

    return Math.max(0, Number(value.toFixed(2)));
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
