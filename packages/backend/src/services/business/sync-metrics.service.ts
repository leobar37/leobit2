import { eq, and, sql, desc } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { db, syncOperations } from "../../lib/db";
import { syncDeadLetter } from "../../db/schema/sync-dead-letter";

export interface EntityMetrics {
  pending: number;
  processed: number;
  failed: number;
}

export interface SyncMetrics {
  total: number;
  pending: number;
  processed: number;
  failed: number;
  deadLetterCount: number;
  averageLatencyMs: number;
  topErrors: Array<{ error: string; count: number }>;
  byEntity: Record<string, EntityMetrics>;
  timeRange: { from: string; to: string };
}

export class SyncMetricsService {
  async getMetrics(
    ctx: RequestContext,
    timeRangeHours = 24
  ): Promise<SyncMetrics> {
    const to = new Date();
    const from = new Date(to.getTime() - timeRangeHours * 60 * 60 * 1000);

    const [
      statusCounts,
      avgLatency,
      topErrors,
      byEntity,
      deadLetterCount,
    ] = await Promise.all([
      this.getStatusCounts(ctx, from),
      this.getAverageLatency(ctx, from),
      this.getTopErrors(ctx, from),
      this.getMetricsByEntity(ctx, from),
      this.getDeadLetterCount(ctx),
    ]);

    const total =
      statusCounts.pending + statusCounts.processed + statusCounts.failed;

    return {
      total,
      pending: statusCounts.pending,
      processed: statusCounts.processed,
      failed: statusCounts.failed,
      deadLetterCount,
      averageLatencyMs: avgLatency,
      topErrors,
      byEntity,
      timeRange: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  private async getStatusCounts(
    ctx: RequestContext,
    from: Date
  ): Promise<{ pending: number; processed: number; failed: number }> {
    const result = await db
      .select({
        status: syncOperations.status,
        count: sql<number>`count(*)::int`,
      })
      .from(syncOperations)
      .where(
        and(
          eq(syncOperations.businessId, ctx.businessId),
          sql`${syncOperations.createdAt} >= ${from.toISOString()}`
        )
      )
      .groupBy(syncOperations.status);

    const counts = { pending: 0, processed: 0, failed: 0 };
    for (const row of result) {
      if (row.status === "pending") counts.pending = row.count;
      else if (row.status === "processed") counts.processed = row.count;
      else if (row.status === "failed") counts.failed = row.count;
    }
    return counts;
  }

  private async getAverageLatency(
    ctx: RequestContext,
    from: Date
  ): Promise<number> {
    const result = await db
      .select({
        avgLatency: sql<number>`avg(extract(epoch from (${syncOperations.processedAt} - ${syncOperations.clientTimestamp}))) * 1000`,
      })
      .from(syncOperations)
      .where(
        and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.status, "processed"),
          sql`${syncOperations.createdAt} >= ${from.toISOString()}`,
          sql`${syncOperations.processedAt} is not null`
        )
      );

    return Math.round(result[0]?.avgLatency ?? 0);
  }

  private async getTopErrors(
    ctx: RequestContext,
    from: Date,
    limit = 5
  ): Promise<Array<{ error: string; count: number }>> {
    const result = await db
      .select({
        error: syncOperations.error,
        count: sql<number>`count(*)::int`,
      })
      .from(syncOperations)
      .where(
        and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.status, "failed"),
          sql`${syncOperations.createdAt} >= ${from.toISOString()}`,
          sql`${syncOperations.error} is not null`
        )
      )
      .groupBy(syncOperations.error)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result.map((r) => ({ error: r.error ?? "Unknown error", count: r.count }));
  }

  private async getMetricsByEntity(
    ctx: RequestContext,
    from: Date
  ): Promise<Record<string, EntityMetrics>> {
    const result = await db
      .select({
        entity: syncOperations.entity,
        status: syncOperations.status,
        count: sql<number>`count(*)::int`,
      })
      .from(syncOperations)
      .where(
        and(
          eq(syncOperations.businessId, ctx.businessId),
          sql`${syncOperations.createdAt} >= ${from.toISOString()}`
        )
      )
      .groupBy(syncOperations.entity, syncOperations.status);

    const byEntity: Record<string, EntityMetrics> = {};
    for (const row of result) {
      if (!byEntity[row.entity]) {
        byEntity[row.entity] = { pending: 0, processed: 0, failed: 0 };
      }
      if (row.status === "pending") byEntity[row.entity].pending = row.count;
      else if (row.status === "processed")
        byEntity[row.entity].processed = row.count;
      else if (row.status === "failed")
        byEntity[row.entity].failed = row.count;
    }
    return byEntity;
  }

  private async getDeadLetterCount(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(syncDeadLetter)
      .where(eq(syncDeadLetter.businessId, ctx.businessId));

    return result[0]?.count ?? 0;
  }
}
