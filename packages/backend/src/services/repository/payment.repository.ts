import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { abonos, type Abono, type NewAbono } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PaymentRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      clientId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Abono[]> {
    return db.query.abonos.findMany({
      where: and(
        eq(abonos.businessId, ctx.businessId),
        filters?.clientId ? eq(abonos.clientId, filters.clientId) : undefined
      ),
      orderBy: desc(abonos.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<Abono | undefined> {
    return db.query.abonos.findFirst({
      where: and(
        eq(abonos.id, id),
        eq(abonos.businessId, ctx.businessId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewAbono, "businessId" | "sellerId" | "id" | "createdAt">,
    tx?: DbTransaction
  ): Promise<Abono> {
    const executor = tx ?? db;

    const [abono] = await executor
      .insert(abonos)
      .values({
        ...data,
        businessId: ctx.businessId,
        sellerId: ctx.businessUserId,
      })
      .returning();

    return abono;
  }

  async findByReferenceNumber(ctx: RequestContext, referenceNumber: string): Promise<Abono | undefined> {
    return db.query.abonos.findFirst({
      where: and(
        eq(abonos.businessId, ctx.businessId),
        eq(abonos.referenceNumber, referenceNumber)
      ),
    });
  }

  async createInitialPayment(
    ctx: RequestContext,
    data: {
      clientId: string;
      amount: string;
      referenceNumber: string;
    },
    tx?: DbTransaction
  ): Promise<Abono | undefined> {
    const executor = tx ?? db;

    const [abono] = await executor
      .insert(abonos)
      .values({
        clientId: data.clientId,
        businessId: ctx.businessId,
        sellerId: ctx.businessUserId,
        amount: data.amount,
        paymentMethod: "efectivo",
        notes: "Abono inicial registrado en la venta",
        referenceNumber: data.referenceNumber,
      })
      .onConflictDoNothing({ target: abonos.referenceNumber })
      .returning();

    return abono;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(abonos)
      .where(and(
        eq(abonos.id, id),
        eq(abonos.businessId, ctx.businessId)
      ));
  }

  async count(ctx: RequestContext, filters?: { clientId?: string }): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(abonos)
      .where(and(
        eq(abonos.businessId, ctx.businessId),
        filters?.clientId ? eq(abonos.clientId, filters.clientId) : undefined
      ));

    return result[0]?.count ?? 0;
  }

  async getTotalByClient(ctx: RequestContext, clientId: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`coalesce(sum(${abonos.amount}), 0)` })
      .from(abonos)
      .where(and(
        eq(abonos.businessId, ctx.businessId),
        eq(abonos.clientId, clientId)
      ));

    return result[0]?.total ?? 0;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Pick<Abono, "proofImageId" | "referenceNumber">>,
    tx?: DbTransaction
  ): Promise<Abono> {
    const executor = tx ?? db;
    const [abono] = await executor
      .update(abonos)
      .set(data)
      .where(and(
        eq(abonos.id, id),
        eq(abonos.businessId, ctx.businessId)
      ))
      .returning();

    return abono;
  }

  async findBySaleId(ctx: RequestContext, saleId: string): Promise<Abono | undefined> {
    return db.query.abonos.findFirst({
      where: and(
        eq(abonos.businessId, ctx.businessId),
        eq(abonos.relatedSaleId, saleId)
      ),
    });
  }

  async createReversal(
    ctx: RequestContext,
    data: {
      clientId: string;
      amount: string;
      paymentMethod: "saldo" | "efectivo" | "yape" | "plin" | "transferencia";
      referenceNumber?: string;
      notes?: string;
      relatedSaleId: string;
    },
    tx?: DbTransaction
  ): Promise<Abono> {
    const executor = tx ?? db;

    const [abono] = await executor
      .insert(abonos)
      .values({
        clientId: data.clientId,
        businessId: ctx.businessId,
        sellerId: ctx.businessUserId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        relatedSaleId: data.relatedSaleId,
      })
      .returning();

    return abono;
  }
}
