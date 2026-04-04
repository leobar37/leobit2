/**
 * Distribucion Service
 * Local-first distribucion entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { distribuciones, distribucionItems, type Distribucion } from "~/engine/schema";
import { eq, and, desc } from "drizzle-orm";
import { mapToCamelCase } from "../mappers/entity-mapper";

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

/** Input for creating a new distribucion */
export interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  notaCreacion?: string;
  fecha?: string;
  groupId?: string;
  items?: Array<{
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }>;
}

/**
 * Distribucion Service
 * Provides CRUD operations for distribuciones with local-first approach
 * and automatic sync to server
 */
export class DistribucionService extends BaseService {
  private static readonly ENTITY_TYPE: EntityType = "distribuciones";
  private static readonly ID_PREFIX = "dist";

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  getEntityType(): EntityType {
    return DistribucionService.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return DistribucionService.ID_PREFIX;
  }

  /**
   * Find a distribucion by ID
   */
  async findById(id: string): Promise<Distribucion | null> {
    const result = await this.db
      .select()
      .from(distribuciones)
      .where(eq(distribuciones.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0] as Distribucion;
  }

  /**
   * Find all distribuciones for the current business
   */
  async findByBusiness(filters?: {
    fecha?: string;
    vendedorId?: string;
    estado?: "activo" | "cerrado" | "en_ruta";
  }): Promise<Distribucion[]> {
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
   * Create a new distribucion
   * Inserts into local PGlite and queues for sync
   */
  async create(input: CreateDistribucionInput): Promise<Distribucion> {
    const id = await this.generateId();
    const fecha = input.fecha || new Date().toISOString().split("T")[0];

    const distribucion: Distribucion = {
      id,
      businessId: this.businessId,
      vendedorId: input.vendedorId,
      puntoVenta: input.puntoVenta,
      puntoVentaId: input.puntoVentaId || null,
      montoRecaudado: "0.00",
      notaCreacion: input.notaCreacion || null,
      notaCierre: null,
      fecha,
      estado: "activo",
      modo: "libre",
      syncStatus: "pending",
      syncAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Start transaction for atomic operation
    await this.pg.exec("BEGIN");

    try {
      // Insert distribucion
      await this.db.insert(distribuciones).values(distribucion);

      // Insert items if provided
      const itemIds: string[] = [];
      if (input.items && input.items.length > 0) {
        for (const item of input.items) {
          const itemId = await this.generateId();
          itemIds.push(itemId);

          await this.db.insert(distribucionItems).values({
            businessId: this.businessId,
            distribucionId: id,
            variantId: item.variantId,
            cantidadAsignada: item.cantidadAsignada.toString(),
            unidad: item.unidad,
          });
        }
      }

      await this.pg.exec("COMMIT");

      // Queue for sync to server
      await this.queueSync("create", id, {
        vendedorId: input.vendedorId,
        puntoVenta: input.puntoVenta,
        puntoVentaId: input.puntoVentaId,
        notaCreacion: input.notaCreacion,
        fecha,
        groupId: input.groupId,
        items: input.items || [],
      });

      return distribucion;
    } catch (error) {
      await this.pg.exec("ROLLBACK");
      throw error;
    }
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
        cantidadAsignada: mapped.cantidadAsignada as string,
        cantidadVendida: mapped.cantidadVendida as string | null,
        unidad: mapped.unidad as string,
        productName: mapped.productName as string | undefined,
        variantName: mapped.variantName as string | undefined,
      };
    });
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

    const result = await this.db.insert(distribucionItems).values({
      businessId: this.businessId,
      distribucionId,
      variantId: item.variantId,
      cantidadAsignada: item.cantidadAsignada.toString(),
      unidad: item.unidad,
    }).returning({ id: distribucionItems.id });

    const itemId = result[0]?.id;

    // Queue sync for the new item
    await this.queueSync(
      "create",
      itemId!,
      {
        distribucionId,
        variantId: item.variantId,
        cantidadAsignada: item.cantidadAsignada,
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

    return mapToCamelCase(itemResult.rows[0]) as unknown as DistribucionItem;
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
      params.push(data.cantidadAsignada.toString());
      paramIndex++;
    }

    if (data.cantidadVendida !== undefined) {
      updates.push(`cantidad_vendida = $${paramIndex}`);
      params.push(data.cantidadVendida.toString());
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

    // Queue sync for the updated item
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

    return mapToCamelCase(updatedResult.rows[0]) as unknown as DistribucionItem;
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

    // Queue sync for the deleted item
    await this.queueSync(
      "delete",
      itemId,
      { distribucionId },
      undefined,
      "distribucion_items"
    );
  }
}

export type { Distribucion };
