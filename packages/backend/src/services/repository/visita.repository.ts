/**
 * Visita Repository
 * Data access layer for visits
 */
import { eq, and, inArray, desc, asc } from "drizzle-orm";
import { db } from "../../lib/db";
import { visitas, customers, type Visita, type NewVisita } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export interface VisitaWithCustomer extends Visita {
  customerName: string;
  customerDni?: string | null;
}

export interface CreateVisitaData {
  id?: string;
  distribucionId: string;
  customerId: string;
}

export interface BulkCreateVisitasData {
  distribucionId: string;
  customerIds: string[];
}

export interface UpdateVisitaStatusData {
  status: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string;
  saleId?: string;
}

export class VisitaRepository {
  /**
   * Find all visits for a distribution
   */
  async findByDistribucionId(ctx: RequestContext, distribucionId: string): Promise<VisitaWithCustomer[]> {
    const results = await db
      .select({
        id: visitas.id,
        businessId: visitas.businessId,
        distribucionId: visitas.distribucionId,
        customerId: visitas.customerId,
        vendedorId: visitas.vendedorId,
        status: visitas.status,
        motivoNoCompra: visitas.motivoNoCompra,
        saleId: visitas.saleId,
        createdAt: visitas.createdAt,
        updatedAt: visitas.updatedAt,
        customerName: customers.name,
        customerDni: customers.dni,
      })
      .from(visitas)
      .innerJoin(customers, eq(visitas.customerId, customers.id))
      .where(and(
        eq(visitas.businessId, ctx.businessId),
        eq(visitas.distribucionId, distribucionId)
      ))
      .orderBy(asc(visitas.status), desc(visitas.createdAt));

    return results;
  }

  /**
   * Find a single visit by ID
   */
  async findById(ctx: RequestContext, visitId: string): Promise<VisitaWithCustomer | null> {
    const result = await db
      .select({
        id: visitas.id,
        businessId: visitas.businessId,
        distribucionId: visitas.distribucionId,
        customerId: visitas.customerId,
        vendedorId: visitas.vendedorId,
        status: visitas.status,
        motivoNoCompra: visitas.motivoNoCompra,
        saleId: visitas.saleId,
        createdAt: visitas.createdAt,
        updatedAt: visitas.updatedAt,
        customerName: customers.name,
        customerDni: customers.dni,
      })
      .from(visitas)
      .innerJoin(customers, eq(visitas.customerId, customers.id))
      .where(and(
        eq(visitas.id, visitId),
        eq(visitas.businessId, ctx.businessId)
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a single visit
   */
  async create(ctx: RequestContext, data: CreateVisitaData): Promise<Visita> {
    const [visit] = await db
      .insert(visitas)
      .values({
        ...(data.id ? { id: data.id } : {}),
        distribucionId: data.distribucionId,
        customerId: data.customerId,
        vendedorId: ctx.businessUserId,
        businessId: ctx.businessId,
        status: "pendiente",
      })
      .returning();

    return visit;
  }

  /**
   * Create multiple visits (bulk)
   */
  async bulkCreate(
    ctx: RequestContext,
    data: BulkCreateVisitasData,
    tx?: DbTransaction
  ): Promise<Visita[]> {
    const visits: Omit<NewVisita, "id">[] = data.customerIds.map((customerId) => ({
      distribucionId: data.distribucionId,
      customerId,
      vendedorId: ctx.businessUserId,
      businessId: ctx.businessId,
      status: "pendiente",
    }));

    const dbOrTx = tx || db;

    const result = await dbOrTx
      .insert(visitas)
      .values(visits)
      .returning();

    return result;
  }

  /**
   * Check if a visit exists for distribution and customer
   */
  async existsByDistribucionAndCustomer(
    ctx: RequestContext,
    distribucionId: string,
    customerId: string
  ): Promise<boolean> {
    const result = await db
      .select({ id: visitas.id })
      .from(visitas)
      .where(and(
        eq(visitas.businessId, ctx.businessId),
        eq(visitas.distribucionId, distribucionId),
        eq(visitas.customerId, customerId)
      ))
      .limit(1);

    return !!result[0];
  }

  /**
   * Update visit status
   */
  async updateStatus(
    ctx: RequestContext,
    visitId: string,
    data: UpdateVisitaStatusData,
    tx?: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ): Promise<Visita> {
    const updateData: Partial<Visita> = {
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.status === "no_compra" && data.motivoNoCompra) {
      updateData.motivoNoCompra = data.motivoNoCompra;
    }

    if (data.status === "compro" && data.saleId) {
      updateData.saleId = data.saleId;
    }

    const dbOrTx = tx || db;

    const [visit] = await dbOrTx
      .update(visitas)
      .set(updateData)
      .where(and(
        eq(visitas.id, visitId),
        eq(visitas.businessId, ctx.businessId)
      ))
      .returning();

    return visit;
  }

  /**
   * Delete a visit
   */
  async delete(ctx: RequestContext, visitId: string): Promise<void> {
    await db
      .delete(visitas)
      .where(and(
        eq(visitas.id, visitId),
        eq(visitas.businessId, ctx.businessId)
      ));
  }

  /**
   * Find visits by customer ID
   */
  async findByCustomerId(ctx: RequestContext, customerId: string): Promise<Visita[]> {
    return db
      .select()
      .from(visitas)
      .where(and(
        eq(visitas.businessId, ctx.businessId),
        eq(visitas.customerId, customerId)
      ))
      .orderBy(desc(visitas.createdAt));
  }

  /**
   * Get customers that already have visits for a distribution
   */
  async getVisitedCustomerIds(ctx: RequestContext, distribucionId: string): Promise<string[]> {
    const results = await db
      .select({ customerId: visitas.customerId })
      .from(visitas)
      .where(and(
        eq(visitas.businessId, ctx.businessId),
        eq(visitas.distribucionId, distribucionId)
      ));

    return results.map(r => r.customerId);
  }
}
