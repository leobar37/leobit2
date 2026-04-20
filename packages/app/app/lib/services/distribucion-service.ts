/**
 * Distribucion Service
 * Local-first service for distribucion entity with automatic sync integration
 * Extends generated DistribucionesService to preserve atomic items operations
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and, desc } from "drizzle-orm";
import {
  DistribucionesService,
  type CreateDistribucionesInput,
  type UpdateDistribucionesInput,
} from "~/lib/sync/generated/services";
import { SyncService } from "../sync/sync-service";
import { distribuciones, distribucionItems, type Distribucion } from "@avileo/shared";
import { mapToCamelCase } from "../mappers/entity-mapper";

// Re-export Distribucion for backward compatibility
export { type Distribucion } from "@avileo/shared";

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
 * Filters for finding distribuciones
 */
export interface FindDistribucionesFilters {
  fecha?: string;
  vendedorId?: string;
  estado?: "activo" | "cerrado" | "en_ruta";
}

/**
 * Distribucion Service
 * Extends generated DistribucionesService for local-first operations with atomic items support
 * Uses FK references (distribucionId in payload) instead of syncGroupId
 */
export class DistribucionService extends DistribucionesService {
  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  /**
   * Find all distribuciones for the current business with optional filters
   * Overrides parent to add filtering support
   */
  async findByBusiness(filters?: FindDistribucionesFilters): Promise<Distribucion[]> {
    const conditions = [eq(distribuciones.businessId, this.businessId)];

    if (filters?.fecha) {
      conditions.push(eq(distribuciones.fecha, filters.fecha));
    }

    if (filters?.vendedorId) {
      conditions.push(eq(distribuciones.vendedorId, filters.vendedorId));
    }

    if (filters?.estado) {
      conditions.push(eq(distribuciones.estado, filters.estado));
    }

    const result = await this.db
      .select()
      .from(distribuciones)
      .where(and(...conditions))
      .orderBy(desc(distribuciones.fecha), desc(distribuciones.createdAt));

    return result as Distribucion[];
  }

  /**
   * Create a new distribucion with items atomically
   * Uses FK reference (distribucionId) in item payload instead of syncGroupId
   */
  async createWithItems(input: CreateDistribucionInput): Promise<Distribucion> {
    const id = this.generateId();
    const now = this.now();
    const fecha = input.fecha || new Date().toISOString().split("T")[0];

    // Insert distribucion using raw query for atomic operation
    await this.pg.query(
      `INSERT INTO distribuciones (
        id, business_id, vendedor_id, punto_venta, punto_venta_id,
        monto_recaudado, nota_creacion, nota_cierre, fecha, estado, modo,
        sync_status, sync_attempts, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        this.businessId,
        input.vendedorId,
        input.puntoVenta,
        input.puntoVentaId ?? null,
        "0.00",
        input.notaCreacion ?? null,
        null,
        fecha,
        "activo",
        "libre",
        "pending",
        0,
        now,
        now,
      ]
    );

    // Queue sync for the distribucion (parent before children)
    await this.queueSync("create", id, {
      vendedorId: input.vendedorId,
      puntoVenta: input.puntoVenta,
      puntoVentaId: input.puntoVentaId,
      notaCreacion: input.notaCreacion,
      fecha,
      estado: "activo",
    });

    // Insert and queue items with FK reference (distribucionId in payload, NOT syncGroupId)
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const itemId = this.generateId();

        await this.pg.query(
          `INSERT INTO distribucion_items (
            id, business_id, distribucion_id, variant_id,
            cantidad_asignada, cantidad_vendida, unidad,
            sync_status, sync_attempts, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            itemId,
            this.businessId,
            id,
            item.variantId,
            this.normalizeWeightRequired(item.cantidadAsignada),
            "0",
            item.unidad,
            "pending",
            0,
            now,
            now,
          ]
        );

        // Queue item sync with FK reference (distribucionId in payload)
        await this.queueSync("create", itemId, {
          distribucionId: id,
          variantId: item.variantId,
          cantidadAsignada: item.cantidadAsignada,
          cantidadVendida: 0,
          unidad: item.unidad,
        }, undefined, "distribucion_items");
      }
    }

    // Return the created distribucion
    const result = await this.pg.query<Distribucion>(
      "SELECT * FROM distribuciones WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  /**
   * Override create to call createWithItems internally for atomic operations
   */
  async create(input: CreateDistribucionesInput): Promise<Distribucion> {
    // Delegate to createWithItems for atomic operations with items
    return this.createWithItems({
      vendedorId: input.vendedorId,
      puntoVenta: input.puntoVenta,
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
      .update(distribuciones)
      .set(updateData)
      .where(and(eq(distribuciones.id, id), eq(distribuciones.businessId, this.businessId)));

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
    const result = await this.pg.query<Record<string, unknown>>(
      `SELECT
        di.id,
        di.distribucion_id as "distribucionId",
        di.variant_id as "variantId",
        di.cantidad_asignada as "cantidadAsignada",
        di.cantidad_vendida as "cantidadVendida",
        di.unidad,
        p.name as "productName",
        pv.name as "variantName"
      FROM distribucion_items di
      JOIN product_variants pv ON di.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE di.distribucion_id = $1 AND di.business_id = $2`,
      [distribucionId, this.businessId]
    );

    return result.rows.map((row) => {
      const mapped = mapToCamelCase(row) as Record<string, unknown>;
      return {
        id: mapped.id as string,
        distribucionId: mapped.distribucionId as string,
        variantId: mapped.variantId as string,
        cantidadAsignada: this.normalizeWeightRequired(mapped.cantidadAsignada as string | number),
        cantidadVendida: this.normalizeWeight(mapped.cantidadVendida as string | number | null),
        unidad: mapped.unidad as string,
        productName: mapped.productName as string | undefined,
        variantName: mapped.variantName as string | undefined,
      };
    });
  }

  /**
   * Add an item to an existing distribucion
   * Uses FK reference (distribucionId in payload) instead of syncGroupId
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
      throw new Error("Can only add items to active or en_ruta distribuciones");
    }

    // Check for existing item with same variant
    const existingResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM distribucion_items WHERE distribucion_id = $1 AND variant_id = $2 AND business_id = $3`,
      [distribucionId, item.variantId, this.businessId]
    );

    if (existingResult.rows.length > 0) {
      throw new Error("El producto ya está en la distribución");
    }

    const now = this.now();
    const itemId = this.generateId();

    await this.pg.query(
      `INSERT INTO distribucion_items (
        id, business_id, distribucion_id, variant_id,
        cantidad_asignada, cantidad_vendida, unidad,
        sync_status, sync_attempts, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        itemId,
        this.businessId,
        distribucionId,
        item.variantId,
        this.normalizeWeightRequired(item.cantidadAsignada),
        "0",
        item.unidad,
        "pending",
        0,
        now,
        now,
      ]
    );

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
      undefined,
      "distribucion_items"
    );

    // Return the created item
    const itemResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM distribucion_items WHERE id = $1`,
      [itemId]
    );

    const mappedItem = mapToCamelCase(itemResult.rows[0]) as unknown as DistribucionItem;
    return {
      ...mappedItem,
      cantidadAsignada: this.normalizeWeightRequired(mappedItem.cantidadAsignada),
      cantidadVendida: this.normalizeWeight(mappedItem.cantidadVendida),
    };
  }

  /**
   * Update an item in a distribucion
   * Uses FK reference (distribucionId in payload) instead of syncGroupId
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
      throw new Error("Can only update items in active or en_ruta distribuciones");
    }

    // Get existing item
    const itemResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM distribucion_items WHERE id = $1 AND distribucion_id = $2`,
      [itemId, distribucionId]
    );

    if (itemResult.rows.length === 0) {
      throw new Error("Item not found in distribucion");
    }

    const existingItem = mapToCamelCase(itemResult.rows[0]) as unknown as DistribucionItem;

    // Build update fields
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (data.cantidadAsignada !== undefined) {
      updates.push(`cantidad_asignada = $${paramIndex}`);
      params.push(this.normalizeWeightRequired(data.cantidadAsignada));
      paramIndex++;
    }

    if (data.cantidadVendida !== undefined) {
      updates.push(`cantidad_vendida = $${paramIndex}`);
      params.push(this.normalizeWeight(data.cantidadVendida));
      paramIndex++;
    }

    if (updates.length === 0) {
      return existingItem;
    }

    params.push(itemId);

    await this.pg.query(
      `UPDATE distribucion_items SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

    // Queue sync for the updated item with FK reference
    await this.queueSync(
      "update",
      itemId,
      {
        distribucionId,
        cantidadAsignada: data.cantidadAsignada,
        cantidadVendida: data.cantidadVendida,
      },
      undefined,
      "distribucion_items"
    );

    // Return updated item
    const updatedResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM distribucion_items WHERE id = $1`,
      [itemId]
    );

    const mappedItem = mapToCamelCase(updatedResult.rows[0]) as unknown as DistribucionItem;
    return {
      ...mappedItem,
      cantidadAsignada: this.normalizeWeightRequired(mappedItem.cantidadAsignada),
      cantidadVendida: this.normalizeWeight(mappedItem.cantidadVendida),
    };
  }

  /**
   * Remove an item from a distribucion
   * Uses FK reference (distribucionId in payload) instead of syncGroupId
   */
  async removeItem(distribucionId: string, itemId: string): Promise<void> {
    const distribucion = await this.findById(distribucionId);

    if (!distribucion) {
      throw new Error("Distribucion not found");
    }

    if (distribucion.estado !== "activo" && distribucion.estado !== "en_ruta") {
      throw new Error("Can only remove items from active or en_ruta distribuciones");
    }

    // Verify item exists
    const itemResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM distribucion_items WHERE id = $1 AND distribucion_id = $2`,
      [itemId, distribucionId]
    );

    if (itemResult.rows.length === 0) {
      throw new Error("Item not found in distribucion");
    }

    // Delete the item
    await this.db.delete(distribucionItems).where(eq(distribucionItems.id, itemId));

    // Queue sync for the deleted item with FK reference
    await this.queueSync(
      "delete",
      itemId,
      { distribucionId },
      undefined,
      "distribucion_items"
    );
  }
}
