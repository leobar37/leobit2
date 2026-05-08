/**
 * Punto de Venta Repository
 * Data access layer for sales points
 */
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { puntosVenta, type PuntoVenta, type NewPuntoVenta } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class PuntoVentaRepository {
  async findAll(ctx: RequestContext): Promise<PuntoVenta[]> {
    return db.query.puntosVenta.findMany({
      where: eq(puntosVenta.businessId, ctx.businessId),
      orderBy: [asc(puntosVenta.sortOrder), asc(puntosVenta.name)],
    });
  }

  async findAllActive(ctx: RequestContext): Promise<PuntoVenta[]> {
    return db.query.puntosVenta.findMany({
      where: and(
        eq(puntosVenta.businessId, ctx.businessId),
        eq(puntosVenta.isActive, true)
      ),
      orderBy: [asc(puntosVenta.sortOrder), asc(puntosVenta.name)],
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<PuntoVenta | undefined> {
    return db.query.puntosVenta.findFirst({
      where: and(
        eq(puntosVenta.id, id),
        eq(puntosVenta.businessId, ctx.businessId)
      ),
    });
  }

  async findByName(ctx: RequestContext, name: string): Promise<PuntoVenta | undefined> {
    return db.query.puntosVenta.findFirst({
      where: and(
        eq(puntosVenta.name, name),
        eq(puntosVenta.businessId, ctx.businessId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewPuntoVenta, "businessId" | "id" | "createdAt" | "updatedAt">,
    tx?: DbTransaction
  ): Promise<PuntoVenta> {
    const dbOrTx = tx || db;
    const [puntoVenta] = await dbOrTx
      .insert(puntosVenta)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return puntoVenta;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewPuntoVenta, "businessId" | "id" | "createdAt" | "updatedAt">>,
    tx?: DbTransaction
  ): Promise<PuntoVenta | undefined> {
    const dbOrTx = tx || db;
    const [puntoVenta] = await dbOrTx
      .update(puntosVenta)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(puntosVenta.id, id),
        eq(puntosVenta.businessId, ctx.businessId)
      ))
      .returning();

    return puntoVenta;
  }

  async toggleActive(ctx: RequestContext, id: string): Promise<PuntoVenta | undefined> {
    const existing = await this.findById(ctx, id);
    if (!existing) return undefined;

    return this.update(ctx, id, { isActive: !existing.isActive });
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(puntosVenta)
      .where(and(
        eq(puntosVenta.id, id),
        eq(puntosVenta.businessId, ctx.businessId)
      ));
  }

  async countByBusiness(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(puntosVenta)
      .where(eq(puntosVenta.businessId, ctx.businessId));

    return result[0]?.count ?? 0;
  }
}
