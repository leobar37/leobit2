import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { abonos, type Abono, type NewAbono } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PaymentRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      customerId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Abono[]> {
    return db.query.abonos.findMany({
      where: and(
        eq(abonos.businessId, ctx.businessId),
        filters?.customerId ? eq(abonos.customerId, filters.customerId) : undefined
      ),
      orderBy: desc(abonos.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<Abono | undefined> {
    const executor = tx ?? db;
    return executor.query.abonos.findFirst({
      where: and(
        eq(abonos.id, id),
        eq(abonos.businessId, ctx.businessId)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewAbono, "businessId" | "sellerId" | "createdAt"> & { id?: string },
    tx?: DbTransaction
  ): Promise<Abono> {
    const executor = tx ?? db;

    const [abono] = await executor
      .insert(abonos)
      .values({
        id: data.id,
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
      customerId: string;
      amount: string;
      referenceNumber: string;
    },
    tx?: DbTransaction
  ): Promise<Abono | undefined> {
    const executor = tx ?? db;

    const [abono] = await executor
      .insert(abonos)
      .values({
        customerId: data.customerId,
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

  async delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;
    await executor
      .delete(abonos)
      .where(and(
        eq(abonos.id, id),
        eq(abonos.businessId, ctx.businessId)
      ));
  }

  async count(ctx: RequestContext, filters?: { customerId?: string }): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(abonos)
      .where(and(
        eq(abonos.businessId, ctx.businessId),
        filters?.customerId ? eq(abonos.customerId, filters.customerId) : undefined
      ));

    return result[0]?.count ?? 0;
  }

  async getTotalByCustomer(ctx: RequestContext, customerId: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`coalesce(sum(${abonos.amount}), 0)` })
      .from(abonos)
      .where(and(
        eq(abonos.businessId, ctx.businessId),
        eq(abonos.customerId, customerId)
      ));

    return result[0]?.total ?? 0;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Pick<Abono, "proofImageId" | "referenceNumber" | "notes"> & { version?: number }>,
    tx?: DbTransaction,
    expectedVersion?: number
  ): Promise<Abono> {
    const executor = tx ?? db;

    const conditions = [
      eq(abonos.id, id),
      eq(abonos.businessId, ctx.businessId)
    ];

    if (expectedVersion !== undefined) {
      conditions.push(eq(abonos.version, expectedVersion));
    }

    const [abono] = await executor
      .update(abonos)
      .set({
        ...data,
        updatedAt: new Date(),
        version: expectedVersion !== undefined ? data.version ?? (expectedVersion + 1) : undefined,
      })
      .where(and(...conditions))
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
      customerId: string;
      amount: string;
      paymentMethod: "saldo" | "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta";
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
        customerId: data.customerId,
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
