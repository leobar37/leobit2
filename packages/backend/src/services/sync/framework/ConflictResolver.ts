import { and, eq, getTableName } from "drizzle-orm";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import { customers, sales, abonos, products, productVariants, tags, visitas, purchases, purchaseItems, suppliers, distribuciones, saleItems } from "../../../db/schema";
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
import {
  GenericConflictResolverRegistry,
  NoOpConflictResolver,
  type IGenericConflictResolver,
  type GenericSyncOperationInput,
  type ConflictCheckResult as LibConflictCheckResult,
} from "@avileo/drizzle-sync/server";

export interface ConflictCheckResult {
  hasConflict: boolean;
  serverVersion?: number;
  serverData?: Record<string, unknown>;
}

// Base class for version-based conflict detection (replaces timestamp-based)
abstract class BaseVersionConflictResolver implements IConflictResolver {
  protected abstract getEntityName(): string;
  protected abstract getTable(): any;
  protected abstract getIdField(): string;
  protected abstract getBusinessIdField(): string;
  protected abstract getVersionField(): string;
  protected abstract getServerDataFields(record: any): Record<string, unknown>;

  /**
   * Returns the Drizzle query relation name for tx.query[name].
   * Override when the SQL table name (snake_case) differs from the Drizzle export name (camelCase).
   */
  protected getQueryRelationName(): string | null {
    return null;
  }

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
    const versionField = this.getVersionField();

    const queryName = this.getQueryRelationName() ?? getTableName(table);
    const queryApi = (tx.query as Record<string, any>)[queryName];
    if (!queryApi) {
      logger.warn({
        msg: `⚠️ No query relation found for "${queryName}", skipping conflict check`,
        entityType: this.getEntityName(),
      });
      return { hasConflict: false };
    }

    const record = await queryApi.findFirst({
      where: and(
        eq(table[idField], operation.entityId),
        eq(table[businessIdField], ctx.businessId)
      ),
    });

    if (!record) {
      return { hasConflict: false };
    }

    const serverVersion = record[versionField] as number;
    const localVersion = operation.localVersion ?? 1;

    // Conflict detected: server has a newer version than what the client had when it made the change
    if (serverVersion > localVersion) {
      logger.warn({
        msg: `⚠️ ${this.getEntityName()} conflict detected`,
        entityId: operation.entityId,
        serverVersion,
        clientVersion: localVersion,
      });

      return {
        hasConflict: true,
        serverVersion,
        serverData: this.getServerDataFields(record),
      };
    }

    return { hasConflict: false };
  }
}

// @deprecated Use BaseVersionConflictResolver instead
// Kept for backward compatibility during transition
abstract class BaseTimestampConflictResolver extends BaseVersionConflictResolver {
  protected getVersionField(): string {
    return "version";
  }
}

// Entity-specific resolvers (now using version-based conflict detection)
class CustomerConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Customer"; }
  protected getTable() { return customers; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      dni: record.dni,
      phone: record.phone,
      address: record.address,
      notes: record.notes,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class AbonoConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Abono"; }
  protected getTable() { return abonos; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      customerId: record.customerId,
      amount: record.amount,
      paymentMethod: record.paymentMethod,
      notes: record.notes,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class ProductConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Product"; }
  protected getTable() { return products; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      unit: record.unit,
      basePrice: record.basePrice,
      isActive: record.isActive,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class ProductVariantConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "ProductVariant"; }
  protected getTable() { return productVariants; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getQueryRelationName() { return "productVariants"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      productId: record.productId,
      unitQuantity: record.unitQuantity,
      price: record.price,
      costPrice: record.costPrice,
      sortOrder: record.sortOrder,
      isActive: record.isActive,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class TagConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Tag"; }
  protected getTable() { return tags; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      color: record.color,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class CustomerTagConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "CustomerTag"; }
  protected getTable() { return customerTags; }
  protected getIdField() { return "customerId"; } // Composite key - uses customerId + tagId
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getQueryRelationName() { return "customerTags"; }
  protected getServerDataFields(record: any) {
    return {
      customerId: record.customerId,
      tagId: record.tagId,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class CustomerGroupConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "CustomerGroup"; }
  protected getTable() { return customerGroups; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getQueryRelationName() { return "customerGroups"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      color: record.color,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class CustomerGroupMemberConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "CustomerGroupMember"; }
  protected getTable() { return customerGroupMembers; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getQueryRelationName() { return "customerGroupMembers"; }
  protected getServerDataFields(record: any) {
    return {
      groupId: record.groupId,
      customerId: record.customerId,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class DistribucionConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Distribucion"; }
  protected getTable() { return distribuciones; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      estado: record.estado,
      montoRecaudado: record.montoRecaudado,
      fecha: record.fecha,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class VisitaConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Visita"; }
  protected getTable() { return visitas; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      distribucionId: record.distribucionId,
      customerId: record.customerId,
      status: record.status,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class PurchaseConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Purchase"; }
  protected getTable() { return purchases; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      supplierId: record.supplierId,
      purchaseDate: record.purchaseDate,
      status: record.status,
      totalAmount: record.totalAmount,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class PurchaseItemConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "PurchaseItem"; }
  protected getTable() { return purchaseItems; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getQueryRelationName() { return "purchaseItems"; }
  protected getServerDataFields(record: any) {
    return {
      purchaseId: record.purchaseId,
      productId: record.productId,
      variantId: record.variantId,
      quantity: record.quantity,
      unitCost: record.unitCost,
      totalCost: record.totalCost,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class SupplierConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "Supplier"; }
  protected getTable() { return suppliers; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      type: record.type,
      ruc: record.ruc,
      phone: record.phone,
      email: record.email,
      isActive: record.isActive,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class PuntoVentaConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "PuntoVenta"; }
  protected getTable() { return puntosVenta; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getQueryRelationName() { return "puntosVenta"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      type: record.type,
      address: record.address,
      isActive: record.isActive,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class ProductUnitConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "ProductUnit"; }
  protected getTable() { return productUnits; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getQueryRelationName() { return "productUnits"; }
  protected getServerDataFields(record: any) {
    return {
      variantId: record.variantId,
      name: record.name,
      quantity: record.quantity,
      unidad: record.unidad,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class VariantInventoryConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "VariantInventory"; }
  protected getTable() { return variantInventory; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getQueryRelationName() { return "variantInventory"; }
  protected getServerDataFields(record: any) {
    return {
      variantId: record.variantId,
      quantity: record.quantity,
      version: record.version,
      updatedAt: record.updatedAt?.toISOString(),
    };
  }
}

class FileConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "File"; }
  protected getTable() { return files; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record: any) {
    return {
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      url: record.url,
      version: record.version,
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

export function createConflictResolvers(): Record<string, IConflictResolver> {
  return {
    customers: new CustomerConflictResolver(),
    sales: new VersionConflictResolver(),
    abonos: new AbonoConflictResolver(),
    distribuciones: new DistribucionConflictResolver(),
    products: new ProductConflictResolver(),
    product_variants: new ProductVariantConflictResolver(),
    tags: new TagConflictResolver(),
    customer_tags: new CustomerTagConflictResolver(),
    customer_groups: new CustomerGroupConflictResolver(),
    customer_group_members: new CustomerGroupMemberConflictResolver(),
    visitas: new VisitaConflictResolver(),
    purchases: new PurchaseConflictResolver(),
    purchase_items: new PurchaseItemConflictResolver(),
    suppliers: new SupplierConflictResolver(),
    puntos_venta: new PuntoVentaConflictResolver(),
    product_units: new ProductUnitConflictResolver(),
    variant_inventory: new VariantInventoryConflictResolver(),
    files: new FileConflictResolver(),
    sale_items: new SaleItemConflictResolver(),
  };
}

/**
 * Adapter that wraps a backend IConflictResolver to implement the library's IGenericConflictResolver.
 * This allows the backend's conflict resolvers to be registered in the library's GenericConflictResolverRegistry.
 */
class ConflictResolverAdapter {
  constructor(
    private resolver: IConflictResolver,
    private _entityType: string
  ) {}

  /**
   * Implements IGenericConflictResolver.checkConflict().
   * Accepts GenericSyncOperationInput<string> from the library, casts to SyncOperationInput,
   * and delegates to the backend's IConflictResolver.
   */
  async checkConflict(
    ctx: RequestContext,
    operation: GenericSyncOperationInput<string>,
    tx: DbTransaction
  ): Promise<LibConflictCheckResult> {
    // Cast GenericSyncOperationInput to SyncOperationInput (they have identical structure)
    return this.resolver.checkConflict(ctx, operation as SyncOperationInput, tx);
  }
}

/**
 * Creates a GenericConflictResolverRegistry with all backend conflict resolvers registered.
 * This enables the library's SyncEngine to use the backend's custom conflict resolvers
 * via the registry interface.
 */
export function createConflictResolverRegistry(): GenericConflictResolverRegistry<string, RequestContext, DbTransaction> {
  const registry = new GenericConflictResolverRegistry<string, RequestContext, DbTransaction>();
  const resolvers = createConflictResolvers();

  for (const [entityType, resolver] of Object.entries(resolvers)) {
    const adapter = new ConflictResolverAdapter(resolver, entityType);
    registry.register(entityType, adapter as unknown as IGenericConflictResolver<RequestContext, DbTransaction, string>);
  }

  // Set NoOpConflictResolver as the default fallback
  registry.setDefaultResolver(new NoOpConflictResolver<RequestContext, DbTransaction>());

  return registry;
}

export { VersionConflictResolver, NoOpConflictResolver };
