import { and, eq, inArray, sql, ne } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  customers,
  waterRoutes,
  waterCustomerProfiles,
  waterDeliveryStops,
  waterContainerLedgerEntries,
  type WaterCustomerProfile,
  type NewWaterCustomerProfile,
  type WaterDeliveryStop,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";

export interface WaterCustomerProfileInput {
  deliveryFrequency?: string;
  deliveryDays?: string[];
  defaultContainerQuantity?: number;
  containersAtCustomer?: number;
  depositAmount?: string | number;
  depositStatus?: string;
  depositExceptionReason?: string | null;
  waterRouteId?: string | null;
  preferredRoute?: string | null;
  deliveryInstructions?: string | null;
  scheduleAnchorDate?: Date | null;
}

export interface WaterRouteProfileRow extends WaterCustomerProfile {
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  waterRouteName: string | null;
}

export class WaterCustomerProfileRepository {
  async findByCustomerId(
    ctx: RequestContext,
    customerId: string,
    tx?: DbTransaction
  ): Promise<(WaterCustomerProfile & { waterRouteName?: string | null }) | undefined> {
    const executor = tx ?? db;
    const [profile] = await executor
      .select({
        id: waterCustomerProfiles.id,
        businessId: waterCustomerProfiles.businessId,
        customerId: waterCustomerProfiles.customerId,
        deliveryFrequency: waterCustomerProfiles.deliveryFrequency,
        deliveryDays: waterCustomerProfiles.deliveryDays,
        defaultContainerQuantity: waterCustomerProfiles.defaultContainerQuantity,
        containersAtCustomer: waterCustomerProfiles.containersAtCustomer,
        depositAmount: waterCustomerProfiles.depositAmount,
        depositStatus: waterCustomerProfiles.depositStatus,
        depositExceptionReason: waterCustomerProfiles.depositExceptionReason,
        waterRouteId: waterCustomerProfiles.waterRouteId,
        preferredRoute: waterCustomerProfiles.preferredRoute,
        deliveryInstructions: waterCustomerProfiles.deliveryInstructions,
        scheduleAnchorDate: waterCustomerProfiles.scheduleAnchorDate,
        lastScheduledAt: waterCustomerProfiles.lastScheduledAt,
        createdAt: waterCustomerProfiles.createdAt,
        updatedAt: waterCustomerProfiles.updatedAt,
        waterRouteName: waterRoutes.name,
      })
      .from(waterCustomerProfiles)
      .leftJoin(waterRoutes, eq(waterRoutes.id, waterCustomerProfiles.waterRouteId))
      .where(
        and(
          eq(waterCustomerProfiles.businessId, ctx.businessId),
          eq(waterCustomerProfiles.customerId, customerId)
        )
      )
      .limit(1);
    return profile;
  }

  async findByCustomerIds(
    ctx: RequestContext,
    customerIds: string[],
    tx?: DbTransaction
  ): Promise<Array<WaterCustomerProfile & { waterRouteName?: string | null }>> {
    if (customerIds.length === 0) return [];
    const executor = tx ?? db;
    return executor
      .select({
        id: waterCustomerProfiles.id,
        businessId: waterCustomerProfiles.businessId,
        customerId: waterCustomerProfiles.customerId,
        deliveryFrequency: waterCustomerProfiles.deliveryFrequency,
        deliveryDays: waterCustomerProfiles.deliveryDays,
        defaultContainerQuantity: waterCustomerProfiles.defaultContainerQuantity,
        containersAtCustomer: waterCustomerProfiles.containersAtCustomer,
        depositAmount: waterCustomerProfiles.depositAmount,
        depositStatus: waterCustomerProfiles.depositStatus,
        depositExceptionReason: waterCustomerProfiles.depositExceptionReason,
        waterRouteId: waterCustomerProfiles.waterRouteId,
        preferredRoute: waterCustomerProfiles.preferredRoute,
        deliveryInstructions: waterCustomerProfiles.deliveryInstructions,
        scheduleAnchorDate: waterCustomerProfiles.scheduleAnchorDate,
        lastScheduledAt: waterCustomerProfiles.lastScheduledAt,
        createdAt: waterCustomerProfiles.createdAt,
        updatedAt: waterCustomerProfiles.updatedAt,
        waterRouteName: waterRoutes.name,
      })
      .from(waterCustomerProfiles)
      .leftJoin(waterRoutes, eq(waterRoutes.id, waterCustomerProfiles.waterRouteId))
      .where(
        and(
          eq(waterCustomerProfiles.businessId, ctx.businessId),
          inArray(waterCustomerProfiles.customerId, customerIds)
        )
      );
  }

  async create(
    ctx: RequestContext,
    customerId: string,
    data: WaterCustomerProfileInput,
    tx?: DbTransaction
  ): Promise<WaterCustomerProfile> {
    const executor = tx ?? db;
    const [profile] = await executor
      .insert(waterCustomerProfiles)
      .values({
        businessId: ctx.businessId,
        customerId,
        ...this.toInsertValues(data),
      })
      .returning();

    return profile;
  }

  async upsert(
    ctx: RequestContext,
    customerId: string,
    data: WaterCustomerProfileInput,
    tx?: DbTransaction
  ): Promise<WaterCustomerProfile> {
    const existing = await this.findByCustomerId(ctx, customerId, tx);
    if (!existing) {
      return this.create(ctx, customerId, data, tx);
    }
    return this.update(ctx, customerId, data, tx) as Promise<WaterCustomerProfile>;
  }

  async update(
    ctx: RequestContext,
    customerId: string,
    data: WaterCustomerProfileInput,
    tx?: DbTransaction
  ): Promise<WaterCustomerProfile | undefined> {
    const executor = tx ?? db;
    const [profile] = await executor
      .update(waterCustomerProfiles)
      .set({
        ...this.toUpdateValues(data),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(waterCustomerProfiles.businessId, ctx.businessId),
          eq(waterCustomerProfiles.customerId, customerId)
        )
      )
      .returning();

    return profile;
  }

  async findScheduledCandidates(
    ctx: RequestContext,
    waterRouteId: string,
    scheduledDate?: string,
    tx?: DbTransaction
  ): Promise<WaterRouteProfileRow[]> {
    const executor = tx ?? db;
    const conditions = [
      eq(waterCustomerProfiles.businessId, ctx.businessId),
      ne(waterCustomerProfiles.deliveryFrequency, "on_demand"),
      eq(waterCustomerProfiles.waterRouteId, waterRouteId),
      scheduledDate
        ? sql`NOT EXISTS (
          SELECT 1 FROM ${waterDeliveryStops}
          WHERE ${waterDeliveryStops.businessId} = ${waterCustomerProfiles.businessId}
            AND ${waterDeliveryStops.customerProfileId} = ${waterCustomerProfiles.id}
            AND ${waterDeliveryStops.scheduledDate} = ${scheduledDate}
            AND ${waterDeliveryStops.waterRouteId} = ${waterRouteId}
        )`
        : undefined,
    ].filter(Boolean);

    return executor
      .select({
        id: waterCustomerProfiles.id,
        businessId: waterCustomerProfiles.businessId,
        customerId: waterCustomerProfiles.customerId,
        deliveryFrequency: waterCustomerProfiles.deliveryFrequency,
        deliveryDays: waterCustomerProfiles.deliveryDays,
        defaultContainerQuantity: waterCustomerProfiles.defaultContainerQuantity,
        containersAtCustomer: waterCustomerProfiles.containersAtCustomer,
        depositAmount: waterCustomerProfiles.depositAmount,
        depositStatus: waterCustomerProfiles.depositStatus,
        preferredRoute: waterCustomerProfiles.preferredRoute,
        depositExceptionReason: waterCustomerProfiles.depositExceptionReason,
        waterRouteId: waterCustomerProfiles.waterRouteId,
        deliveryInstructions: waterCustomerProfiles.deliveryInstructions,
        scheduleAnchorDate: waterCustomerProfiles.scheduleAnchorDate,
        lastScheduledAt: waterCustomerProfiles.lastScheduledAt,
        createdAt: waterCustomerProfiles.createdAt,
        updatedAt: waterCustomerProfiles.updatedAt,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        waterRouteName: sql<string | null>`(select name from water_routes wr where wr.id = ${waterCustomerProfiles.waterRouteId})`,
      })
      .from(waterCustomerProfiles)
      .innerJoin(customers, eq(customers.id, waterCustomerProfiles.customerId))
      .where(and(...conditions));
  }

  async markScheduled(
    ctx: RequestContext,
    profileId: string,
    scheduledAt: Date,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;
    await executor
      .update(waterCustomerProfiles)
      .set({
        lastScheduledAt: scheduledAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(waterCustomerProfiles.businessId, ctx.businessId),
          eq(waterCustomerProfiles.id, profileId)
        )
      );
  }

  async createDeliveryStop(
    ctx: RequestContext,
    data: {
      visitaId: string;
      customerProfileId: string;
      waterRouteId?: string | null;
      scheduledDate: string;
      expectedContainerQuantity: number;
      containersAtStart: number;
    },
    tx?: DbTransaction
  ): Promise<WaterDeliveryStop> {
    const executor = tx ?? db;
    const [stop] = await executor
      .insert(waterDeliveryStops)
      .values({
        businessId: ctx.businessId,
        visitaId: data.visitaId,
        customerProfileId: data.customerProfileId,
        waterRouteId: data.waterRouteId ?? null,
        scheduledDate: data.scheduledDate,
        expectedContainerQuantity: data.expectedContainerQuantity,
        containersAtStart: data.containersAtStart,
        status: "pendiente",
      })
      .returning();

    return stop;
  }

  async findDeliveryStopByVisitaId(
    ctx: RequestContext,
    visitaId: string,
    tx?: DbTransaction
  ): Promise<WaterDeliveryStop | undefined> {
    const executor = tx ?? db;
    return executor.query.waterDeliveryStops.findFirst({
      where: and(
        eq(waterDeliveryStops.businessId, ctx.businessId),
        eq(waterDeliveryStops.visitaId, visitaId)
      ),
    });
  }

  async completeDeliveryStop(
    ctx: RequestContext,
    stopId: string,
    data: {
      status: string;
      delivered: number;
      collected: number;
      damaged: number;
      lost: number;
      notes?: string | null;
    },
    tx?: DbTransaction
  ): Promise<WaterDeliveryStop> {
    const executor = tx ?? db;
    const [stop] = await executor
      .update(waterDeliveryStops)
      .set({
        status: data.status,
        deliveredContainerQuantity: data.delivered,
        collectedContainerQuantity: data.collected,
        damagedContainerQuantity: data.damaged,
        lostContainerQuantity: data.lost,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(waterDeliveryStops.businessId, ctx.businessId), eq(waterDeliveryStops.id, stopId)))
      .returning();
    return stop;
  }

  async updateContainersAtCustomer(
    ctx: RequestContext,
    profileId: string,
    balance: number,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;
    await executor
      .update(waterCustomerProfiles)
      .set({
        containersAtCustomer: balance,
        updatedAt: new Date(),
      })
      .where(and(eq(waterCustomerProfiles.businessId, ctx.businessId), eq(waterCustomerProfiles.id, profileId)));
  }

  async createContainerLedgerEntry(
    ctx: RequestContext,
    data: {
      customerId: string;
      customerProfileId: string;
      visitaId: string;
      entryType: string;
      quantity: number;
      balanceAfter: number;
      reason?: string | null;
    },
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;
    await executor.insert(waterContainerLedgerEntries).values({
      businessId: ctx.businessId,
      customerId: data.customerId,
      customerProfileId: data.customerProfileId,
      visitaId: data.visitaId,
      entryType: data.entryType,
      quantity: data.quantity,
      balanceAfter: data.balanceAfter,
      reason: data.reason ?? null,
    });
  }

  private toInsertValues(data: WaterCustomerProfileInput): Omit<NewWaterCustomerProfile, "id" | "businessId" | "customerId"> {
    return {
      deliveryFrequency: data.deliveryFrequency ?? "weekly",
      deliveryDays: data.deliveryDays ?? [],
      defaultContainerQuantity: data.defaultContainerQuantity ?? 1,
      containersAtCustomer: data.containersAtCustomer ?? 0,
      depositAmount: String(data.depositAmount ?? "0"),
      depositStatus: data.depositStatus ?? "none",
      depositExceptionReason: data.depositExceptionReason ?? null,
      waterRouteId: data.waterRouteId ?? null,
      preferredRoute: data.preferredRoute ?? null,
      deliveryInstructions: data.deliveryInstructions ?? null,
      scheduleAnchorDate: data.scheduleAnchorDate ?? null,
    };
  }

  private toUpdateValues(data: WaterCustomerProfileInput): Partial<NewWaterCustomerProfile> {
    return {
      ...(data.deliveryFrequency !== undefined && { deliveryFrequency: data.deliveryFrequency }),
      ...(data.deliveryDays !== undefined && { deliveryDays: data.deliveryDays }),
      ...(data.defaultContainerQuantity !== undefined && { defaultContainerQuantity: data.defaultContainerQuantity }),
      ...(data.containersAtCustomer !== undefined && { containersAtCustomer: data.containersAtCustomer }),
      ...(data.depositAmount !== undefined && { depositAmount: String(data.depositAmount) }),
      ...(data.depositStatus !== undefined && { depositStatus: data.depositStatus }),
      ...(data.depositExceptionReason !== undefined && { depositExceptionReason: data.depositExceptionReason }),
      ...(data.waterRouteId !== undefined && { waterRouteId: data.waterRouteId }),
      ...(data.preferredRoute !== undefined && { preferredRoute: data.preferredRoute }),
      ...(data.deliveryInstructions !== undefined && { deliveryInstructions: data.deliveryInstructions }),
      ...(data.scheduleAnchorDate !== undefined && { scheduleAnchorDate: data.scheduleAnchorDate }),
    };
  }
}
