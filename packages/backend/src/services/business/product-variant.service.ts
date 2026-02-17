import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { ProductVariant, VariantInventory } from "../../db/schema";

const VARIANTS_CONSTRAINTS = {
  maxPerProduct: 10,
  maxNameLength: 50,
  maxSkuLength: 50,
  maxPrice: 9999.99,
  minUnitQuantity: 0.001,
  maxUnitQuantity: 9999.999,
} as const;

export class ProductVariantService {
  constructor(private repository: ProductVariantRepository) {}

  async getVariantsByProduct(
    ctx: RequestContext,
    productId: string,
    filters?: {
      isActive?: boolean;
      includeInactive?: boolean;
    }
  ): Promise<(ProductVariant & { inventory?: VariantInventory })[]> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver variantes");
    }

    return this.repository.findByProduct(ctx, productId, filters);
  }

  async getVariant(
    ctx: RequestContext,
    id: string
  ): Promise<ProductVariant & { inventory?: VariantInventory }> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver variantes");
    }

    const variant = await this.repository.findById(ctx, id);
    if (!variant) {
      throw new NotFoundError("Variante");
    }

    return variant;
  }

  async createVariant(
    ctx: RequestContext,
    data: {
      productId: string;
      name: string;
      sku?: string | null;
      unitQuantity: number;
      price: number;
      isActive?: boolean;
    }
  ): Promise<ProductVariant & { inventory: VariantInventory }> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para crear variantes");
    }

    this.validateVariantData(data);

    const currentCount = await this.repository.countByProduct(ctx, data.productId);
    if (currentCount >= VARIANTS_CONSTRAINTS.maxPerProduct) {
      throw new ValidationError(
        `No se pueden crear más de ${VARIANTS_CONSTRAINTS.maxPerProduct} variantes por producto`
      );
    }

    const nameExists = await this.repository.existsByName(ctx, data.productId, data.name);
    if (nameExists) {
      throw new ValidationError(`Ya existe una variante con el nombre "${data.name}"`);
    }

    const variant = await this.repository.create(ctx, {
      productId: data.productId,
      name: data.name,
      sku: data.sku ?? null,
      unitQuantity: data.unitQuantity.toString(),
      price: data.price.toString(),
      isActive: data.isActive ?? true,
      sortOrder: currentCount,
    });

    const inventory = await this.repository.createInventory(ctx, {
      variantId: variant.id,
      quantity: "0",
    });

    return { ...variant, inventory };
  }

  async updateVariant(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      sku?: string | null;
      unitQuantity?: number;
      price?: number;
      isActive?: boolean;
    }
  ): Promise<ProductVariant> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para editar variantes");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Variante");
    }

    if (data.name !== undefined && data.name !== existing.name) {
      const nameExists = await this.repository.existsByName(ctx, existing.productId, data.name, id);
      if (nameExists) {
        throw new ValidationError(`Ya existe una variante con el nombre "${data.name}"`);
      }
    }

    if (data.unitQuantity !== undefined || data.price !== undefined) {
      this.validateVariantData({
        ...existing,
        unitQuantity: data.unitQuantity ?? parseFloat(existing.unitQuantity),
        price: data.price ?? parseFloat(existing.price),
      });
    }

    const updated = await this.repository.update(ctx, id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.unitQuantity !== undefined && { unitQuantity: data.unitQuantity.toString() }),
      ...(data.price !== undefined && { price: data.price.toString() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    if (!updated) {
      throw new NotFoundError("Variante");
    }

    return updated;
  }

  async deactivateVariant(ctx: RequestContext, id: string): Promise<ProductVariant> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para desactivar variantes");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Variante");
    }

    const updated = await this.repository.update(ctx, id, { isActive: false });
    if (!updated) {
      throw new NotFoundError("Variante");
    }

    return updated;
  }

  async reorderVariants(
    ctx: RequestContext,
    productId: string,
    variantIds: string[]
  ): Promise<void> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para reordenar variantes");
    }

    if (variantIds.length === 0) return;

    const existingVariants = await this.repository.findByProduct(ctx, productId, {
      includeInactive: true,
    });
    const existingIds = new Set(existingVariants.map((v) => v.id));

    for (const id of variantIds) {
      if (!existingIds.has(id)) {
        throw new ValidationError(`La variante ${id} no pertenece a este producto`);
      }
    }

    await this.repository.reorder(ctx, productId, variantIds);
  }

  async getVariantInventory(ctx: RequestContext, variantId: string): Promise<VariantInventory> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver inventario");
    }

    const inventory = await this.repository.getInventory(ctx, variantId);
    if (!inventory) {
      throw new NotFoundError("Inventario de variante");
    }

    return inventory;
  }

  async updateVariantInventory(
    ctx: RequestContext,
    variantId: string,
    quantity: number
  ): Promise<VariantInventory> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para actualizar inventario");
    }

    if (quantity < 0) {
      throw new ValidationError("La cantidad no puede ser negativa");
    }

    const existing = await this.repository.findById(ctx, variantId);
    if (!existing) {
      throw new NotFoundError("Variante");
    }

    const inventory = await this.repository.updateInventory(ctx, variantId, quantity.toString());
    if (!inventory) {
      throw new NotFoundError("Inventario de variante");
    }

    return inventory;
  }

  async adjustVariantInventory(
    ctx: RequestContext,
    variantId: string,
    adjustment: number
  ): Promise<VariantInventory> {
    if (!ctx.hasPermission("products.manage") && !ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para ajustar inventario");
    }

    const existing = await this.repository.findById(ctx, variantId);
    if (!existing) {
      throw new NotFoundError("Variante");
    }

    const inventory = await this.repository.adjustInventory(ctx, variantId, adjustment);
    if (!inventory) {
      throw new NotFoundError("Inventario de variante");
    }

    return inventory;
  }

  private validateVariantData(data: {
    name: string;
    unitQuantity: number;
    price: number;
    sku?: string | null;
  }): void {
    if (!data.name || data.name.length < 1) {
      throw new ValidationError("El nombre es requerido");
    }

    if (data.name.length > VARIANTS_CONSTRAINTS.maxNameLength) {
      throw new ValidationError(
        `El nombre no puede tener más de ${VARIANTS_CONSTRAINTS.maxNameLength} caracteres`
      );
    }

    if (data.sku && data.sku.length > VARIANTS_CONSTRAINTS.maxSkuLength) {
      throw new ValidationError(
        `El SKU no puede tener más de ${VARIANTS_CONSTRAINTS.maxSkuLength} caracteres`
      );
    }

    if (data.unitQuantity < VARIANTS_CONSTRAINTS.minUnitQuantity) {
      throw new ValidationError(
        `La cantidad unitaria debe ser al menos ${VARIANTS_CONSTRAINTS.minUnitQuantity}`
      );
    }

    if (data.unitQuantity > VARIANTS_CONSTRAINTS.maxUnitQuantity) {
      throw new ValidationError(
        `La cantidad unitaria no puede ser mayor a ${VARIANTS_CONSTRAINTS.maxUnitQuantity}`
      );
    }

    if (data.price < 0) {
      throw new ValidationError("El precio no puede ser negativo");
    }

    if (data.price > VARIANTS_CONSTRAINTS.maxPrice) {
      throw new ValidationError(
        `El precio no puede ser mayor a ${VARIANTS_CONSTRAINTS.maxPrice}`
      );
    }
  }
}
