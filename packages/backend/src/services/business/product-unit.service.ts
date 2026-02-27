import type { ProductUnitRepository } from "../repository/product-unit.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { ProductUnit } from "../../db/schema";

const UNITS_CONSTRAINTS = {
  maxPerProduct: 10,
  maxNameLength: 50,
  maxDisplayNameLength: 100,
  minBaseUnitQuantity: 0.001,
  maxBaseUnitQuantity: 9999.999,
} as const;

export class ProductUnitService {
  constructor(private repository: ProductUnitRepository) {}

  async getUnitsByProduct(
    ctx: RequestContext,
    productId: string,
    filters?: {
      isActive?: boolean;
      includeInactive?: boolean;
    }
  ): Promise<ProductUnit[]> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver unidades");
    }

    return this.repository.findByProduct(ctx, productId, filters);
  }

  async getUnit(ctx: RequestContext, id: string): Promise<ProductUnit> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver unidades");
    }

    const unit = await this.repository.findById(ctx, id);
    if (!unit) {
      throw new NotFoundError("Unidad");
    }

    return unit;
  }

  async createUnit(
    ctx: RequestContext,
    data: {
      productId: string;
      variantId: string;
      name: string;
      displayName: string;
      baseUnitQuantity: number;
      isActive?: boolean;
    }
  ): Promise<ProductUnit> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para crear unidades");
    }

    this.validateUnitData(data);

    const currentCount = await this.repository.countByProduct(
      ctx,
      data.productId
    );
    if (currentCount >= UNITS_CONSTRAINTS.maxPerProduct) {
      throw new ValidationError(
        `No se pueden crear más de ${UNITS_CONSTRAINTS.maxPerProduct} unidades por producto`
      );
    }

    const nameExists = await this.repository.existsByName(
      ctx,
      data.productId,
      data.name
    );
    if (nameExists) {
      throw new ValidationError(
        `Ya existe una unidad con el nombre "${data.name}"`
      );
    }

    const unit = await this.repository.create(ctx, {
      productId: data.productId,
      variantId: data.variantId,
      name: data.name,
      displayName: data.displayName,
      baseUnitQuantity: data.baseUnitQuantity.toString(),
      isActive: data.isActive ?? true,
      sortOrder: currentCount,
    });

    return unit;
  }

  async updateUnit(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      displayName?: string;
      baseUnitQuantity?: number;
      isActive?: boolean;
    }
  ): Promise<ProductUnit> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para editar unidades");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Unidad");
    }

    if (data.name !== undefined && data.name !== existing.name) {
      const nameExists = await this.repository.existsByName(
        ctx,
        existing.productId,
        data.name,
        id
      );
      if (nameExists) {
        throw new ValidationError(
          `Ya existe una unidad con el nombre "${data.name}"`
        );
      }
    }

    if (data.baseUnitQuantity !== undefined) {
      this.validateUnitData({
        ...existing,
        baseUnitQuantity: data.baseUnitQuantity,
        displayName: data.displayName ?? existing.displayName,
        name: data.name ?? existing.name,
        productId: existing.productId,
        variantId: existing.variantId,
      });
    }

    const updated = await this.repository.update(ctx, id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.baseUnitQuantity !== undefined && {
        baseUnitQuantity: data.baseUnitQuantity.toString(),
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    if (!updated) {
      throw new NotFoundError("Unidad");
    }

    return updated;
  }

  async deactivateUnit(ctx: RequestContext, id: string): Promise<ProductUnit> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para desactivar unidades");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Unidad");
    }

    const updated = await this.repository.deactivate(ctx, id);
    if (!updated) {
      throw new NotFoundError("Unidad");
    }

    return updated;
  }

  async reorderUnits(
    ctx: RequestContext,
    productId: string,
    unitIds: string[]
  ): Promise<void> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para reordenar unidades");
    }

    if (unitIds.length === 0) return;

    const existingUnits = await this.repository.findByProduct(ctx, productId, {
      includeInactive: true,
    });
    const existingIds = new Set(existingUnits.map((u) => u.id));

    for (const id of unitIds) {
      if (!existingIds.has(id)) {
        throw new ValidationError(
          `La unidad ${id} no pertenece a este producto`
        );
      }
    }

    await this.repository.reorder(ctx, productId, unitIds);
  }

  private validateUnitData(data: {
    name: string;
    displayName: string;
    baseUnitQuantity: number;
    productId: string;
    variantId: string;
  }): void {
    if (!data.name || data.name.length < 1) {
      throw new ValidationError("El nombre es requerido");
    }

    if (data.name.length > UNITS_CONSTRAINTS.maxNameLength) {
      throw new ValidationError(
        `El nombre no puede tener más de ${UNITS_CONSTRAINTS.maxNameLength} caracteres`
      );
    }

    if (!data.displayName || data.displayName.length < 1) {
      throw new ValidationError("El nombre de visualización es requerido");
    }

    if (
      data.displayName.length > UNITS_CONSTRAINTS.maxDisplayNameLength
    ) {
      throw new ValidationError(
        `El nombre de visualización no puede tener más de ${UNITS_CONSTRAINTS.maxDisplayNameLength} caracteres`
      );
    }

    if (
      data.baseUnitQuantity < UNITS_CONSTRAINTS.minBaseUnitQuantity
    ) {
      throw new ValidationError(
        `La cantidad debe ser al menos ${UNITS_CONSTRAINTS.minBaseUnitQuantity}`
      );
    }

    if (
      data.baseUnitQuantity > UNITS_CONSTRAINTS.maxBaseUnitQuantity
    ) {
      throw new ValidationError(
        `La cantidad no puede ser mayor a ${UNITS_CONSTRAINTS.maxBaseUnitQuantity}`
      );
    }
  }
}
