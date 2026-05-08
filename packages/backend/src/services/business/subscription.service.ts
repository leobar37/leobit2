import { BusinessSubscriptionRepository } from "../repository/business-subscription.repository";
import { ForbiddenError } from "../../errors";
import type { RequestContext } from "../../context/request-context";
import {
  SUBSCRIPTION_PLANS,
  type PlanStatus,
} from "@avileo/shared";

type DbTransaction = Parameters<
  Parameters<typeof import("../../lib/db").db.transaction>[0]
>[0];

export class SubscriptionService {
  constructor(private repo: BusinessSubscriptionRepository) {}

  /**
   * Returns a PlanStatus DTO.
   * For non-cochera modes, returns an unlimited profesional-equivalent.
   */
  async getStatus(ctx: RequestContext): Promise<PlanStatus> {
    if (ctx.businessMode !== "cochera") {
      return {
        plan: "profesional",
        isWithinLimit: true,
        recordsUsedThisPeriod: 0,
        recordsLimit: null,
        periodEnd: new Date(Date.UTC(2099, 11, 31)).toISOString(),
        canExport: true,
        canAccessReports: true,
      };
    }

    const subscription = await this.repo.getOrCreate(ctx);
    const usage = await this.repo.resetUsageIfNeeded(ctx);

    const limit = subscription.monthlyRecordLimit;
    const isWithinLimit = limit === null || usage.recordCount < limit;

    const planConfig = SUBSCRIPTION_PLANS[subscription.plan as "gratis" | "profesional"];

    return {
      plan: subscription.plan as "gratis" | "profesional",
      isWithinLimit,
      recordsUsedThisPeriod: usage.recordCount,
      recordsLimit: limit,
      periodEnd: subscription.currentPeriodEnd.toISOString(),
      canExport: planConfig.features.exportExcel,
      canAccessReports: planConfig.features.reports,
    };
  }

  /**
   * Throws if the tenant cannot create a new record this period.
   * When called outside a transaction, it reads latest state from DB.
   * For checkout flows, prefer checkAndRecordUsage within the same transaction.
   */
  async checkCanCreateRecord(ctx: RequestContext): Promise<void> {
    if (ctx.businessMode !== "cochera") {
      return;
    }

    const status = await this.getStatus(ctx);
    if (!status.isWithinLimit) {
      throw new ForbiddenError(
        "Límite mensual alcanzado."
      );
    }
  }

  /**
   * Checks limit and records usage atomically within a transaction.
   * This is the preferred path for checkout to avoid race conditions.
   */
  async checkAndRecordUsage(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<void> {
    if (ctx.businessMode !== "cochera") {
      return;
    }

    const subscription = await this.repo.getOrCreate(ctx, tx);
    const usage = await this.repo.resetUsageIfNeeded(ctx, tx);

    const limit = subscription.monthlyRecordLimit;
    if (limit !== null && usage.recordCount >= limit) {
      throw new ForbiddenError("Límite mensual alcanzado.");
    }

    await this.repo.incrementUsage(ctx, tx);
  }

  /**
   * Check if a specific action is allowed under the current plan.
   */
  async checkLimit(
    ctx: RequestContext,
    action: "create_record" | "export" | "report"
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (ctx.businessMode !== "cochera") {
      return { allowed: true };
    }

    const status = await this.getStatus(ctx);

    switch (action) {
      case "create_record":
        if (!status.isWithinLimit) {
          return {
            allowed: false,
            reason: "Límite mensual alcanzado.",
          };
        }
        return { allowed: true };

      case "export":
        if (!status.canExport) {
          return {
            allowed: false,
            reason: "Exportación no disponible en tu plan.",
          };
        }
        return { allowed: true };

      case "report":
        if (!status.canAccessReports) {
          return {
            allowed: false,
            reason: "Reportes completos no disponibles en tu plan.",
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }
}
