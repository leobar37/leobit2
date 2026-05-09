// @ts-nocheck - Backend file
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { CustomerGroupRepository } from "../repository/customer-group.repository";
import type { DistribucionGroupRepository } from "../repository/distribucion-group.repository";
import type { VisitaRepository } from "../repository/visita.repository";
import type { WaterCustomerProfileRepository } from "../repository/water-customer-profile.repository";
import type { WaterRouteRepository } from "../repository/water-route.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from "../../errors";
import { and, eq } from "drizzle-orm";
import { getToday } from "../../lib/date-utils";
import type { Distribucion, DistribucionItem, NewDistribucionItem } from "../../db/schema";
import { db } from "../../lib/db";
import { sales, visitas, distribucionItems } from "../../db/schema";
import { isPositive, isGreaterThanOrEqual, add, subtract as decimalSubtract } from "../../lib/decimal";

// Types for item management
export interface DistribucionItemEnriched extends DistribucionItem {
  variantName?: string;
  productName?: string;
}

export interface CreateDistribucionItemInput {
  variantId: string;
  cantidadAsignada: string;
  unidad: string;
}

interface DistribucionWithItems extends Distribucion {
  items: (DistribucionItem & { variant?: { name: string; product?: { name: string } } })[];
  groups?: { id: string; name: string }[];
}

export class DistribucionService {
  constructor(
    private repository: DistribucionRepository,
    private itemRepository: DistribucionItemRepository,
    private variantRepository: ProductVariantRepository,
    private customerGroupRepository: CustomerGroupRepository,
    private distribucionGroupRepository: DistribucionGroupRepository,
    private visitaRepository: VisitaRepository,
    private waterCustomerProfileRepository?: WaterCustomerProfileRepository,
    private waterRouteRepository?: WaterRouteRepository
  ) {}

  async getDistribuciones(
    ctx: RequestContext,
    filters?: {
      fecha?: string;
      vendedorId?: string;
      estado?: "activo" | "cerrado" | "en_ruta";
      limit?: number;
      offset?: number;
    }
  ): Promise<Distribucion[]> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    // Si es vendedor, solo puede ver sus propias distribuciones
    if (!ctx.isAdmin() && filters?.vendedorId && filters.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede ver distribuciones de otros vendedores");
    }

    // Si es vendedor y no especifica vendedorId, filtrar por su ID
    if (!ctx.isAdmin() && !filters?.vendedorId) {
      return this.repository.findMany(ctx, {
        ...filters,
        vendedorId: ctx.businessUserId,
      });
    }

    return this.repository.findMany(ctx, filters);
  }

  async getDistribucion(ctx: RequestContext, id: string): Promise<Distribucion> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, id);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    // Vendedores solo pueden ver sus propias distribuciones
    if (!ctx.isAdmin() && distribucion.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede ver esta distribución");
    }

    return distribucion;
  }

  async createDistribucion(
    ctx: RequestContext,
    data: {
      vendedorId: string;
      puntoVenta: string;
      puntoVentaId?: string;
      notaCreacion?: string;
      fecha?: string;
      groupIds?: string[];
      items?: CreateDistribucionItemInput[];
    },
    tx?: DbTransaction
  ): Promise<DistribucionWithItems> {
    if (!tx) {
      return db.transaction((innerTx) => this.createDistribucion(ctx, data, innerTx));
    }

    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para crear distribuciones");
    }

    if (!data.vendedorId) {
      throw new ValidationError("El vendedor es requerido");
    }

    if (!data.puntoVenta || data.puntoVenta.length < 2) {
      throw new ValidationError("El punto de venta debe tener al menos 2 caracteres");
    }

    const fecha = data.fecha || getToday();
    const exists = await this.repository.existsForVendedorAndFecha(
      ctx,
      data.vendedorId,
      fecha,
      ["activo", "en_ruta"]
    );

    if (exists) {
      throw new ConflictError(
        "Ya existe una distribución activa para este vendedor en la fecha especificada"
      );
    }

    const seenVariantIds = new Set<string>();
    for (const item of data.items ?? []) {
      if (!isPositive(item.cantidadAsignada)) {
        throw new ValidationError("La cantidad asignada debe ser mayor a 0");
      }

      if (seenVariantIds.has(item.variantId)) {
        throw new ValidationError("No se puede asignar el mismo producto más de una vez");
      }
      seenVariantIds.add(item.variantId);

      const variant = await this.variantRepository.findById(ctx, item.variantId);
      if (!variant || variant.businessId !== ctx.businessId) {
        throw new NotFoundError("Variante de producto");
      }
    }

    const distribucion = await this.repository.create(ctx, {
      vendedorId: data.vendedorId,
      puntoVenta: data.puntoVenta,
      puntoVentaId: data.puntoVentaId,
      montoRecaudado: "0",
      notaCreacion: data.notaCreacion,
      fecha,
      estado: "activo",
    }, tx);

    
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const createdItem = await this.itemRepository.create(ctx, {
          distribucionId: distribucion.id,
          variantId: item.variantId,
          cantidadAsignada: item.cantidadAsignada,
          cantidadVendida: "0",
          unidad: item.unidad,
        }, tx);

              }
    }

    const legacyGroupId = (data as { groupId?: string }).groupId;
    const groupIds = data.groupIds ?? (legacyGroupId ? [legacyGroupId] : []);

    if (groupIds.length > 0) {
      // Create junction records for each group
      await this.distribucionGroupRepository.createMany(ctx, distribucion.id, groupIds, tx);

      // Collect all unique customer IDs from all groups
      const allCustomerIds = new Set<string>();
      for (const groupId of groupIds) {
        const group = await this.customerGroupRepository.findByIdWithMembers(ctx, groupId, tx);
        if (group && group.members.length > 0) {
          for (const member of group.members) {
            allCustomerIds.add(member.customerId);
          }
        }
      }

      if (allCustomerIds.size > 0) {
        const customerIds = Array.from(allCustomerIds);
        const createdVisitas = await this.visitaRepository.bulkCreate(ctx, {
          distribucionId: distribucion.id,
          customerIds,
          vendedorId: data.vendedorId,
        }, tx);

        // Register sync operations for each created visita
        for (const visita of createdVisitas) {
          // Sync operation placeholder
        }
      }
    }

    const distribucionWithItems = await this.repository.findByIdWithItems(ctx, distribucion.id, tx);
    if (!distribucionWithItems) {
      throw new NotFoundError("Distribución");
    }

    // Enrich with group names
    const groups = await this.distribucionGroupRepository.findGroupsByDistribucionId(ctx, distribucion.id, tx);

    return {
      ...distribucionWithItems,
      groups,
    };
  }

  async previewWaterRoute(
    ctx: RequestContext,
    data: {
      fecha: string;
      waterRouteId: string;
    }
  ) {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver rutas");
    }
    this.assertWaterMode(ctx);
    if (!data.waterRouteId) {
      throw new ValidationError("La ruta es requerida");
    }

    const day = this.resolveDayKey(data.fecha);
    const candidates = await this.getWaterProfileRepository().findScheduledCandidates(
      ctx,
      data.waterRouteId,
      data.fecha
    );
    const profiles = candidates.filter((profile) => this.matchesWaterSchedule(profile, data.fecha, day));

    return profiles.map((profile) => this.toWaterRouteCustomer(profile));
  }

  async generateWaterRoute(
    ctx: RequestContext,
    data: {
      vendedorId: string;
      fecha: string;
      waterRouteId: string;
      notaCreacion?: string;
    },
    tx?: any
  ) {
    if (!tx) {
      return db.transaction((innerTx) => this.generateWaterRoute(ctx, data, innerTx));
    }

    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para crear rutas");
    }
    this.assertWaterMode(ctx);

    if (!data.vendedorId) {
      throw new ValidationError("El repartidor es requerido");
    }

    const route = await this.getWaterRouteRepository().findById(ctx, data.waterRouteId);
    if (!route) {
      throw new NotFoundError("Ruta");
    }

    const existingDistribucion = await this.repository.existsForVendedorAndFecha(
      ctx,
      data.vendedorId,
      data.fecha,
      ["activo", "en_ruta"]
    );
    if (existingDistribucion) {
      throw new ConflictError(
        "Ya existe una distribución activa para este repartidor en la fecha especificada"
      );
    }

    const routeName = route.name;
    const day = this.resolveDayKey(data.fecha);
    const candidates = await this.getWaterProfileRepository().findScheduledCandidates(
      ctx,
      data.waterRouteId,
      data.fecha
    );
    const profiles = candidates.filter((profile) => this.matchesWaterSchedule(profile, data.fecha, day));

    if (profiles.length === 0) {
      throw new ValidationError("No hay clientes programados para esta ruta");
    }

    const distribucion = await this.repository.create(ctx, {
      vendedorId: data.vendedorId,
      puntoVenta: routeName,
      montoRecaudado: "0",
      notaCreacion: data.notaCreacion ?? "Ruta generada desde clientes programados de agua",
      fecha: data.fecha,
      estado: "activo",
    }, tx);

    for (const profile of profiles) {
      const visita = await this.visitaRepository.create(ctx, {
        distribucionId: distribucion.id,
        customerId: profile.customerId,
      }, tx);

      await this.getWaterProfileRepository().createDeliveryStop(ctx, {
        visitaId: visita.id,
        customerProfileId: profile.id,
        waterRouteId: data.waterRouteId,
        scheduledDate: data.fecha,
        expectedContainerQuantity: profile.defaultContainerQuantity,
        containersAtStart: profile.containersAtCustomer,
      }, tx);

      await this.getWaterProfileRepository().markScheduled(
        ctx,
        profile.id,
        new Date(`${data.fecha}T00:00:00`),
        tx
      );
    }

    return {
      distribucionId: distribucion.id,
      customers: profiles.map((profile) => this.toWaterRouteCustomer(profile)),
      createdVisits: profiles.length,
    };
  }

  private assertWaterMode(ctx: RequestContext) {
    if (ctx.businessMode !== "agua") {
      throw new ValidationError("La generación de rutas de agua solo aplica a negocios de agua");
    }
  }

  private getWaterProfileRepository(): WaterCustomerProfileRepository {
    if (!this.waterCustomerProfileRepository) {
      throw new Error("Water customer profile repository is not configured");
    }
    return this.waterCustomerProfileRepository;
  }

  private getWaterRouteRepository(): WaterRouteRepository {
    if (!this.waterRouteRepository) {
      throw new Error("Water route repository is not configured");
    }
    return this.waterRouteRepository;
  }

  private resolveDayKey(fecha: string): string {
    const date = new Date(`${fecha}T00:00:00`);
    const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return dayKeys[date.getDay()] ?? "monday";
  }

  private matchesWaterSchedule(
    profile: import("../repository/water-customer-profile.repository").WaterRouteProfileRow,
    fecha: string,
    day: string
  ): boolean {
    const frequency = profile.deliveryFrequency ?? "weekly";
    const deliveryDays = Array.isArray(profile.deliveryDays) ? profile.deliveryDays : [];

    if (frequency === "daily") {
      return true;
    }

    if (frequency === "weekly") {
      return deliveryDays.includes(day);
    }

    const selected = new Date(`${fecha}T00:00:00`);
    const base = profile.lastScheduledAt ?? profile.scheduleAnchorDate ?? profile.createdAt;
    if (!base) {
      return deliveryDays.length === 0 || deliveryDays.includes(day);
    }

    const baseDate = new Date(base);
    const diffDays = Math.floor((selected.getTime() - baseDate.getTime()) / 86_400_000);
    if (diffDays < 0) {
      return false;
    }

    if (frequency === "biweekly") {
      return diffDays % 14 === 0;
    }

    if (frequency === "monthly") {
      return selected.getDate() === baseDate.getDate();
    }

    return deliveryDays.includes(day);
  }

  private toWaterRouteCustomer(profile: import("../repository/water-customer-profile.repository").WaterRouteProfileRow) {
    return {
      customerId: profile.customerId,
      customerName: profile.customerName,
      phone: profile.customerPhone,
      address: profile.customerAddress,
      profileId: profile.id,
      defaultContainerQuantity: profile.defaultContainerQuantity,
      containersAtCustomer: profile.containersAtCustomer,
      preferredRoute: profile.preferredRoute,
      waterRouteId: profile.waterRouteId,
      waterRouteName: profile.waterRouteName,
      deliveryInstructions: profile.deliveryInstructions,
    };
  }

  async updateDistribucion(
    ctx: RequestContext,
    id: string,
    data: {
      puntoVenta?: string;
      estado?: "activo" | "cerrado" | "en_ruta";
    }
  ): Promise<Distribucion> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para actualizar distribuciones");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Distribución");
    }

    // Solo admin puede actualizar distribuciones
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo admin puede actualizar distribuciones");
    }

    // Validaciones
    if (data.puntoVenta !== undefined && data.puntoVenta.length < 2) {
      throw new ValidationError("El punto de venta debe tener al menos 2 caracteres");
    }

    const updated = await this.repository.update(ctx, id, {
      ...(data.puntoVenta !== undefined && { puntoVenta: data.puntoVenta }),
      ...(data.estado !== undefined && { estado: data.estado }),
    });

    if (!updated) {
      throw new NotFoundError("Distribución");
    }

    
    return updated;
  }

  async closeDistribucion(
    ctx: RequestContext,
    id: string,
    data?: {
      notaCierre?: string;
    }
  ): Promise<Distribucion> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para cerrar distribuciones");
    }

    const existing = await this.repository.findByIdWithItems(ctx, id);
    if (!existing) {
      throw new NotFoundError("Distribución");
    }

    // Admin puede cerrar cualquiera, vendedor solo la suya
    if (!ctx.isAdmin() && existing.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede cerrar esta distribución");
    }

    const updateData: Parameters<DistribucionRepository["update"]>[2] = {
      estado: "cerrado",
      notaCierre: data?.notaCierre,
      closedAt: new Date(),
      closedBy: ctx.businessUserId,
    };

    const updated = await this.repository.update(ctx, id, updateData);

    if (!updated) {
      throw new NotFoundError("Distribución");
    }

    
    return updated;
  }

  async getDistribucionForVendedor(
    ctx: RequestContext,
    vendedorId: string,
    fecha?: string
  ): Promise<DistribucionWithItems | null> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    // Vendedores solo pueden ver su propia distribución
    if (!ctx.isAdmin() && vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede ver la distribución de otro vendedor");
    }

    const fechaStr = fecha || getToday();
    const distribucion = await this.repository.findByVendedorAndFecha(
      ctx,
      vendedorId,
      fechaStr
    );

    if (!distribucion) return null;

    const distribucionWithItems = await this.repository.findByIdWithItems(ctx, distribucion.id);
    if (!distribucionWithItems) return null;

    // Enrich with group names
    const groups = await this.distribucionGroupRepository.findGroupsByDistribucionId(ctx, distribucion.id);

    return {
      ...distribucionWithItems,
      groups,
    };
  }

  async getDistribucionWithItems(
    ctx: RequestContext,
    id: string
  ): Promise<DistribucionWithItems> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    const distribucion = await this.repository.findByIdWithItems(ctx, id);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    if (!ctx.isAdmin() && distribucion.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede ver esta distribución");
    }

    return distribucion;
  }

  /**
   * Get groups linked to a distribution
   */
  async getDistribucionGroups(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<{ id: string; name: string }[]> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    if (!ctx.isAdmin() && distribucion.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede ver esta distribución");
    }

    return this.distribucionGroupRepository.findGroupsByDistribucionId(ctx, distribucionId);
  }

  async getDistribucionItems(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<DistribucionItem[]> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    if (!ctx.isAdmin() && distribucion.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede ver los items de esta distribución");
    }

    return this.itemRepository.findByDistribucionId(ctx, distribucionId);
  }

  async getStockDisponible(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<{ disponible: number; asignado: number; vendido: number }> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    const distribucionWithItems = await this.repository.findByIdWithItems(ctx, distribucionId);
    
    const asignadoStr = distribucionWithItems?.items?.reduce((sum, item) => add(sum, item.cantidadAsignada), "0") ?? "0";
    const vendidoStr = distribucionWithItems?.items?.reduce((sum, item) => add(sum, item.cantidadVendida), "0") ?? "0";
    const disponibleStr = decimalSubtract(asignadoStr, vendidoStr);

    return {
      disponible: Number(disponibleStr),
      asignado: Number(asignadoStr),
      vendido: Number(vendidoStr),
    };
  }

  async deleteDistribucion(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para eliminar distribuciones");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Distribución");
    }

    if (existing.estado === "cerrado") {
      throw new ConflictError("No se puede eliminar una distribución cerrada");
    }

    const salesCount = await db
      .select({ count: db.$count(sales) })
      .from(sales)
      .where(
        and(
          eq(sales.distribucionId, id),
          eq(sales.businessId, ctx.businessId)
        )
      );
    
    if (salesCount[0]?.count > 0) {
      throw new ConflictError(
        `No se puede eliminar la distribución porque tiene ${salesCount[0].count} venta(s) asociada(s)`
      );
    }

    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo admin puede eliminar distribuciones");
    }

    // Find and delete associated visitas
    const associatedVisitas = await this.visitaRepository.findByDistribucionId(ctx, id);

    for (const visita of associatedVisitas) {
          }

    // Delete visitas from database
    await db
      .delete(visitas)
      .where(
        and(
          eq(visitas.distribucionId, id),
          eq(visitas.businessId, ctx.businessId)
        )
      );

    // Delete group links
    await this.distribucionGroupRepository.deleteByDistribucionId(ctx, id);

    await this.repository.delete(ctx, id);
  }

  async replaceDistribucionItems(
    ctx: RequestContext,
    distribucionId: string,
    items: CreateDistribucionItemInput[]
  ): Promise<DistribucionWithItems> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para actualizar distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    if (!ctx.isAdmin() && distribucion.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede modificar esta distribución");
    }

    for (const item of items) {
      if (!isPositive(item.cantidadAsignada)) {
        throw new ValidationError("La cantidad asignada debe ser mayor a 0");
      }

      const variant = await this.variantRepository.findById(ctx, item.variantId);
      if (!variant) {
        throw new NotFoundError(`Variante ${item.variantId}`);
      }
    }

    await this.itemRepository.deleteByDistribucionId(ctx, distribucionId);

    for (const item of items) {
      await this.itemRepository.create(ctx, {
        distribucionId,
        variantId: item.variantId,
        cantidadAsignada: item.cantidadAsignada,
        cantidadVendida: "0",
        unidad: item.unidad,
      });
    }

    const distribucionWithItems = await this.repository.findByIdWithItems(ctx, distribucionId);
    if (!distribucionWithItems) {
      throw new NotFoundError("Distribución");
    }

    return distribucionWithItems;
  }

  async closeDistribucionWithItems(
    ctx: RequestContext,
    id: string,
    data: {
      notaCierre?: string;
      items: Array<{
        variantId: string;
        cantidadLlevada: string;
        cantidadVendida: string;
        cantidadDevuelta?: string;
      }>;
    }
  ): Promise<Distribucion> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para cerrar distribuciones");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Distribución");
    }

    if (!ctx.isAdmin() && existing.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede cerrar esta distribución");
    }

    if (!data.items || data.items.length === 0) {
      throw new ValidationError("Debe registrar al menos un producto al cerrar");
    }

    for (const item of data.items) {
      if (isPositive(item.cantidadLlevada) === false && item.cantidadLlevada !== "0") {
        throw new ValidationError("Las cantidades no pueden ser negativas");
      }
      if (isPositive(item.cantidadVendida) === false && item.cantidadVendida !== "0") {
        throw new ValidationError("Las cantidades no pueden ser negativas");
      }

      if (isGreaterThanOrEqual(item.cantidadLlevada, item.cantidadVendida) === false) {
        throw new ValidationError("La cantidad vendida no puede ser mayor a la llevada");
      }

      const variant = await this.variantRepository.findById(ctx, item.variantId);
      if (!variant) {
        throw new NotFoundError(`Variante ${item.variantId}`);
      }
    }

    // Close the distribution
    const updateData: Parameters<DistribucionRepository["update"]>[2] = {
      estado: "cerrado",
      notaCierre: data.notaCierre,
      closedAt: new Date(),
      closedBy: ctx.businessUserId,
    };

    const updated = await this.repository.update(ctx, id, updateData);

    if (!updated) {
      throw new NotFoundError("Distribución");
    }

    // Create cierre items (implementation would need cierre item repository)
    // This is a placeholder - actual implementation would insert into distribucion_cierre_items

    
    return updated;
  }

  // ==========================================
  // Item Management Methods (T-002)
  // Following PurchaseService pattern
  // ==========================================

  /**
   * Add a single item to an existing distribucion
   */
  async addItem(
    ctx: RequestContext,
    distribucionId: string,
    item: CreateDistribucionItemInput
  ): Promise<DistribucionItem> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para modificar distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    // Only allow modifications to active or en_ruta distribuciones
    if (distribucion.estado === "cerrado") {
      throw new ValidationError("No se pueden modificar items de una distribución cerrada");
    }

    // Validate variant exists
    const variant = await this.variantRepository.findById(ctx, item.variantId);
    if (!variant) {
      throw new NotFoundError("Variante de producto");
    }

    const createdItem = await this.itemRepository.create(ctx, {
      distribucionId,
      variantId: item.variantId,
      cantidadAsignada: item.cantidadAsignada,
      cantidadVendida: "0",
      unidad: item.unidad,
    });

    // Register sync operation
    
    return createdItem;
  }

  /**
   * Update item quantities
   */
  async updateItem(
    ctx: RequestContext,
    distribucionId: string,
    itemId: string,
    data: {
      cantidadAsignada?: string;
      cantidadVendida?: string;
    }
  ): Promise<DistribucionItem> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para modificar distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    if (distribucion.estado === "cerrado") {
      throw new ValidationError("No se pueden modificar items de una distribución cerrada");
    }

    const existingItem = await this.itemRepository.findById(ctx, itemId);
    if (!existingItem || existingItem.distribucionId !== distribucionId) {
      throw new NotFoundError("Item de distribución");
    }

    // Build update data
    const updateData: Partial<NewDistribucionItem> = {};
    if (data.cantidadAsignada !== undefined) {
      updateData.cantidadAsignada = data.cantidadAsignada;
    }
    if (data.cantidadVendida !== undefined) {
      updateData.cantidadVendida = data.cantidadVendida;
    }

    // Use repository's general update via db directly
    const [updatedItem] = await db
      .update(db._.schema?.distribucionItems || db._.fullSchema.distribucionItems)
      .set(updateData)
      .where(and(
        eq(distribucionItems.id, itemId),
        eq(distribucionItems.businessId, ctx.businessId)
      ))
      .returning();

    if (!updatedItem) {
      throw new NotFoundError("Item de distribución");
    }

    // Register sync operation
    
    return updatedItem;
  }

  /**
   * Remove an item from distribucion
   */
  async removeItem(
    ctx: RequestContext,
    distribucionId: string,
    itemId: string
  ): Promise<void> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para modificar distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    if (distribucion.estado === "cerrado") {
      throw new ValidationError("No se pueden eliminar items de una distribución cerrada");
    }

    const existingItem = await this.itemRepository.findById(ctx, itemId);
    if (!existingItem || existingItem.distribucionId !== distribucionId) {
      throw new NotFoundError("Item de distribución");
    }

    await this.itemRepository.delete(ctx, itemId);

    // Register sync operation
      }

  /**
   * Get items with enriched product/variant names
   */
  async getItemsWithNames(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<DistribucionItemEnriched[]> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    const distribucion = await this.repository.findById(ctx, distribucionId);
    if (!distribucion) {
      throw new NotFoundError("Distribución");
    }

    // Check permissions - admin can see all, vendedor only their own
    if (!ctx.isAdmin() && distribucion.vendedorId !== ctx.businessUserId) {
      throw new ForbiddenError("No puede ver los items de esta distribución");
    }

    const items = await db.query.distribucionItems.findMany({
      where: and(
        eq(distribucionItems.distribucionId, distribucionId),
        eq(distribucionItems.businessId, ctx.businessId)
      ),
      with: {
        variant: {
          with: {
            product: true,
          },
        },
      },
    });

    return items.map((item: DistribucionItem & { variant?: { name?: string; product?: { name?: string } } }) => ({
      ...item,
      variantName: item.variant?.name ?? "",
      productName: item.variant?.product?.name ?? "",
    }));
  }
}
