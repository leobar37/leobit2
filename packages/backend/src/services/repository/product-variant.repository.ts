import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { productVariants, variantInventory, type ProductVariant, type NewProductVariant, type VariantInventory, type NewVariantInventory } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export interface CreateVariantInput {
  productId: string;
  name: string;
  sku?: string | null;
  unitQuantity: string;
  price: string;
  costPrice?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateVariantInput {
  name?: string;
  sku?: string | null;
  unitQuantity?: string;
  price?: string;
  costPrice?: string;
  sortOrder?: number;
  isActive?: boolean;
  syncStatus?: "pending" | "synced" | "error";
  syncAttempts?: number;
}

export class ProductVariantRepository {
  async findByProduct(
    ctx: RequestContext,
    productId: string,
    filters?: {
      isActive?: boolean;
      includeInactive?: boolean;
    }
  ): Promise<ProductVariant[]> {
    return db.query.productVariants.findMany({
      where: and(
        eq(productVariants.productId, productId),
        filters?.includeInactive ? undefined : 
          filters?.isActive !== undefined ? eq(productVariants.isActive, filters.isActive) : 
          eq(productVariants.isActive, true)
      ),
      orderBy: [productVariants.sortOrder, desc(productVariants.createdAt)],
      with: {
        inventory: true,
      },
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<(ProductVariant & { inventory?: VariantInventory }) | undefined> {
    return db.query.productVariants.findFirst({
      where: eq(productVariants.id, id),
      with: {
        inventory: true,
      },
    });
  }

  async findByIdAndProduct(ctx: RequestContext, id: string, productId: string): Promise<ProductVariant | undefined> {
    return db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, id),
        eq(productVariants.productId, productId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: CreateVariantInput,
    tx?: DbTransaction
  ): Promise<ProductVariant> {
    const dbOrTx = tx || db;
    const [variant] = await dbOrTx
      .insert(productVariants)
      .values({
        ...data,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return variant;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: UpdateVariantInput,
    tx?: DbTransaction
  ): Promise<ProductVariant | undefined> {
    const dbOrTx = tx || db;
    const [variant] = await dbOrTx
      .update(productVariants)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.unitQuantity !== undefined && { unitQuantity: data.unitQuantity }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.syncStatus !== undefined && { syncStatus: data.syncStatus }),
        ...(data.syncAttempts !== undefined && { syncAttempts: data.syncAttempts }),
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, id))
      .returning();

    return variant;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(productVariants)
      .where(eq(productVariants.id, id));
  }

  async countByProduct(ctx: RequestContext, productId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    return result[0]?.count ?? 0;
  }

  async existsByName(ctx: RequestContext, productId: string, name: string, excludeId?: string): Promise<boolean> {
    const conditions = [
      eq(productVariants.productId, productId),
      eq(productVariants.name, name),
    ];

    if (excludeId) {
      conditions.push(sql`${productVariants.id} != ${excludeId}`);
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(productVariants)
      .where(and(...conditions));

    return (result[0]?.count ?? 0) > 0;
  }

  async reorder(ctx: RequestContext, productId: string, variantIds: string[]): Promise<void> {
    for (let i = 0; i < variantIds.length; i++) {
      await db
        .update(productVariants)
        .set({ sortOrder: i })
        .where(and(
          eq(productVariants.id, variantIds[i]),
          eq(productVariants.productId, productId)
        ));
    }
  }

  // Variant Inventory operations
  async getInventory(ctx: RequestContext, variantId: string): Promise<VariantInventory | undefined> {
    return db.query.variantInventory.findFirst({
      where: eq(variantInventory.variantId, variantId),
    });
  }

  async createInventory(
    ctx: RequestContext,
    data: { variantId: string; quantity?: string },
    tx?: DbTransaction
  ): Promise<VariantInventory> {
    const dbOrTx = tx || db;
    const [inventory] = await dbOrTx
      .insert(variantInventory)
      .values({
        variantId: data.variantId,
        quantity: data.quantity ?? "0",
      })
      .returning();

    return inventory;
  }

  async updateInventory(
    ctx: RequestContext,
    variantId: string,
    quantity: string,
    tx?: DbTransaction
  ): Promise<VariantInventory | undefined> {
    const dbOrTx = tx || db;
    const [inventory] = await dbOrTx
      .update(variantInventory)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(eq(variantInventory.variantId, variantId))
      .returning();

    return inventory;
  }

  async adjustInventory(
    ctx: RequestContext,
    variantId: string,
    adjustment: number,
    tx?: DbTransaction
  ): Promise<VariantInventory | undefined> {
    const dbOrTx = tx || db;
    const current = await this.getInventory(ctx, variantId);
    if (!current) return undefined;

    const currentQty = parseFloat(current.quantity);
    const newQty = Math.max(0, currentQty + adjustment);

    return this.updateInventory(ctx, variantId, newQty.toString(), tx);
  }
}
