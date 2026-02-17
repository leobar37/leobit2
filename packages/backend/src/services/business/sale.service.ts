import type { SaleRepository, CreateSaleInput } from "../repository/sale.repository";
import type { RequestContext } from "../../context/request-context";
import { ValidationError, ForbiddenError } from "../../errors";
import type { Sale } from "../../db/schema";

export class SaleService {
  constructor(private repository: SaleRepository) {}

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

    const amountPaid = data.amountPaid ?? 0;
    const balanceDue = data.saleType === "credito" 
      ? data.totalAmount - amountPaid 
      : 0;

    if (data.saleType === "contado" && amountPaid < data.totalAmount) {
      throw new ValidationError("En venta al contado, el monto pagado debe ser igual al total");
    }

    if (data.saleType === "credito" && amountPaid > data.totalAmount) {
      throw new ValidationError("El monto pagado no puede ser mayor al total");
    }

    return this.repository.create(ctx, {
      clientId: data.clientId,
      saleType: data.saleType,
      totalAmount: data.totalAmount.toString(),
      amountPaid: amountPaid.toString(),
      balanceDue: balanceDue.toString(),
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
}
