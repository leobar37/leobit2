/**
 * Visita Repository
 * Data access layer for visits
 */
import { eq, and, inArray, desc, asc } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  visitas,
  customers,
  customerGroupMembers,
  customerGroups,
  distribucionGroups,
  waterDeliveryStops,
  type Visita,
  type NewVisita,
  type WaterDeliveryStop,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export interface VisitaWithCustomer extends Visita {
  customerName: string;
  customerDni?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  waterStop?: WaterDeliveryStop | null;
  groups?: { id: string; name: string }[];
}

export interface CreateVisitaData {
  id?: string;
  distribucionId: string;
  customerId: string;
}

export interface BulkCreateVisitasData {
  distribucionId: string;
  customerIds: string[];
  vendedorId?: string;
}

export interface UpdateVisitaStatusData {
  status: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string;
  saleId?: string;
}

export class VisitaRepository {
  /**
   * Find all visits for a distribution with customer and group info
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
        customerAddress: customers.address,
        customerPhone: customers.phone,
        waterStop: waterDeliveryStops,
      })
      .from(visitas)
      .innerJoin(customers, eq(visitas.customerId, customers.id))
      .leftJoin(waterDeliveryStops, eq(waterDeliveryStops.visitaId, visitas.id))
      .where(and(
        eq(visitas.businessId, ctx.businessId),
        eq(visitas.distribucionId, distribucionId)
      ))
      .orderBy(asc(visitas.status), desc(visitas.createdAt));

    // Get groups linked to this distribution
    const groupRows = await db
      .select({
        groupId: distribucionGroups.groupId,
        groupName: customerGroups.name,
      })
      .from(distribucionGroups)
      .innerJoin(customerGroups, eq(distribucionGroups.groupId, customerGroups.id))
      .where(and(
        eq(distribucionGroups.distribucionId, distribucionId),
        eq(distribucionGroups.businessId, ctx.businessId)
      ));

    // Get customer-group memberships for customers in these visits
    const customerIds = results.map(r => r.customerId);
    let membershipRows: { customerId: string; groupId: string; groupName: string }[] = [];
    if (customerIds.length > 0) {
      membershipRows = await db
        .select({
          customerId: customerGroupMembers.customerId,
          groupId: customerGroups.id,
          groupName: customerGroups.name,
        })
        .from(customerGroupMembers)
        .innerJoin(customerGroups, eq(customerGroupMembers.groupId, customerGroups.id))
        .where(and(
          inArray(customerGroupMembers.customerId, customerIds),
          eq(customerGroupMembers.businessId, ctx.businessId)
        ));
    }

    // Build a map of customerId -> groups
    const customerGroupsMap = new Map<string, { id: string; name: string }[]>();
    for (const row of membershipRows) {
      const existing = customerGroupsMap.get(row.customerId) || [];
      existing.push({ id: row.groupId, name: row.groupName });
      customerGroupsMap.set(row.customerId, existing);
    }

    return results.map(r => ({
      ...r,
      groups: customerGroupsMap.get(r.customerId),
    }));
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
        customerAddress: customers.address,
        customerPhone: customers.phone,
        waterStop: waterDeliveryStops,
      })
      .from(visitas)
      .innerJoin(customers, eq(visitas.customerId, customers.id))
      .leftJoin(waterDeliveryStops, eq(waterDeliveryStops.visitaId, visitas.id))
      .where(and(
        eq(visitas.id, visitId),
        eq(visitas.businessId, ctx.businessId)
      ))
      .limit(1);

    if (!result[0]) return null;

    // Get groups for this customer
    const membershipRows = await db
      .select({
        groupId: customerGroups.id,
        groupName: customerGroups.name,
      })
      .from(customerGroupMembers)
      .innerJoin(customerGroups, eq(customerGroupMembers.groupId, customerGroups.id))
      .where(and(
        eq(customerGroupMembers.customerId, result[0].customerId),
        eq(customerGroupMembers.businessId, ctx.businessId)
      ));

    return {
      ...result[0],
      groups: membershipRows.map(r => ({ id: r.groupId, name: r.groupName })),
    };
  }

  /**
   * Create a single visit
   */
  async create(ctx: RequestContext, data: CreateVisitaData, tx?: DbTransaction): Promise<Visita> {
    const dbOrTx = tx || db;
    const [visit] = await dbOrTx
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
      vendedorId: data.vendedorId ?? ctx.businessUserId,
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
