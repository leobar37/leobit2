/**
 * Distribucion Service
 * Local-first distribucion entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { distribuciones, type Distribucion } from "~/engine/schema";
import { eq, and, desc } from "drizzle-orm";

/** Input for creating a new distribucion */
export interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  fecha?: string;
  modo?: "estricto" | "acumulativo" | "libre";
  groupId?: string;
  items: Array<{
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
      fecha,
      estado: "activo",
      modo: input.modo || "estricto",
      syncStatus: "pending",
      syncAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert into local database
    await this.db.insert(distribuciones).values(distribucion);

    // Queue for sync to server
    await this.queueSync("create", id, {
      vendedorId: input.vendedorId,
      puntoVenta: input.puntoVenta,
      puntoVentaId: input.puntoVentaId,
      fecha,
      modo: input.modo || "estricto",
      groupId: input.groupId,
      items: input.items || [],
    });

    return distribucion;
  }
}

export type { Distribucion };
