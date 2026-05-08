import { eq, and, desc, sql, inArray, type SQL } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  distribuciones,
  distribucionItems,
  type Distribucion,
  type NewDistribucion,
  type DistribucionItem,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

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
  async findByVendedorAndFechaActive(
    ctx: RequestContext,
    vendedorId: string,
    fecha: string
  ): Promise<Distribucion | undefined> {
    return db.query.distribuciones.findFirst({
      where: and(
        eq(distribuciones.businessId, ctx.businessId),
        eq(distribuciones.vendedorId, vendedorId),
        eq(distribuciones.fecha, fecha),
        eq(distribuciones.estado, "activo")
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

  async findByIdWithItems(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<(Distribucion & { items: DistribucionItem[] }) | undefined> {
    const executor = tx ?? db;

    return executor.query.distribuciones.findFirst({
      where: and(
        eq(distribuciones.id, id),
        eq(distribuciones.businessId, ctx.businessId)
      ),
      with: {
        items: {
          with: {
            variant: true,
          },
        },
        vendedor: {
          with: {
            business: true,
          },
        },
      },
    }) as Promise<(Distribucion & { items: DistribucionItem[] }) | undefined>;
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewDistribucion, "id" | "createdAt" | "businessId">,
    tx?: DbTransaction
  ): Promise<Distribucion> {
    const dbOrTx = tx || db;

    const [distribucion] = await dbOrTx
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
    >,
    tx?: DbTransaction
  ): Promise<Distribucion | undefined> {
    const dbOrTx = tx || db;

    const [distribucion] = await dbOrTx
      .update(distribuciones)
      .set({
        ...(data.puntoVenta !== undefined && {
          puntoVenta: data.puntoVenta,
        }),
        ...(data.notaCreacion !== undefined && { notaCreacion: data.notaCreacion }),
        ...(data.notaCierre !== undefined && { notaCierre: data.notaCierre }),
        ...(data.montoRecaudado !== undefined && {
          montoRecaudado: data.montoRecaudado,
        }),
        ...(data.fecha !== undefined && { fecha: data.fecha }),
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.closedAt !== undefined && { closedAt: data.closedAt }),
        ...(data.closedBy !== undefined && { closedBy: data.closedBy }),
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
    montoRecaudado: string
  ): Promise<Distribucion | undefined> {
    const [distribucion] = await db
      .update(distribuciones)
      .set({
        montoRecaudado,
      })
      .where(
        and(eq(distribuciones.id, id), eq(distribuciones.businessId, ctx.businessId))
      )
      .returning();

    return distribucion;
  }

  async delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void> {
    const dbOrTx = tx || db;

    await dbOrTx
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
    fecha: string,
    estados?: Array<"activo" | "cerrado" | "en_ruta">
  ): Promise<boolean> {
    const conditions: (SQL<unknown> | undefined)[] = [
      eq(distribuciones.businessId, ctx.businessId),
      eq(distribuciones.vendedorId, vendedorId),
      eq(distribuciones.fecha, fecha),
    ];
    
    if (estados && estados.length > 0) {
      conditions.push(inArray(distribuciones.estado, estados));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(distribuciones)
      .where(and(...conditions.filter(Boolean)));

    return (result[0]?.count ?? 0) > 0;
  }
}
