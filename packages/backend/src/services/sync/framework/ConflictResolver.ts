import { and, eq, getTableName } from "drizzle-orm";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import { customers, sales, abonos, products, tags, visitas, purchases, purchaseItems, suppliers, closings, distribuciones, saleItems } from "../../../db/schema";
import { customerGroups } from "../../../db/schema/customer-groups";
import { customerTags } from "../../../db/schema/customer-tags";
import { customerGroupMembers } from "../../../db/schema/customer-group-members";
import { puntosVenta } from "../../../db/schema/puntos-venta";
import { productUnits } from "../../../db/schema/product-units";
import { variantInventory } from "../../../db/schema/inventory";
import { files } from "../../../db/schema/files";
import type { SyncOperationInput, SyncEntity } from "../types";
import type { IConflictResolver } from "./types";
import { logger } from "../../../lib/logger";

export interface ConflictCheckResult {
  hasConflict: boolean;
  serverVersion?: number;
  serverData?: Record<string, unknown>;
}

// Base class for timestamp-based conflict detection
abstract class BaseTimestampConflictResolver implements IConflictResolver {
  protected abstract getEntityName(): string;
  protected abstract getTable(): any;
  protected abstract getIdField(): string;
  protected abstract getBusinessIdField(): string;
  protected abstract getUpdatedAtField(): string;
  protected abstract getServerDataFields(record: any): Record<string, unknown>;

  async checkConflict(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<ConflictCheckResult> {
    if (operation.operation === "create" || operation.operation === "delete") {
      return { hasConflict: false };
    }

    const table = this.getTable();
    const idField = this.getIdField();
    const businessIdField = this.getBusinessIdField();
    const updatedAtField = this.getUpdatedAtField();

    const tableName = getTableName(table);
    const record = await (tx.query as Record<string, any>)[tableName].findFirst({
      where: and(
        eq(table[idField], operation.entityId),
        eq(table[businessIdField], ctx.businessId)
      ),
    });

    if (!record) {
      return { hasConflict: false };
    }

    const serverTimestamp = new Date(record[updatedAtField]).getTime();
    const localTimestamp = new Date(operation.localTimestamp).getTime();

    if (serverTimestamp > localTimestamp) {
      logger.warn({
        msg: `⚠️ ${this.getEntityName()} conflict detected`,
        entityId: operation.entityId,
        serverTimestamp: new Date(serverTimestamp).toISOString(),
        clientTimestamp: operation.localTimestamp,
      });

      return {
        hasConflict: true,
        serverVersion: Math.floor(serverTimestamp / 1000),
        serverData: this.getServerDataFields(record),
      };
    }

    return { hasConflict: false };
  }
}

// Entity-specific resolvers
class CustomerConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Customer"; }
  protected getTable() { return customers; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      dni: record.dni,
      phone: record.phone,
      address: record.address,
      notes: record.notes,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class AbonoConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Abono"; }
  protected getTable() { return abonos; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      customerId: record.customerId,
      amount: record.amount,
      paymentMethod: record.paymentMethod,
      notes: record.notes,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class ProductConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Product"; }
  protected getTable() { return products; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      type: record.type,
      unit: record.unit,
      basePrice: record.basePrice,
      isActive: record.isActive,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class TagConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Tag"; }
  protected getTable() { return tags; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      color: record.color,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class CustomerTagConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "CustomerTag"; }
  protected getTable() { return customerTags; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      customerId: record.customerId,
      tagId: record.tagId,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class CustomerGroupConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "CustomerGroup"; }
  protected getTable() { return customerGroups; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      color: record.color,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class CustomerGroupMemberConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "CustomerGroupMember"; }
  protected getTable() { return customerGroupMembers; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      groupId: record.groupId,
      customerId: record.customerId,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class DistribucionConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Distribucion"; }
  protected getTable() { return distribuciones; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      estado: record.estado,
      montoRecaudado: record.montoRecaudado,
      fecha: record.fecha,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class VisitaConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Visita"; }
  protected getTable() { return visitas; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      distribucionId: record.distribucionId,
      customerId: record.customerId,
      status: record.status,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class PurchaseConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Purchase"; }
  protected getTable() { return purchases; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      supplierId: record.supplierId,
      purchaseDate: record.purchaseDate,
      status: record.status,
      totalAmount: record.totalAmount,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class PurchaseItemConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "PurchaseItem"; }
  protected getTable() { return purchaseItems; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      purchaseId: record.purchaseId,
      productId: record.productId,
      variantId: record.variantId,
      quantity: record.quantity,
      unitCost: record.unitCost,
      totalCost: record.totalCost,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class SupplierConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Supplier"; }
  protected getTable() { return suppliers; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      type: record.type,
      ruc: record.ruc,
      phone: record.phone,
      email: record.email,
      isActive: record.isActive,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class ClosingConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "Closing"; }
  protected getTable() { return closings; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      sellerId: record.sellerId,
      closingDate: record.closingDate,
      totalSales: record.totalSales,
      totalCash: record.totalCash,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class PuntoVentaConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "PuntoVenta"; }
  protected getTable() { return puntosVenta; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      type: record.type,
      address: record.address,
      isActive: record.isActive,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class ProductUnitConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "ProductUnit"; }
  protected getTable() { return productUnits; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      variantId: record.variantId,
      name: record.name,
      quantity: record.quantity,
      unidad: record.unidad,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class VariantInventoryConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "VariantInventory"; }
  protected getTable() { return variantInventory; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      variantId: record.variantId,
      quantity: record.quantity,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class FileConflictResolver extends BaseTimestampConflictResolver {
  protected getEntityName() { return "File"; }
  protected getTable() { return files; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getUpdatedAtField() { return "updatedAt"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      url: record.url,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

// Version-based resolver for Sales (existing)
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

// Sale item conflict resolver using parent sale's version
class SaleItemConflictResolver implements IConflictResolver {
  async checkConflict(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<ConflictCheckResult> {
    if (operation.operation === "create" || operation.operation === "delete") {
      return { hasConflict: false };
    }

    // Get the sale item
    const item = await tx.query.saleItems.findFirst({
      where: and(
        eq(saleItems.id, operation.entityId),
        eq(saleItems.businessId, ctx.businessId)
      ),
    });

    if (!item) {
      return { hasConflict: false };
    }

    // Get the parent sale for version checking
    const sale = await tx.query.sales.findFirst({
      where: and(
        eq(sales.id, item.saleId),
        eq(sales.businessId, ctx.businessId)
      ),
    });

    if (!sale) {
      return { hasConflict: false };
    }

    // Use parent sale's version for conflict detection
    if (sale.version > operation.localVersion) {
      logger.warn({
        msg: "⚠️ SaleItem conflict detected (parent sale modified)",
        entityId: operation.entityId,
        saleId: sale.id,
        serverVersion: sale.version,
        clientVersion: operation.localVersion,
      });

      return {
        hasConflict: true,
        serverVersion: sale.version,
        serverData: {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          updatedAt: item.updatedAt?.toISOString(),
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

// Registry with entity-specific resolvers
const resolvers: Record<string, IConflictResolver> = {
  customers: new CustomerConflictResolver(),
  sales: new VersionConflictResolver(),
  abonos: new AbonoConflictResolver(),
  distribuciones: new DistribucionConflictResolver(),
  products: new ProductConflictResolver(),
  tags: new TagConflictResolver(),
  customer_tags: new CustomerTagConflictResolver(),
  customer_groups: new CustomerGroupConflictResolver(),
  customer_group_members: new CustomerGroupMemberConflictResolver(),
  visitas: new VisitaConflictResolver(),
  purchases: new PurchaseConflictResolver(),
  purchase_items: new PurchaseItemConflictResolver(),
  suppliers: new SupplierConflictResolver(),
  closings: new ClosingConflictResolver(),
  puntos_venta: new PuntoVentaConflictResolver(),
  product_units: new ProductUnitConflictResolver(),
  variant_inventory: new VariantInventoryConflictResolver(),
  files: new FileConflictResolver(),
  sale_items: new SaleItemConflictResolver(),
};

export class ConflictResolverRegistry {
  static getResolver(entityType: SyncEntity): IConflictResolver {
    return resolvers[entityType] ?? new NoOpConflictResolver();
  }

  static registerResolver(entityType: SyncEntity, resolver: IConflictResolver): void {
    resolvers[entityType] = resolver;
  }
}

export { VersionConflictResolver, NoOpConflictResolver };
