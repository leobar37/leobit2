/**
 * Visita Service
 * Business logic for visits
 */
import type { VisitaRepository, VisitaWithCustomer, CreateVisitaData, BulkCreateVisitasData, UpdateVisitaStatusData } from "../repository/visita.repository";
import type { CustomerRepository } from "../repository/customer.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { RequestContext } from "../../context/request-context";
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

    return this.visitaRepo.create(ctx, data);
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

    // Create visits for new customers only
    return this.visitaRepo.bulkCreate(ctx, {
      distribucionId: data.distribucionId,
      customerIds: newCustomerIds,
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
