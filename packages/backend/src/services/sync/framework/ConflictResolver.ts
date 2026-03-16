import { and, eq } from "drizzle-orm";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import { customers, sales } from "../../../db/schema";
import type { SyncOperationInput, SyncEntity } from "../types";
import type { IConflictResolver } from "./types";
import { logger } from "../../../lib/logger";

export interface ConflictCheckResult {
  hasConflict: boolean;
  serverVersion?: number;
  serverData?: Record<string, unknown>;
}

class TimestampConflictResolver implements IConflictResolver {
  async checkConflict(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<ConflictCheckResult> {
    if (operation.operation === "create" || operation.operation === "delete") {
      return { hasConflict: false };
    }

    const customer = await tx.query.customers.findFirst({
      where: and(
        eq(customers.id, operation.entityId),
        eq(customers.businessId, ctx.businessId)
      ),
    });

    if (!customer) {
      return { hasConflict: false };
    }

    const serverTimestamp = customer.updatedAt.getTime();
    const localTimestamp = new Date(operation.localTimestamp).getTime();

    if (serverTimestamp > localTimestamp) {
      return {
        hasConflict: true,
        serverVersion: Math.floor(serverTimestamp / 1000),
        serverData: {
          name: customer.name,
          dni: customer.dni,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
          updatedAt: customer.updatedAt.toISOString(),
        },
      };
    }

    return { hasConflict: false };
  }
}

class VersionConflictResolver implements IConflictResolver {
  async checkConflict(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<ConflictCheckResult> {
    if (operation.operation === "create" || operation.operation === "delete") {
      return { hasConflict: false };
    }

    const sale = await tx.query.sales.findFirst({
      where: and(
        eq(sales.id, operation.entityId),
        eq(sales.businessId, ctx.businessId)
      ),
    });

    if (!sale) {
      return { hasConflict: false };
    }

    if (sale.version > operation.localVersion) {
      logger.warn({
        msg: "⚠️ Sale conflict detected",
        entityId: operation.entityId,
        serverVersion: sale.version,
        clientVersion: operation.localVersion,
        serverStatus: sale.status,
      });

      return {
        hasConflict: true,
        serverVersion: sale.version,
        serverData: {
          status: sale.status,
          totalAmount: sale.totalAmount,
          amountPaid: sale.amountPaid,
          balanceDue: sale.balanceDue,
          version: sale.version,
          updatedAt: sale.updatedAt.toISOString(),
        },
      };
    }

    return { hasConflict: false };
  }
}

class NoOpConflictResolver implements IConflictResolver {
  async checkConflict(): Promise<ConflictCheckResult> {
    return { hasConflict: false };
  }
}

const resolvers: Record<string, IConflictResolver> = {
  customers: new TimestampConflictResolver(),
  sales: new VersionConflictResolver(),
  sale_items: new NoOpConflictResolver(),
  abonos: new NoOpConflictResolver(),
  distribuciones: new NoOpConflictResolver(),
};

export class ConflictResolverRegistry {
  static getResolver(entityType: SyncEntity): IConflictResolver {
    return resolvers[entityType] ?? new NoOpConflictResolver();
  }

  static registerResolver(entityType: SyncEntity, resolver: IConflictResolver): void {
    resolvers[entityType] = resolver;
  }
}

export { TimestampConflictResolver, VersionConflictResolver, NoOpConflictResolver };
