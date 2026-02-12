import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  distribuciones,
  type Distribucion,
  type NewDistribucion,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class DistribucionRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      fecha?: string;
      vendedorId?: string;
      estado?: "activo" | "cerrado" | "en_ruta";
      limit?: number;
      offset?: number;
    }
  ): Promise<Distribucion[]> {
    const conditions = [
      eq(distribuciones.businessId, ctx.businessId),
      filters?.fecha ? eq(distribuciones.fecha, filters.fecha) : undefined,
      filters?.vendedorId
        ? eq(distribuciones.vendedorId, filters.vendedorId)
        : undefined,
      filters?.estado
        ? eq(distribuciones.estado, filters.estado as "activo" | "cerrado" | "en_ruta")
        : undefined,
    ].filter(Boolean);

    return db.query.distribuciones.findMany({
      where: and(...conditions),
      with: {
        vendedor: {
          with: {
            business: true,
          },
        },
      },
      orderBy: desc(distribuciones.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(
    ctx: RequestContext,
    id: string
  ): Promise<Distribucion | undefined> {
    return db.query.distribuciones.findFirst({
      where: and(
        eq(distribuciones.id, id),
        eq(distribuciones.businessId, ctx.businessId)
      ),
      with: {
        vendedor: {
          with: {
            business: true,
          },
        },
      },
    });
  }

  async findByVendedorAndFecha(
    ctx: RequestContext,
    vendedorId: string,
    fecha: string
  ): Promise<Distribucion | undefined> {
    return db.query.distribuciones.findFirst({
      where: and(
        eq(distribuciones.businessId, ctx.businessId),
        eq(distribuciones.vendedorId, vendedorId),
        eq(distribuciones.fecha, fecha)
      ),
      with: {
        vendedor: {
          with: {
            business: true,
          },
        },
      },
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewDistribucion, "id" | "createdAt" | "businessId">
  ): Promise<Distribucion> {
    const [distribucion] = await db
      .insert(distribuciones)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return distribucion;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<
      Omit<NewDistribucion, "id" | "createdAt" | "businessId" | "vendedorId">
    >
  ): Promise<Distribucion | undefined> {
    const [distribucion] = await db
      .update(distribuciones)
      .set({
        ...(data.puntoVenta !== undefined && {
          puntoVenta: data.puntoVenta,
        }),
        ...(data.kilosAsignados !== undefined && {
          kilosAsignados: data.kilosAsignados,
        }),
        ...(data.kilosVendidos !== undefined && {
          kilosVendidos: data.kilosVendidos,
        }),
        ...(data.montoRecaudado !== undefined && {
          montoRecaudado: data.montoRecaudado,
        }),
        ...(data.fecha !== undefined && { fecha: data.fecha }),
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.syncStatus !== undefined && { syncStatus: data.syncStatus }),
        ...(data.syncAttempts !== undefined && {
          syncAttempts: data.syncAttempts,
        }),
      })
      .where(
        and(eq(distribuciones.id, id), eq(distribuciones.businessId, ctx.businessId))
      )
      .returning();

    return distribucion;
  }

  async updateMetrics(
    ctx: RequestContext,
    id: string,
    kilosVendidos: string,
    montoRecaudado: string
  ): Promise<Distribucion | undefined> {
    const [distribucion] = await db
      .update(distribuciones)
      .set({
        kilosVendidos,
        montoRecaudado,
      })
      .where(
        and(eq(distribuciones.id, id), eq(distribuciones.businessId, ctx.businessId))
      )
      .returning();

    return distribucion;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(distribuciones)
      .where(
        and(eq(distribuciones.id, id), eq(distribuciones.businessId, ctx.businessId))
      );
  }

  async count(
    ctx: RequestContext,
    filters?: { fecha?: string; estado?: "activo" | "cerrado" | "en_ruta" }
  ): Promise<number> {
    const conditions = [
      eq(distribuciones.businessId, ctx.businessId),
      filters?.fecha ? eq(distribuciones.fecha, filters.fecha) : undefined,
      filters?.estado
        ? eq(distribuciones.estado, filters.estado)
        : undefined,
    ].filter(Boolean);

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(distribuciones)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  async existsForVendedorAndFecha(
    ctx: RequestContext,
    vendedorId: string,
    fecha: string
  ): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(distribuciones)
      .where(
        and(
          eq(distribuciones.businessId, ctx.businessId),
          eq(distribuciones.vendedorId, vendedorId),
          eq(distribuciones.fecha, fecha)
        )
      );

    return (result[0]?.count ?? 0) > 0;
  }
}
