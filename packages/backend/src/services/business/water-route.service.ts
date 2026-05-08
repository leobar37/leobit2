import type { WaterRouteRepository } from "../repository/water-route.repository";
import type { RequestContext } from "../../context/request-context";
import { ForbiddenError, NotFoundError, ValidationError } from "../../errors";

export class WaterRouteService {
  constructor(private repository: WaterRouteRepository) {}

  async getRoutes(ctx: RequestContext) {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver rutas");
    }
    this.assertWaterMode(ctx);
    return this.repository.findMany(ctx);
  }

  async createRoute(ctx: RequestContext, data: { name: string; zone?: string | null; description?: string | null }) {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para crear rutas");
    }
    this.assertWaterMode(ctx);
    if (!data.name?.trim() || data.name.trim().length < 2) {
      throw new ValidationError("El nombre de la ruta debe tener al menos 2 caracteres");
    }
    return this.repository.create(ctx, {
      name: data.name.trim(),
      zone: data.zone?.trim() || null,
      description: data.description?.trim() || null,
    });
  }

  async updateRoute(ctx: RequestContext, id: string, data: { name?: string; zone?: string | null; description?: string | null; isActive?: boolean }) {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para editar rutas");
    }
    this.assertWaterMode(ctx);
    const updated = await this.repository.update(ctx, id, {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.zone !== undefined && { zone: data.zone?.trim() || null }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive ? 1 : 0 }),
    });
    if (!updated) throw new NotFoundError("Ruta");
    return updated;
  }

  private assertWaterMode(ctx: RequestContext) {
    if (ctx.businessMode !== "agua") {
      throw new ValidationError("Las rutas de agua solo aplican a negocios de agua");
    }
  }
}
