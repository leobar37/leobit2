import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from "../../errors";
import type { Distribucion, DistribucionItem } from "../../db/schema";

interface DistribucionWithItems extends Distribucion {
  items: (DistribucionItem & { variant?: { name: string; product?: { name: string } } })[];
}

export class DistribucionService {
  constructor(
    private repository: DistribucionRepository,
    private itemRepository: DistribucionItemRepository,
    private variantRepository: ProductVariantRepository
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
      fecha?: string;
      modo?: "estricto" | "acumulativo" | "libre";
      confiarEnVendedor?: boolean;
      items: Array<{
        variantId: string;
        cantidadAsignada: number;
        unidad: string;
      }>;
    }
  ): Promise<DistribucionWithItems> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para crear distribuciones");
    }

    if (!data.vendedorId) {
      throw new ValidationError("El vendedor es requerido");
    }

    if (!data.puntoVenta || data.puntoVenta.length < 2) {
      throw new ValidationError("El punto de venta debe tener al menos 2 caracteres");
    }

    if (!data.items || data.items.length === 0) {
      throw new ValidationError("La distribución debe tener al menos un item");
    }

    for (const item of data.items) {
      if (item.cantidadAsignada <= 0) {
        throw new ValidationError("La cantidad asignada debe ser mayor a 0");
      }

      const variant = await this.variantRepository.findById(ctx, item.variantId);
      if (!variant) {
        throw new NotFoundError(`Variante ${item.variantId}`);
      }

      if (variant.inventory && parseFloat(variant.inventory.quantity) < item.cantidadAsignada) {
        throw new ValidationError(
          `Stock insuficiente para ${variant.name}. Disponible: ${variant.inventory.quantity}, Requerido: ${item.cantidadAsignada}`
        );
      }
    }

    const fecha = data.fecha || new Date().toISOString().split("T")[0];
    const exists = await this.repository.existsForVendedorAndFecha(
      ctx,
      data.vendedorId,
      fecha
    );

    if (exists) {
      throw new ConflictError(
        "Ya existe una distribución para este vendedor en la fecha especificada"
      );
    }

    const totalKilos = data.items.reduce((sum, item) => sum + item.cantidadAsignada, 0);

    const distribucion = await this.repository.create(ctx, {
      vendedorId: data.vendedorId,
      puntoVenta: data.puntoVenta,
      kilosAsignados: totalKilos.toString(),
      kilosVendidos: "0",
      montoRecaudado: "0",
      fecha,
      estado: "activo",
      modo: data.modo || "estricto",
      confiarEnVendedor: data.confiarEnVendedor || false,
      pesoConfirmado: !data.confiarEnVendedor,
      syncStatus: "pending",
      syncAttempts: 0,
    });

    for (const item of data.items) {
      await this.itemRepository.create(ctx, {
        distribucionId: distribucion.id,
        variantId: item.variantId,
        cantidadAsignada: item.cantidadAsignada.toString(),
        cantidadVendida: "0",
        unidad: item.unidad,
        syncStatus: "synced",
        syncAttempts: 0,
      });
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
      kilosAsignados?: number;
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

    if (data.kilosAsignados !== undefined && data.kilosAsignados <= 0) {
      throw new ValidationError("Los kilos asignados deben ser mayores a 0");
    }

    const updated = await this.repository.update(ctx, id, {
      ...(data.puntoVenta !== undefined && { puntoVenta: data.puntoVenta }),
      ...(data.kilosAsignados !== undefined && {
        kilosAsignados: data.kilosAsignados.toString(),
      }),
      ...(data.estado !== undefined && { estado: data.estado }),
    });

    if (!updated) {
      throw new NotFoundError("Distribución");
    }

    return updated;
  }

  async closeDistribucion(ctx: RequestContext, id: string): Promise<Distribucion> {
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

    for (const item of existing.items) {
      const asignada = parseFloat(item.cantidadAsignada);
      const vendida = parseFloat(item.cantidadVendida);
      const sobrante = asignada - vendida;

      if (sobrante > 0) {
        await this.variantRepository.adjustInventory(ctx, item.variantId, sobrante);
      }
    }

    const updated = await this.repository.update(ctx, id, {
      estado: "cerrado",
    });

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

    const fechaStr = fecha || new Date().toISOString().split("T")[0];
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

    const asignado = parseFloat(distribucion.kilosAsignados);
    const vendido = parseFloat(distribucion.kilosVendidos);
    const disponible = asignado - vendido;

    return {
      disponible: Math.max(0, disponible),
      asignado,
      vendido,
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

    // Solo admin puede eliminar
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo admin puede eliminar distribuciones");
    }

    await this.repository.delete(ctx, id);
  }
}
