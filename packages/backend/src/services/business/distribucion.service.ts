import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from "../../errors";
import type { Distribucion } from "../../db/schema";

export class DistribucionService {
  constructor(private repository: DistribucionRepository) {}

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
    if (!ctx.isAdmin() && filters?.vendedorId && filters.vendedorId !== ctx.userId) {
      throw new ForbiddenError("No puede ver distribuciones de otros vendedores");
    }

    // Si es vendedor y no especifica vendedorId, filtrar por su ID
    if (!ctx.isAdmin() && !filters?.vendedorId) {
      return this.repository.findMany(ctx, {
        ...filters,
        vendedorId: ctx.userId,
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
    if (!ctx.isAdmin() && distribucion.vendedorId !== ctx.userId) {
      throw new ForbiddenError("No puede ver esta distribución");
    }

    return distribucion;
  }

  async createDistribucion(
    ctx: RequestContext,
    data: {
      vendedorId: string;
      puntoVenta: string;
      kilosAsignados: number;
      fecha?: string;
    }
  ): Promise<Distribucion> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para crear distribuciones");
    }

    // Validaciones
    if (!data.vendedorId) {
      throw new ValidationError("El vendedor es requerido");
    }

    if (!data.puntoVenta || data.puntoVenta.length < 2) {
      throw new ValidationError("El punto de venta debe tener al menos 2 caracteres");
    }

    if (data.kilosAsignados <= 0) {
      throw new ValidationError("Los kilos asignados deben ser mayores a 0");
    }

    // Verificar que no exista ya una distribución para este vendedor en esta fecha
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

    const distribucion = await this.repository.create(ctx, {
      vendedorId: data.vendedorId,
      puntoVenta: data.puntoVenta,
      kilosAsignados: data.kilosAsignados.toString(),
      kilosVendidos: "0",
      montoRecaudado: "0",
      fecha,
      estado: "activo",
      syncStatus: "pending",
      syncAttempts: 0,
    });

    return distribucion;
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

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Distribución");
    }

    // Admin puede cerrar cualquiera, vendedor solo la suya
    if (!ctx.isAdmin() && existing.vendedorId !== ctx.userId) {
      throw new ForbiddenError("No puede cerrar esta distribución");
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
  ): Promise<Distribucion | null> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver distribuciones");
    }

    // Vendedores solo pueden ver su propia distribución
    if (!ctx.isAdmin() && vendedorId !== ctx.userId) {
      throw new ForbiddenError("No puede ver la distribución de otro vendedor");
    }

    const fechaStr = fecha || new Date().toISOString().split("T")[0];
    const distribucion = await this.repository.findByVendedorAndFecha(
      ctx,
      vendedorId,
      fechaStr
    );

    return distribucion || null;
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
