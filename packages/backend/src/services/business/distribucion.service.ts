import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { CustomerGroupRepository } from "../repository/customer-group.repository";
import type { VisitaRepository } from "../repository/visita.repository";
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
import { db, syncOperations } from "../../lib/db";
import { sales, visitas, distribucionItems } from "../../db/schema";
import type { DbTransaction } from "../../lib/txid";
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
}

export class DistribucionService {
  constructor(
    private repository: DistribucionRepository,
    private itemRepository: DistribucionItemRepository,
    private variantRepository: ProductVariantRepository,
    private customerGroupRepository: CustomerGroupRepository,
    private visitaRepository: VisitaRepository
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
      groupId?: string;
      items?: CreateDistribucionItemInput[];
    },
    tx?: DbTransaction
  ): Promise<DistribucionWithItems> {
    const dbOrTx = tx || db;

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

    const totalKilos = (data.items ?? []).reduce((sum, item) => add(sum, item.cantidadAsignada), "0");

    const distribucion = await this.repository.create(ctx, {
      vendedorId: data.vendedorId,
      puntoVenta: data.puntoVenta,
      puntoVentaId: data.puntoVentaId,
      montoRecaudado: "0",
      notaCreacion: data.notaCreacion,
      fecha,
      estado: "activo",
      syncStatus: "synced",
      syncAttempts: 0,
    }, tx);

    await dbOrTx.insert(syncOperations).values({
      businessId: ctx.businessId,
      operationId: `api-create-distribucion-${distribucion.id}`,
      entity: "distribuciones",
      action: "create",
      entityId: distribucion.id,
      payload: {
        id: distribucion.id,
        vendedorId: distribucion.vendedorId,
        puntoVenta: distribucion.puntoVenta,
        notaCreacion: distribucion.notaCreacion,
        montoRecaudado: distribucion.montoRecaudado,
        fecha: distribucion.fecha,
        estado: distribucion.estado,
      },
      status: "processed",
      clientTimestamp: new Date(),
      processedAt: new Date(),
    });

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const createdItem = await this.itemRepository.create(ctx, {
          distribucionId: distribucion.id,
          variantId: item.variantId,
          cantidadAsignada: item.cantidadAsignada,
          cantidadVendida: "0",
          unidad: item.unidad,
          syncStatus: "synced",
          syncAttempts: 0,
        }, tx);

        await dbOrTx.insert(syncOperations).values({
          businessId: ctx.businessId,
          operationId: `api-create-distribucion-item-${createdItem.id}`,
          entity: "distribucion_items",
          action: "create",
          entityId: createdItem.id,
          payload: {
            id: createdItem.id,
            distribucionId: createdItem.distribucionId,
            variantId: createdItem.variantId,
            cantidadAsignada: createdItem.cantidadAsignada,
            cantidadVendida: createdItem.cantidadVendida,
            unidad: createdItem.unidad,
          },
          status: "processed",
          clientTimestamp: new Date(),
          processedAt: new Date(),
        });
      }
    }

    if (data.groupId) {
      const group = await this.customerGroupRepository.findByIdWithMembers(ctx, data.groupId, tx);
      if (group && group.members.length > 0) {
        const customerIds = group.members.map(m => m.customerId);
        const createdVisitas = await this.visitaRepository.bulkCreate(ctx, {
          distribucionId: distribucion.id,
          customerIds,
        }, tx);

        // Register sync operations for each created visita
        for (const visita of createdVisitas) {
          await dbOrTx.insert(syncOperations).values({
            businessId: ctx.businessId,
            operationId: `api-create-visita-${visita.id}`,
            entity: "visitas",
            action: "create",
            entityId: visita.id,
            payload: {
              id: visita.id,
              distribucionId: visita.distribucionId,
              customerId: visita.customerId,
              vendedorId: visita.vendedorId,
              status: visita.status,
            },
            status: "processed",
            clientTimestamp: new Date(),
            processedAt: new Date(),
          });
        }
      }
    }

    const distribucionWithItems = await this.repository.findByIdWithItems(ctx, distribucion.id);
    if (!distribucionWithItems) {
      throw new NotFoundError("Distribución");
    }

    return distribucionWithItems;
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

    await db.insert(syncOperations).values({
      businessId: ctx.businessId,
      operationId: `api-update-distribucion-${updated.id}`,
      entity: "distribuciones",
      action: "update",
      entityId: updated.id,
      payload: {
        id: updated.id,
        puntoVenta: updated.puntoVenta,
        estado: updated.estado,
      },
      status: "processed",
      clientTimestamp: new Date(),
      processedAt: new Date(),
    });

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

    await db.insert(syncOperations).values({
      businessId: ctx.businessId,
      operationId: `api-close-distribucion-${updated.id}`,
      entity: "distribuciones",
      action: "update",
      entityId: updated.id,
      payload: {
        id: updated.id,
        estado: updated.estado,
        notaCierre: updated.notaCierre,
        closedAt: updated.closedAt,
        closedBy: updated.closedBy,
      },
      status: "processed",
      clientTimestamp: new Date(),
      processedAt: new Date(),
    });

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
    return distribucionWithItems;
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
      await db.insert(syncOperations).values({
        businessId: ctx.businessId,
        operationId: `api-delete-visita-${visita.id}`,
        entity: "visitas",
        action: "delete",
        entityId: visita.id,
        payload: { id: visita.id },
        status: "processed",
        clientTimestamp: new Date(),
        processedAt: new Date(),
      });
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

    await this.repository.delete(ctx, id);

    await db.insert(syncOperations).values({
      businessId: ctx.businessId,
      operationId: `api-delete-distribucion-${id}`,
      entity: "distribuciones",
      action: "delete",
      entityId: id,
      payload: { id },
      status: "processed",
      clientTimestamp: new Date(),
      processedAt: new Date(),
    });
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
        syncStatus: "synced",
        syncAttempts: 0,
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

    await db.insert(syncOperations).values({
      businessId: ctx.businessId,
      operationId: `api-close-distribucion-${updated.id}`,
      entity: "distribuciones",
      action: "update",
      entityId: updated.id,
      payload: {
        id: updated.id,
        estado: updated.estado,
        notaCierre: updated.notaCierre,
        closedAt: updated.closedAt,
        closedBy: updated.closedBy,
      },
      status: "processed",
      clientTimestamp: new Date(),
      processedAt: new Date(),
    });

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
      syncStatus: "synced",
      syncAttempts: 0,
    });

    // Register sync operation
    await db.insert(syncOperations).values({
      businessId: ctx.businessId,
      operationId: `api-add-distribucion-item-${createdItem.id}`,
      entity: "distribucion_items",
      action: "create",
      entityId: createdItem.id,
      payload: {
        id: createdItem.id,
        distribucionId: createdItem.distribucionId,
        variantId: createdItem.variantId,
        cantidadAsignada: createdItem.cantidadAsignada,
        cantidadVendida: createdItem.cantidadVendida,
        unidad: createdItem.unidad,
      },
      status: "processed",
      clientTimestamp: new Date(),
      processedAt: new Date(),
    });

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
    await db.insert(syncOperations).values({
      businessId: ctx.businessId,
      operationId: `api-update-distribucion-item-${itemId}`,
      entity: "distribucion_items",
      action: "update",
      entityId: itemId,
      payload: {
        id: itemId,
        ...updateData,
      },
      status: "processed",
      clientTimestamp: new Date(),
      processedAt: new Date(),
    });

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
    await db.insert(syncOperations).values({
      businessId: ctx.businessId,
      operationId: `api-delete-distribucion-item-${itemId}`,
      entity: "distribucion_items",
      action: "delete",
      entityId: itemId,
      payload: {
        id: itemId,
        distribucionId,
      },
      status: "processed",
      clientTimestamp: new Date(),
      processedAt: new Date(),
    });
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
