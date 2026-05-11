/**
 * Visita Service
 * Business logic for visits
 */
import type { VisitaRepository, VisitaWithCustomer, CreateVisitaData, BulkCreateVisitasData, UpdateVisitaStatusData } from "../repository/visita.repository";
import type { CustomerRepository } from "../repository/customer.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { WaterCustomerProfileRepository } from "../repository/water-customer-profile.repository";
import type { SaleRepository } from "../repository/sale.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";

export class VisitaService {
  constructor(
    private visitaRepo: VisitaRepository,
    private customerRepo: CustomerRepository,
    private distribucionRepo: DistribucionRepository,
    private waterCustomerProfileRepo?: WaterCustomerProfileRepository,
    private saleRepo?: SaleRepository,
    private productVariantRepo?: ProductVariantRepository,
  ) {}

  /**
   * Get all visits for a distribution
   */
  async getVisitasByDistribucion(ctx: RequestContext, distribucionId: string): Promise<VisitaWithCustomer[]> {
    if (!ctx.hasPermission("sales.read")) {
      throw new ForbiddenError("No tiene permisos para ver visitas");
    }

    // Verify distribution exists
    const distribucion = await this.distribucionRepo.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    return this.visitaRepo.findByDistribucionId(ctx, distribucionId);
  }

  /**
   * Get a single visit by ID
   */
  async getVisita(ctx: RequestContext, visitId: string): Promise<VisitaWithCustomer | null> {
    if (!ctx.hasPermission("sales.read")) {
      throw new ForbiddenError("No tiene permisos para ver visitas");
    }

    return this.visitaRepo.findById(ctx, visitId);
  }

  /**
   * Create a single visit
   */
  async createVisita(ctx: RequestContext, data: CreateVisitaData): Promise<import("../../db/schema").Visita> {
    if (!ctx.hasPermission("sales.write")) {
      throw new ForbiddenError("No tiene permisos para crear visitas");
    }

    // Validate distribucion exists
    const distribucion = await this.distribucionRepo.findById(ctx, data.distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    // Validate customer exists
    const customer = await this.customerRepo.findById(ctx, data.customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    // Check if visit already exists
    const exists = await this.visitaRepo.existsByDistribucionAndCustomer(
      ctx,
      data.distribucionId,
      data.customerId
    );
    if (exists) {
      throw new ValidationError("Ya existe una visita para este cliente en esta distribución");
    }

    if (ctx.businessMode !== "agua") {
      return this.visitaRepo.create(ctx, data);
    }

    const waterRepo = this.getWaterCustomerProfileRepo();
    return db.transaction(async (tx) => {
      const visit = await this.visitaRepo.create(ctx, {
        ...data,
        vendedorId: distribucion.vendedorId,
      }, tx);
      const profile = await this.ensureWaterProfileForVisit(ctx, data.customerId, tx);
      await waterRepo.createDeliveryStop(ctx, {
        visitaId: visit.id,
        customerProfileId: profile.id,
        waterRouteId: data.waterRouteId ?? profile.waterRouteId ?? null,
        scheduledDate: distribucion.fecha,
        expectedContainerQuantity: Math.max(
          1,
          data.expectedContainerQuantity ?? profile.defaultContainerQuantity ?? 1
        ),
        containersAtStart: profile.containersAtCustomer ?? 0,
      }, tx);
      return visit;
    });
  }

  /**
   * Create multiple visits from group
   */
  async bulkCreateVisitas(ctx: RequestContext, data: BulkCreateVisitasData): Promise<import("../../db/schema").Visita[]> {
    if (!ctx.hasPermission("sales.write")) {
      throw new ForbiddenError("No tiene permisos para crear visitas");
    }

    // Validate distribucion exists
    const distribucion = await this.distribucionRepo.findById(ctx, data.distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    // Validate all customers exist
    const customers = await this.customerRepo.findByIds(ctx, data.customerIds);
    if (customers.length !== data.customerIds.length) {
      throw new NotFoundError("Algunos clientes no fueron encontrados");
    }

    // Get customers that already have visits
    const visitedCustomerIds = await this.visitaRepo.getVisitedCustomerIds(
      ctx,
      data.distribucionId
    );

    // Filter out customers that already have visits
    const newCustomerIds = data.customerIds.filter(
      id => !visitedCustomerIds.includes(id)
    );

    if (newCustomerIds.length === 0) {
      throw new ValidationError("Todos los clientes ya tienen visitas para esta distribución");
    }

    if (ctx.businessMode !== "agua") {
      return this.visitaRepo.bulkCreate(ctx, {
        distribucionId: data.distribucionId,
        customerIds: newCustomerIds,
      });
    }

    const waterRepo = this.getWaterCustomerProfileRepo();
    return db.transaction(async (tx) => {
      const visits = await this.visitaRepo.bulkCreate(ctx, {
        distribucionId: data.distribucionId,
        customerIds: newCustomerIds,
        vendedorId: distribucion.vendedorId,
      }, tx);
      const profiles = await Promise.all(
        newCustomerIds.map((customerId) => this.ensureWaterProfileForVisit(ctx, customerId, tx))
      );
      const profileByCustomerId = new Map(profiles.map((profile) => [profile.customerId, profile]));

      for (const visit of visits) {
        const profile = profileByCustomerId.get(visit.customerId);
        if (!profile) continue;
        await waterRepo.createDeliveryStop(ctx, {
          visitaId: visit.id,
          customerProfileId: profile.id,
          waterRouteId: data.waterRouteId ?? profile.waterRouteId ?? null,
          scheduledDate: distribucion.fecha,
          expectedContainerQuantity: Math.max(
            1,
            data.expectedContainerQuantity ?? profile.defaultContainerQuantity ?? 1
          ),
          containersAtStart: profile.containersAtCustomer ?? 0,
        }, tx);
      }

      return visits;
    });
  }

  /**
   * Update visit status
   */
  async updateStatus(ctx: RequestContext, visitId: string, data: UpdateVisitaStatusData): Promise<import("../../db/schema").Visita> {
    if (!ctx.hasPermission("sales.write")) {
      throw new ForbiddenError("No tiene permisos para actualizar visitas");
    }

    // Validate status enum
    const validStatuses = ["pendiente", "compro", "no_compra"];
    if (!validStatuses.includes(data.status)) {
      throw new ValidationError("Estado de visita inválido");
    }

    // Verify visit exists
    const visit = await this.visitaRepo.findById(ctx, visitId);
    if (!visit) {
      throw new NotFoundError("Visita");
    }

    // Validate motivoNoCompra is provided when status is no_compra
    if (data.status === "no_compra" && !data.motivoNoCompra) {
      throw new ValidationError("Debe especificar un motivo cuando el cliente no compra");
    }

    // Validate motivoNoCompra is not provided when status is not no_compra
    if (data.status !== "no_compra" && data.motivoNoCompra) {
      throw new ValidationError("El motivo solo puede especificarse cuando el cliente no compra");
    }

    // If status is "compro" and saleId is provided, verify sale exists
    if (data.status === "compro" && data.saleId) {
      // Sale validation would go here if we have a sale repo available
      // For now, we'll allow it
    }

    return this.visitaRepo.updateStatus(ctx, visitId, data);
  }

  async completeWaterDelivery(
    ctx: RequestContext,
    visitId: string,
    data: {
      status: "entregado" | "no_atendido" | "reprogramado";
      delivered?: number;
      collected?: number;
      damaged?: number;
      lost?: number;
      notes?: string | null;
      variantId?: string;
      paymentMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta";
    }
  ) {
    if (!ctx.hasPermission("sales.write")) {
      throw new ForbiddenError("No tiene permisos para completar entregas");
    }

    if (ctx.businessMode !== "agua") {
      throw new ValidationError("La ejecución de entrega de agua solo aplica a negocios de agua");
    }

    const waterRepo = this.getWaterCustomerProfileRepo();
    const visit = await this.visitaRepo.findById(ctx, visitId);
    if (!visit) {
      throw new NotFoundError("Visita");
    }

    const stop = await waterRepo.findDeliveryStopByVisitaId(ctx, visitId);
    if (!stop) {
      throw new NotFoundError("Stop de agua");
    }

    if (stop.status !== "pendiente" || visit.saleId) {
      const previousBalance = Math.max(
        0,
        stop.containersAtStart +
          stop.deliveredContainerQuantity -
          stop.collectedContainerQuantity -
          stop.damagedContainerQuantity -
          stop.lostContainerQuantity
      );

      return {
        visita: visit,
        waterStop: stop,
        containersAtCustomer: previousBalance,
        ...(visit.saleId ? { saleId: visit.saleId } : {}),
      };
    }

    const delivered = Math.max(0, data.delivered ?? 0);
    const collected = Math.max(0, data.collected ?? 0);
    const damaged = Math.max(0, data.damaged ?? 0);
    const lost = Math.max(0, data.lost ?? 0);
    const delta = delivered - collected - damaged - lost;
    const balanceAfter = Math.max(0, stop.containersAtStart + delta);
    const visitStatus = data.status === "entregado" ? "compro" : "no_compra";

    return db.transaction(async (tx) => {
      const updatedStop = await waterRepo.completeDeliveryStop(ctx, stop.id, {
        status: data.status,
        delivered,
        collected,
        damaged,
        lost,
        notes: data.notes ?? null,
      }, tx);

      await waterRepo.updateContainersAtCustomer(ctx, stop.customerProfileId, balanceAfter, tx);

      if (delta !== 0 || damaged > 0 || lost > 0) {
        await waterRepo.createContainerLedgerEntry(ctx, {
          customerId: visit.customerId,
          customerProfileId: stop.customerProfileId,
          visitaId: visit.id,
          entryType: data.status,
          quantity: delta,
          balanceAfter,
          reason: data.notes ?? "Entrega de ruta",
        }, tx);
      }

      let saleId: string | undefined;
      if (data.status === "entregado" && delivered > 0) {
        if (!data.variantId) {
          throw new ValidationError("Se requiere seleccionar un producto/variante para registrar la venta");
        }
        const variant = await this.getProductVariantRepo().findById(ctx, data.variantId, tx);
        if (!variant) {
          throw new NotFoundError("Variante de producto");
        }

        const unitPrice = parseFloat(variant.price);
        const totalAmount = parseFloat((delivered * unitPrice).toFixed(2));
        const totalAmountStr = totalAmount.toFixed(2);

        const sale = await this.getSaleRepo().create(ctx, {
          customerId: visit.customerId,
          distribucionId: visit.distribucionId,
          visitaId: visit.id,
          type: "instant_sale",
          saleType: "contado",
          status: "active",
          totalAmount: totalAmountStr,
          amountPaid: totalAmountStr,
          balanceDue: "0.00",
          paymentMode: "pago_total",
          paymentMethod: data.paymentMethod ?? "efectivo",
          items: [
            {
              productId: variant.productId,
              productName: variant.product?.name ?? variant.name,
              variantId: variant.id,
              variantName: variant.name,
              quantity: delivered.toString(),
              unitPrice: variant.price,
              subtotal: totalAmountStr,
            },
          ],
        }, tx);

        saleId = sale.id;

        // Deduct inventory
        const inventory = await this.getProductVariantRepo().getInventory(ctx, variant.id, tx);
        if (inventory) {
          const currentQty = parseFloat(inventory.quantity);
          const newQty = Math.max(0, currentQty - delivered);
          await this.getProductVariantRepo().updateInventory(ctx, variant.id, newQty.toFixed(2), tx);
        }
      }

      const updatedVisit = await this.visitaRepo.updateStatus(ctx, visitId, {
        status: visitStatus,
        motivoNoCompra: data.status === "entregado" ? undefined : data.notes ?? data.status,
        ...(saleId ? { saleId } : {}),
      }, tx);

      return {
        visita: updatedVisit,
        waterStop: updatedStop,
        containersAtCustomer: balanceAfter,
        ...(saleId ? { saleId } : {}),
      };
    });
  }

  private getWaterCustomerProfileRepo(): WaterCustomerProfileRepository {
    if (!this.waterCustomerProfileRepo) {
      throw new Error("Water customer profile repository is not configured");
    }
    return this.waterCustomerProfileRepo;
  }

  private getSaleRepo(): SaleRepository {
    if (!this.saleRepo) {
      throw new Error("Sale repository is not configured");
    }
    return this.saleRepo;
  }

  private getProductVariantRepo(): ProductVariantRepository {
    if (!this.productVariantRepo) {
      throw new Error("Product variant repository is not configured");
    }
    return this.productVariantRepo;
  }

  private async ensureWaterProfileForVisit(
    ctx: RequestContext,
    customerId: string,
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ) {
    const waterRepo = this.getWaterCustomerProfileRepo();
    const existing = await waterRepo.findByCustomerId(ctx, customerId, tx);
    if (existing) {
      return existing;
    }

    return waterRepo.create(ctx, customerId, {
      deliveryFrequency: "on_demand",
      deliveryDays: [],
      defaultContainerQuantity: 1,
    }, tx);
  }

  /**
   * Delete a visit
   */
  async deleteVisita(ctx: RequestContext, visitId: string): Promise<void> {
    if (!ctx.hasPermission("sales.write")) {
      throw new ForbiddenError("No tiene permisos para eliminar visitas");
    }

    // Verify visit exists
    const visit = await this.visitaRepo.findById(ctx, visitId);
    if (!visit) {
      throw new NotFoundError("Visita");
    }

    await this.visitaRepo.delete(ctx, visitId);
  }

  /**
   * Get visits by customer
   */
  async getVisitasByCustomer(ctx: RequestContext, customerId: string): Promise<import("../../db/schema").Visita[]> {
    if (!ctx.hasPermission("sales.read")) {
      throw new ForbiddenError("No tiene permisos para ver visitas");
    }

    // Verify customer exists
    const customer = await this.customerRepo.findById(ctx, customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    return this.visitaRepo.findByCustomerId(ctx, customerId);
  }
}
