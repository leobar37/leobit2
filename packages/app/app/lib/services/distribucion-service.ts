/**
 * Distribucion Service
 * Local-first service for distribucion entity with automatic sync integration
 * Extends generated DistribucionesService to preserve atomic items operations
 */

import type { SyncClientEngineLike } from "./base-service";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  DistribucionesService,
  type CreateDistribucionesInput,
  type UpdateDistribucionesInput,
} from "~/lib/sync/generated/services";
import type { Distribuciones as Distribucion } from "~/lib/sync/generated/schema";
import { mapToCamelCase } from "../mappers/entity-mapper";

export type { Distribucion };

/**
 * Distribucion item from database
 */
export interface DistribucionItem {
  id: string;
  distribucionId: string;
  variantId: string;
  cantidadAsignada: string;
  cantidadVendida: string | null;
  unidad: string;
}

/**
 * Distribucion item enriched with product and variant names
 */
export interface DistribucionItemEnriched extends DistribucionItem {
  productName?: string;
  variantName?: string;
}

/**
 * Distribucion with its items
 */
export type DistribucionWithItems = Distribucion & { items: DistribucionItemEnriched[] };

/**
 * Input for creating a distribucion item
 */
export interface CreateDistribucionItemInput {
  variantId: string;
  cantidadAsignada: number;
  unidad: string;
}

/**
 * Input for creating a new distribucion (extends generated input with items)
 */
export interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  notaCreacion?: string;
  fecha?: string;
  items?: Array<{
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }>;
}

/**
 * Filters for finding this.tables.distribuciones
 */
export interface FindDistribucionesFilters {
  fecha?: string;
  vendedorId?: string;
  estado?: "activo" | "cerrado" | "en_ruta";
}

/**
 * Distribucion Service
 * Extends generated DistribucionesService for local-first operations with atomic items support
 */
export class DistribucionService extends DistribucionesService {
  /**
   * Find all this.tables.distribuciones for the current business with optional filters
   * Overrides parent to add filtering support
   */
  async findByBusiness(filters?: FindDistribucionesFilters): Promise<Distribucion[]> {
    const conditions = [eq(this.tables.distribuciones.businessId, this.businessId)];

    if (filters?.fecha) {
      conditions.push(eq(this.tables.distribuciones.fecha, filters.fecha));
    }

    if (filters?.vendedorId) {
      conditions.push(eq(this.tables.distribuciones.vendedorId, filters.vendedorId));
    }

    if (filters?.estado) {
      conditions.push(eq(this.tables.distribuciones.estado, filters.estado));
    }

    const result = await this.db
      .select()
      .from(this.tables.distribuciones)
      .where(and(...conditions))
      .orderBy(desc(this.tables.distribuciones.fecha), desc(this.tables.distribuciones.createdAt));

    return result as Distribucion[];
  }

  /**
   * Create a new distribucion with items atomically
   */
  async createWithItems(input: CreateDistribucionInput): Promise<Distribucion> {
    const id = this.generateId();
    const now = this.now();
    const fecha = input.fecha || new Date().toISOString().split("T")[0];

    // Insert distribucion using Drizzle ORM
    await this.db.insert(this.tables.distribuciones).values({
      id,
      businessId: this.businessId,
      vendedorId: input.vendedorId,
      puntoVenta: input.puntoVenta,
      puntoVentaId: input.puntoVentaId ?? null,
      montoRecaudado: "0.00",
      notaCreacion: input.notaCreacion ?? null,
      notaCierre: null,
      fecha,
      estado: "activo",
      modo: "libre",
      syncStatus: "pending",
      syncAttempts: 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

    // Queue sync for the distribucion (parent before children)
    await this.queueSync("create", id, {
      vendedorId: input.vendedorId,
      puntoVenta: input.puntoVenta,
      puntoVentaId: input.puntoVentaId,
      notaCreacion: input.notaCreacion,
      fecha,
      estado: "activo",
    });

    // Insert and queue items with FK reference
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const itemId = this.generateId();

        await this.db.insert(this.tables.distribucionItems).values({
          id: itemId,
          businessId: this.businessId,
          distribucionId: id,
          variantId: item.variantId,
          cantidadAsignada: this.normalizeWeightRequired(item.cantidadAsignada),
          cantidadVendida: "0",
          unidad: item.unidad,
          syncStatus: "pending",
          syncAttempts: 0,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        });

        // Queue item sync with FK reference (distribucionId in payload)
        await this.queueSync("create", itemId, {
          distribucionId: id,
          variantId: item.variantId,
          cantidadAsignada: item.cantidadAsignada,
          cantidadVendida: 0,
          unidad: item.unidad,
        }, "distribucion_items");
      }
    }

    // Return the created distribucion
    const result = await this.db
      .select()
      .from(this.tables.distribuciones)
      .where(eq(this.tables.distribuciones.id, id))
      .limit(1);
    return result[0];
  }

  /**
   * Override create to call createWithItems internally for atomic operations
   */
  async create(input: CreateDistribucionesInput): Promise<Distribucion> {
    // Delegate to createWithItems for atomic operations with items
    return this.createWithItems({
      vendedorId: input.vendedorId!,
      puntoVenta: input.puntoVenta!,
      puntoVentaId: input.puntoVentaId,
      notaCreacion: input.notaCreacion,
      fecha: input.fecha,
    });
  }

  /**
   * Update a distribucion
   * Overrides parent to use custom sync queue
   */
  async update(id: string, input: UpdateDistribucionesInput): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Distribucion not found: ${id}`);
    }

    const now = this.now();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(now),
      syncStatus: "pending",
    };

    if (input.vendedorId !== undefined) updateData.vendedorId = input.vendedorId;
    if (input.puntoVenta !== undefined) updateData.puntoVenta = input.puntoVenta;
    if (input.puntoVentaId !== undefined) updateData.puntoVentaId = input.puntoVentaId;
    if (input.montoRecaudado !== undefined) updateData.montoRecaudado = input.montoRecaudado;
    if (input.notaCreacion !== undefined) updateData.notaCreacion = input.notaCreacion;
    if (input.notaCierre !== undefined) updateData.notaCierre = input.notaCierre;
    if (input.fecha !== undefined) updateData.fecha = input.fecha;
    if (input.estado !== undefined) updateData.estado = input.estado;
    if (input.closedAt !== undefined) updateData.closedAt = input.closedAt;
    if (input.closedBy !== undefined) updateData.closedBy = input.closedBy;

    await this.db
      .update(this.tables.distribuciones)
      .set(updateData)
      .where(and(eq(this.tables.distribuciones.id, id), eq(this.tables.distribuciones.businessId, this.businessId)));

    // Queue sync
    await this.queueSync("update", id, input as Record<string, unknown>);
  }

  /**
   * Find a distribucion by ID with its items
   */
  async findByIdWithItems(id: string): Promise<DistribucionWithItems | null> {
    const distribucion = await this.findById(id);
    if (!distribucion) return null;

    const items = await this.getItemsWithNames(id);

    return {
      ...distribucion,
      items,
    };
  }

  /**
   * Get items for a distribucion with product and variant names
   */
  async getItemsWithNames(distribucionId: string): Promise<DistribucionItemEnriched[]> {
    const result = await this.db
      .select({
        id: this.tables.distribucionItems.id,
        distribucionId: this.tables.distribucionItems.distribucionId,
        variantId: this.tables.distribucionItems.variantId,
        cantidadAsignada: this.tables.distribucionItems.cantidadAsignada,
        cantidadVendida: this.tables.distribucionItems.cantidadVendida,
        unidad: this.tables.distribucionItems.unidad,
        productName: this.tables.products.name,
        variantName: this.tables.productVariants.name,
      })
      .from(this.tables.distribucionItems)
      .innerJoin(this.tables.productVariants, eq(this.tables.distribucionItems.variantId, this.tables.productVariants.id))
      .innerJoin(this.tables.products, eq(this.tables.productVariants.productId, this.tables.products.id))
      .where(
        and(
          eq(this.tables.distribucionItems.distribucionId, distribucionId),
          eq(this.tables.distribucionItems.businessId, this.businessId)
        )
      );

    return result.map((row) => ({
      id: row.id,
      distribucionId: row.distribucionId,
      variantId: row.variantId,
      cantidadAsignada: this.normalizeWeightRequired(row.cantidadAsignada),
      cantidadVendida: this.normalizeWeight(row.cantidadVendida),
      unidad: row.unidad,
      productName: row.productName ?? undefined,
      variantName: row.variantName ?? undefined,
    }));
  }

  /**
   * Add an item to an existing distribucion
   */
  async addItem(
    distribucionId: string,
    item: CreateDistribucionItemInput
  ): Promise<DistribucionItem> {
    const distribucion = await this.findById(distribucionId);

    if (!distribucion) {
      throw new Error("Distribucion not found");
    }

    if (distribucion.estado !== "activo" && distribucion.estado !== "en_ruta") {
      throw new Error("Can only add items to active or en_ruta this.tables.distribuciones");
    }

    // Check for existing item with same variant
    const existingResult = await this.db
      .select()
      .from(this.tables.distribucionItems)
      .where(
        and(
          eq(this.tables.distribucionItems.distribucionId, distribucionId),
          eq(this.tables.distribucionItems.variantId, item.variantId),
          eq(this.tables.distribucionItems.businessId, this.businessId)
        )
      )
      .limit(1);

    if (existingResult.length > 0) {
      throw new Error("El producto ya está en la distribución");
    }

    const now = this.now();
    const itemId = this.generateId();

    await this.db.insert(this.tables.distribucionItems).values({
      id: itemId,
      businessId: this.businessId,
      distribucionId,
      variantId: item.variantId,
      cantidadAsignada: this.normalizeWeightRequired(item.cantidadAsignada),
      cantidadVendida: "0",
      unidad: item.unidad,
      syncStatus: "pending",
      syncAttempts: 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

    // Queue sync for the new item with FK reference (distribucionId in payload)
    await this.queueSync(
      "create",
      itemId,
      {
        distribucionId,
        variantId: item.variantId,
        cantidadAsignada: item.cantidadAsignada,
        cantidadVendida: 0,
        unidad: item.unidad,
      },
      "distribucion_items"
    );

    // Return the created item
    const itemResult = await this.db
      .select()
      .from(this.tables.distribucionItems)
      .where(eq(this.tables.distribucionItems.id, itemId))
      .limit(1);

    const mappedItem = itemResult[0] as unknown as DistribucionItem;
    return {
      ...mappedItem,
      cantidadAsignada: this.normalizeWeightRequired(mappedItem.cantidadAsignada),
      cantidadVendida: this.normalizeWeight(mappedItem.cantidadVendida),
    };
  }

  /**
   * Update an item in a distribucion
   */
  async updateItem(
    distribucionId: string,
    itemId: string,
    data: {
      cantidadAsignada?: number;
      cantidadVendida?: number;
    }
  ): Promise<DistribucionItem> {
    const distribucion = await this.findById(distribucionId);

    if (!distribucion) {
      throw new Error("Distribucion not found");
    }

    if (distribucion.estado !== "activo" && distribucion.estado !== "en_ruta") {
      throw new Error("Can only update items in active or en_ruta this.tables.distribuciones");
    }

    // Get existing item
    const itemResult = await this.db
      .select()
      .from(this.tables.distribucionItems)
      .where(
        and(
          eq(this.tables.distribucionItems.id, itemId),
          eq(this.tables.distribucionItems.distribucionId, distribucionId)
        )
      )
      .limit(1);

    if (itemResult.length === 0) {
      throw new Error("Item not found in distribucion");
    }

    const existingItem = itemResult[0] as unknown as DistribucionItem;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.cantidadAsignada !== undefined) {
      updateData.cantidadAsignada = this.normalizeWeightRequired(data.cantidadAsignada);
    }

    if (data.cantidadVendida !== undefined) {
      updateData.cantidadVendida = this.normalizeWeight(data.cantidadVendida);
    }

    if (Object.keys(updateData).length === 0) {
      return existingItem;
    }

    await this.db
      .update(this.tables.distribucionItems)
      .set(updateData)
      .where(eq(this.tables.distribucionItems.id, itemId));

    // Queue sync for the updated item with FK reference
    await this.queueSync(
      "update",
      itemId,
      {
        distribucionId,
        cantidadAsignada: data.cantidadAsignada,
        cantidadVendida: data.cantidadVendida,
      },
      "distribucion_items"
    );

    // Return updated item
    const updatedResult = await this.db
      .select()
      .from(this.tables.distribucionItems)
      .where(eq(this.tables.distribucionItems.id, itemId))
      .limit(1);

    const mappedItem = updatedResult[0] as unknown as DistribucionItem;
    return {
      ...mappedItem,
      cantidadAsignada: this.normalizeWeightRequired(mappedItem.cantidadAsignada),
      cantidadVendida: this.normalizeWeight(mappedItem.cantidadVendida),
    };
  }

  /**
   * Remove an item from a distribucion
   */
  async removeItem(distribucionId: string, itemId: string): Promise<void> {
    const distribucion = await this.findById(distribucionId);

    if (!distribucion) {
      throw new Error("Distribucion not found");
    }

    if (distribucion.estado !== "activo" && distribucion.estado !== "en_ruta") {
      throw new Error("Can only remove items from active or en_ruta this.tables.distribuciones");
    }

    // Verify item exists
    const itemResult = await this.db
      .select()
      .from(this.tables.distribucionItems)
      .where(
        and(
          eq(this.tables.distribucionItems.id, itemId),
          eq(this.tables.distribucionItems.distribucionId, distribucionId)
        )
      )
      .limit(1);

    if (itemResult.length === 0) {
      throw new Error("Item not found in distribucion");
    }

    // Delete the item
    await this.db.delete(this.tables.distribucionItems).where(eq(this.tables.distribucionItems.id, itemId));

    // Queue sync for the deleted item with FK reference
    await this.queueSync(
      "delete",
      itemId,
      { distribucionId },
      "distribucion_items"
    );
  }
}
