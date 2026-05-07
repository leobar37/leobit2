import { eq, and, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  businessSubscriptions,
  subscriptionUsage,
  type BusinessSubscription,
  type NewBusinessSubscription,
  type SubscriptionUsage,
  type NewSubscriptionUsage,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanType,
  getCalendarMonthPeriod,
} from "@avileo/shared";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class BusinessSubscriptionRepository {
  async findByBusinessId(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<BusinessSubscription | undefined> {
    const dbOrTx = tx || db;
    return dbOrTx.query.businessSubscriptions.findFirst({
      where: eq(businessSubscriptions.businessId, ctx.businessId),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewBusinessSubscription, "businessId">,
    tx?: DbTransaction
  ): Promise<BusinessSubscription> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .insert(businessSubscriptions)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();
    return result;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<NewBusinessSubscription>,
    tx?: DbTransaction
  ): Promise<BusinessSubscription> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .update(businessSubscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(businessSubscriptions.id, id),
        eq(businessSubscriptions.businessId, ctx.businessId)
      ))
      .returning();
    return result;
  }

  async getOrCreate(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<BusinessSubscription> {
    const existing = await this.findByBusinessId(ctx, tx);
    if (existing) {
      return existing;
    }

    const planConfig = SUBSCRIPTION_PLANS.gratis;
    const { periodStart, periodEnd } = getCalendarMonthPeriod(new Date());

    return this.create(ctx, {
      plan: planConfig.plan,
      monthlyRecordLimit: planConfig.monthlyRecordLimit,
      priceMonthly: String(planConfig.priceMonthly),
      features: planConfig.features,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    }, tx);
  }

  async updatePlan(
    ctx: RequestContext,
    plan: SubscriptionPlanType,
    tx?: DbTransaction
  ): Promise<BusinessSubscription> {
    const dbOrTx = tx || db;
    const existing = await this.findByBusinessId(ctx, tx);
    const planConfig = SUBSCRIPTION_PLANS[plan];
    const { periodStart, periodEnd } = getCalendarMonthPeriod(new Date());

    if (existing) {
      return this.update(ctx, existing.id, {
        plan: planConfig.plan,
        monthlyRecordLimit: planConfig.monthlyRecordLimit,
        priceMonthly: String(planConfig.priceMonthly),
        features: planConfig.features,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      }, tx);
    }

    return this.create(ctx, {
      plan: planConfig.plan,
      monthlyRecordLimit: planConfig.monthlyRecordLimit,
      priceMonthly: String(planConfig.priceMonthly),
      features: planConfig.features,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    }, tx);
  }

  // --- Usage ---

  async findUsageByBusinessId(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<SubscriptionUsage | undefined> {
    const dbOrTx = tx || db;
    return dbOrTx.query.subscriptionUsage.findFirst({
      where: eq(subscriptionUsage.businessId, ctx.businessId),
    });
  }

  async createUsage(
    ctx: RequestContext,
    data: Omit<NewSubscriptionUsage, "businessId">,
    tx?: DbTransaction
  ): Promise<SubscriptionUsage> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .insert(subscriptionUsage)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();
    return result;
  }

  async updateUsage(
    ctx: RequestContext,
    id: string,
    data: Partial<NewSubscriptionUsage>,
    tx?: DbTransaction
  ): Promise<SubscriptionUsage> {
    const dbOrTx = tx || db;
    const [result] = await dbOrTx
      .update(subscriptionUsage)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(subscriptionUsage.id, id),
        eq(subscriptionUsage.businessId, ctx.businessId)
      ))
      .returning();
    return result;
  }

  async getUsage(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<SubscriptionUsage> {
    const existing = await this.findUsageByBusinessId(ctx, tx);
    if (existing) {
      return existing;
    }

    const { periodStart, periodEnd } = getCalendarMonthPeriod(new Date());
    return this.createUsage(ctx, {
      periodStart,
      periodEnd,
      recordCount: 0,
    }, tx);
  }

  async incrementUsage(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<SubscriptionUsage> {
    const dbOrTx = tx || db;
    const usage = await this.getUsage(ctx, tx);
    const now = new Date();

    // Check if period has expired and reset if needed
    if (now > usage.periodEnd) {
      const { periodStart, periodEnd } = getCalendarMonthPeriod(now);
      return this.updateUsage(ctx, usage.id, {
        periodStart,
        periodEnd,
        recordCount: 1,
      }, tx);
    }

    return this.updateUsage(ctx, usage.id, {
      recordCount: usage.recordCount + 1,
    }, tx);
  }

  async resetUsageIfNeeded(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<SubscriptionUsage> {
    const usage = await this.getUsage(ctx, tx);
    const now = new Date();

    if (now > usage.periodEnd) {
      const { periodStart, periodEnd } = getCalendarMonthPeriod(now);
      return this.updateUsage(ctx, usage.id, {
        periodStart,
        periodEnd,
        recordCount: 0,
      }, tx);
    }

    return usage;
  }
}
