import type { SyncEngineDeps } from "../types";
import type { ISyncHandler } from "../framework/types";
import { SyncHandlerBuilder, GenericSyncHandler, type SyncRequestContext } from "@avileo/drizzle-sync/server";
import type { IGenericHandlerConfig } from "@avileo/drizzle-sync/server";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import {
  customerCreateSchema,
  customerUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  supplierCreateSchema,
  supplierUpdateSchema,
  tagCreateSchema,
  tagUpdateSchema,
  customerGroupCreateSchema,
  customerGroupUpdateSchema,
  productVariantCreateSchema,
  productVariantUpdateSchema,
  customerGroupMemberCreateSchema,
  visitaCreateSchema,
  visitaUpdateSchema,
  saleItemOperationSchema,
  purchaseItemCreateSchema,
  purchaseItemUpdateSchema,
  abonoCreateSchema,
  abonoUpdateSchema,
  distribucionItemSyncCreateSchema,
  distribucionItemSyncUpdateSchema,
  fileCreateSchema,
  fileUpdateSchema,
} from "../schemas";
import type { CustomerRepository } from "../../repository/customer.repository";
import type { ProductRepository } from "../../repository/product.repository";
import type { SaleRepository } from "../../repository/sale.repository";
import type { PurchaseRepository } from "../../repository/purchase.repository";
import type { PaymentRepository } from "../../repository/payment.repository";

// ─── Context casting helpers ─────────────────────────────────────────────────────

/**
 * Cast SyncRequestContext to RequestContext for repository calls.
 * SyncRequestContext only has businessId/businessUserId, but repository methods
 * expect the full RequestContext. This is safe because at runtime the actual
 * RequestContext is passed, and we only use businessId/businessUserId in handlers.
 */
const toRequestContext = (ctx: SyncRequestContext): RequestContext =>
  ctx as unknown as RequestContext;

/**
 * Cast unknown transaction to DbTransaction for repository calls.
 * GenericRepo defines tx as unknown, but backend repositories expect PgTransaction.
 * This double-cast (through unknown) is required by TypeScript's type system.
 */
const toDbTx = (tx: unknown): DbTransaction | undefined =>
  tx as unknown as DbTransaction | undefined;

// ─── Shared handler configs ─────────────────────────────────────────────────────

const customerConfig: IGenericHandlerConfig = {
  entityType: "customers",
  schemas: { create: customerCreateSchema, update: customerUpdateSchema },
  createFieldMapping: { name: "name", dni: "dni", phone: "phone", address: "address", notes: "notes" },
  updateFieldMapping: { name: "name", dni: "dni", phone: "phone", address: "address", notes: "notes" },
};

const productConfig: IGenericHandlerConfig = {
  entityType: "products",
  schemas: { create: productCreateSchema, update: productUpdateSchema },
  createFieldMapping: {
    name: "name", unit: "unit", basePrice: "basePrice", costPrice: "costPrice",
    isActive: "isActive", imageId: "imageId", hasVariants: "hasVariants",
  },
  updateFieldMapping: { name: "name", unit: "unit", basePrice: "basePrice", isActive: "isActive", imageId: "imageId" },
  createDefaults: { unit: "kg", basePrice: "0", costPrice: "0", isActive: true, hasVariants: false },
};

const tagConfig: IGenericHandlerConfig = {
  entityType: "tags",
  schemas: { create: tagCreateSchema, update: tagUpdateSchema },
  createFieldMapping: { name: "name", color: "color" },
  updateFieldMapping: { name: "name", color: "color" },
};

const supplierConfig: IGenericHandlerConfig = {
  entityType: "suppliers",
  schemas: { create: supplierCreateSchema, update: supplierUpdateSchema },
  createFieldMapping: {
    name: "name", type: "type", ruc: "ruc", address: "address",
    phone: "phone", email: "email", notes: "notes", isActive: "isActive",
  },
  updateFieldMapping: {
    name: "name", type: "type", ruc: "ruc", address: "address",
    phone: "phone", email: "email", notes: "notes", isActive: "isActive",
  },
};

const customerGroupConfig: IGenericHandlerConfig = {
  entityType: "customer_groups",
  schemas: { create: customerGroupCreateSchema, update: customerGroupUpdateSchema },
  createFieldMapping: { name: "name" },
  updateFieldMapping: { name: "name" },
};

const productVariantConfig: IGenericHandlerConfig = {
  entityType: "product_variants",
  schemas: { create: productVariantCreateSchema, update: productVariantUpdateSchema },
  createFieldMapping: {
    productId: "productId", name: "name", sku: "sku", unitQuantity: "unitQuantity",
    price: "price", costPrice: "costPrice", sortOrder: "sortOrder", isActive: "isActive",
  },
  updateFieldMapping: {
    name: "name", sku: "sku", unitQuantity: "unitQuantity",
    price: "price", costPrice: "costPrice", sortOrder: "sortOrder", isActive: "isActive",
  },
};

// ─── Production handler factories ───────────────────────────────────────────────

export function createTagHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("tags")
    .withSchemas(tagCreateSchema, tagUpdateSchema)
    .withCreateFields({ name: "name", color: "color" })
    .withUpdateFields({ name: "name", color: "color" })
    .withRepo({
      create: (ctx, data, tx) => deps.tagRepo.create(toRequestContext(ctx), data as Parameters<typeof deps.tagRepo.create>[1], toDbTx(tx)),
      findById: (ctx, id, tx) => deps.tagRepo.findById(toRequestContext(ctx), id, toDbTx(tx)) as Promise<unknown | undefined>,
      update: (ctx, id, data, tx) => deps.tagRepo.update(toRequestContext(ctx), id, data as Parameters<typeof deps.tagRepo.update>[2], toDbTx(tx)).then(r => !!r),
      delete: (ctx, id) => deps.tagRepo.delete(toRequestContext(ctx), id),
    })
    .build();
}

export function createCustomerHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("customers")
    .withSchemas(customerCreateSchema, customerUpdateSchema)
    .withCreateFields({ name: "name", dni: "dni", phone: "phone", address: "address", notes: "notes" })
    .withUpdateFields({ name: "name", dni: "dni", phone: "phone", address: "address", notes: "notes" })
    .withRepo({
      create: (ctx, data, tx) => deps.customerRepo.create(toRequestContext(ctx), data as Parameters<typeof deps.customerRepo.create>[1], toDbTx(tx)),
      findById: (ctx, id, tx) => deps.customerRepo.findById(toRequestContext(ctx), id, toDbTx(tx)) as Promise<unknown | undefined>,
      update: (ctx, id, data, tx) => deps.customerRepo.update(toRequestContext(ctx), id, data as Parameters<typeof deps.customerRepo.update>[2], toDbTx(tx)).then(r => !!r),
      delete: (ctx, id) => deps.customerRepo.delete(toRequestContext(ctx), id),
    })
    .build();
}

export function createProductHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("products")
    .withSchemas(productCreateSchema, productUpdateSchema)
    .withCreateFields({
      name: "name", unit: "unit", basePrice: "basePrice", costPrice: "costPrice",
      isActive: "isActive", imageId: "imageId", hasVariants: "hasVariants",
    })
    .withUpdateFields({ name: "name", unit: "unit", basePrice: "basePrice", isActive: "isActive", imageId: "imageId" })
    .withCreateDefaults({ unit: "kg", basePrice: "0", costPrice: "0", isActive: true, hasVariants: false })
    .withRepo({
      create: (ctx, data, tx) => deps.productRepo.create(toRequestContext(ctx), data as Parameters<typeof deps.productRepo.create>[1], toDbTx(tx)),
      findById: (ctx, id) => deps.productRepo.findById(toRequestContext(ctx), id) as Promise<unknown | undefined>,
      update: (ctx, id, data, tx) => deps.productRepo.update(toRequestContext(ctx), id, data as Parameters<typeof deps.productRepo.update>[2], toDbTx(tx)).then(r => !!r),
      delete: (ctx, id) => deps.productRepo.delete(toRequestContext(ctx), id),
    })
    .build();
}

export function createSupplierHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("suppliers")
    .withSchemas(supplierCreateSchema, supplierUpdateSchema)
    .withCreateFields({
      name: "name", type: "type", ruc: "ruc", address: "address",
      phone: "phone", email: "email", notes: "notes", isActive: "isActive",
    })
    .withUpdateFields({
      name: "name", type: "type", ruc: "ruc", address: "address",
      phone: "phone", email: "email", notes: "notes", isActive: "isActive",
    })
    .withRepo({
      create: (ctx, data, tx) => deps.supplierRepo.create(toRequestContext(ctx), data as Parameters<typeof deps.supplierRepo.create>[1], toDbTx(tx)),
      findById: (ctx, id) => deps.supplierRepo.findById(toRequestContext(ctx), id) as Promise<unknown | undefined>,
      update: (ctx, id, data, tx) => deps.supplierRepo.update(toRequestContext(ctx), id, data as Parameters<typeof deps.supplierRepo.update>[2], toDbTx(tx)).then(r => !!r),
      delete: (ctx, id) => deps.supplierRepo.delete(toRequestContext(ctx), id),
    })
    .build();
}

export function createCustomerGroupHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("customer_groups")
    .withSchemas(customerGroupCreateSchema, customerGroupUpdateSchema)
    .withCreateFields({ name: "name" })
    .withUpdateFields({ name: "name" })
    .withRepo({
      create: (ctx, data) => deps.customerGroupRepo.create(toRequestContext(ctx), data as Parameters<typeof deps.customerGroupRepo.create>[1]),
      findById: (ctx, id, tx) => deps.customerGroupRepo.findById(toRequestContext(ctx), id, toDbTx(tx)) as Promise<unknown | undefined>,
      update: (ctx, id, data) => deps.customerGroupRepo.update(toRequestContext(ctx), id, data as Parameters<typeof deps.customerGroupRepo.update>[2]).then(r => !!r),
      delete: (ctx, id) => deps.customerGroupRepo.delete(toRequestContext(ctx), id),
    })
    .build();
}

export function createProductVariantHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("product_variants")
    .withSchemas(productVariantCreateSchema, productVariantUpdateSchema)
    .withCreateFields({
      productId: "productId", name: "name", sku: "sku", unitQuantity: "unitQuantity",
      price: "price", costPrice: "costPrice", sortOrder: "sortOrder", isActive: "isActive",
    })
    .withUpdateFields({
      name: "name", sku: "sku", unitQuantity: "unitQuantity",
      price: "price", costPrice: "costPrice", sortOrder: "sortOrder", isActive: "isActive",
    })
    .withParentCheck({
      parentIdField: "productId",
      parentName: "Producto",
      findParent: (ctx, parentId) =>
        deps.productRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    })
    .withRepo({
      create: (ctx, data, tx) => deps.variantRepo.create(toRequestContext(ctx), data as unknown as Parameters<typeof deps.variantRepo.create>[1], toDbTx(tx)),
      findById: (ctx, id) => deps.variantRepo.findById(toRequestContext(ctx), id) as Promise<unknown | undefined>,
      update: (ctx, id, data, tx) => deps.variantRepo.update(toRequestContext(ctx), id, data as Parameters<typeof deps.variantRepo.update>[2], toDbTx(tx)).then(r => !!r),
      delete: (ctx, id) => deps.variantRepo.delete(toRequestContext(ctx), id),
    })
    .build();
}

// ─── Custom-operation handlers (join tables, non-CRUD ops) ───────────────────

export function createCustomerGroupMemberHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("customer_group_members")
    .withSchemas(customerGroupMemberCreateSchema, customerGroupMemberCreateSchema.partial())
    .withSupportedOperations(["create", "delete"])
    .withParentCheck({
      parentIdField: "groupId",
      parentName: "Grupo",
      findParent: (ctx, parentId) =>
        deps.customerGroupRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    })
    .withCustomCreate(async (ctx, entityId, data, tx) => {
      await deps.customerGroupRepo.addMembers(
        toRequestContext(ctx),
        data.groupId as string,
        [data.customerId as string],
        toDbTx(tx)
      );
    })
    .withCustomDelete(async (ctx, entityId, data, tx) => {
      try {
        await deps.customerGroupRepo.removeMember(
          toRequestContext(ctx),
          data.groupId as string,
          data.customerId as string,
          toDbTx(tx)
        );
      } catch (error) {
        if (error instanceof Error && error.message === "Group not found") {
          return; // Skip silently
        }
        throw error;
      }
    })
    .build();
}

export function createCustomerTagHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("customer_tags")
    .withSchemas(customerGroupMemberCreateSchema, customerGroupMemberCreateSchema.partial())
    .withSupportedOperations(["create", "delete"])
    .withParentCheck({
      parentIdField: "customerId",
      parentName: "Cliente",
      findParent: (ctx, parentId) =>
        deps.customerRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    })
    .withAdditionalParentChecks([{
      field: "tagId",
      parentName: "Etiqueta",
      findParent: (ctx, parentId) =>
        deps.tagRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    }])
    .withCustomCreate(async (ctx, entityId, data, tx) => {
      await deps.customerTagRepo.addTag(
        toRequestContext(ctx),
        data.customerId as string,
        data.tagId as string,
        toDbTx(tx)
      );
    })
    .withCustomDelete(async (ctx, entityId, data, tx) => {
      await deps.customerTagRepo.removeTag(
        toRequestContext(ctx),
        data.customerId as string,
        data.tagId as string,
        toDbTx(tx)
      );
    })
    .build();
}

export function createVisitaHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("visitas")
    .withSchemas(visitaCreateSchema, visitaUpdateSchema)
    .withCreateFields({ distribucionId: "distribucionId", customerId: "customerId" })
    .withRepo({
      create: (ctx, data, tx) =>
        deps.visitaRepo.create(toRequestContext(ctx), data as unknown as Parameters<typeof deps.visitaRepo.create>[1]),
      findById: (ctx, id) =>
        deps.visitaRepo.findById(toRequestContext(ctx), id) as Promise<unknown | undefined>,
      update: async (ctx, id, data) => {
        const payload = data as {
          status?: "pendiente" | "compro" | "no_compra";
          motivoNoCompra?: string;
          saleId?: string;
        };

        if (!payload.status) {
          return false;
        }

        const updated = await deps.visitaRepo.updateStatus(toRequestContext(ctx), id, {
          status: payload.status,
          motivoNoCompra: payload.motivoNoCompra,
          saleId: payload.saleId,
        });

        return !!updated;
      },
      delete: (ctx, id) => deps.visitaRepo.delete(toRequestContext(ctx), id),
    })
    .withCustomUpdate(async (ctx, entityId, data, tx) => {
      const updateData = data as { status?: "pendiente" | "compro" | "no_compra"; motivoNoCompra?: string; saleId?: string };
      if (!updateData.status) {
        throw new Error("El estado es requerido para actualizar");
      }
      const result = await deps.visitaRepo.updateStatus(toRequestContext(ctx), entityId, {
        status: updateData.status,
        motivoNoCompra: updateData.motivoNoCompra,
        saleId: updateData.saleId,
      });
      if (!result) {
        throw new Error("Visita no encontrada");
      }
    })
    .build();
}

export function createSaleItemHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("sale_items")
    .withSchemas(saleItemOperationSchema, saleItemOperationSchema)
    .withSupportedOperations(["create", "update", "delete"])
    .withTxRequired(true)
    .withSkipOnParentMissing()
    .withParentCheck({
      parentIdField: "saleId",
      parentName: "Venta",
      findParent: (ctx, parentId) =>
        deps.saleRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    })
    .withCustomCreate(async (ctx, entityId, data, tx) => {
      await deps.saleRepo.addItem(toRequestContext(ctx), data.saleId as string, {
        id: entityId,
        productId: data.productId as string,
        productName: data.productName as string,
        variantId: (data.variantId as string) || "",
        variantName: (data.variantName as string) || "",
        quantity: (data.quantity as string) || "0",
        orderedQuantity: data.orderedQuantity as string | undefined,
        unitPrice: (data.unitPrice as string) || "0",
        unitPriceQuoted: data.unitPriceQuoted as string | undefined,
        subtotal: data.subtotal as string,
      }, toDbTx(tx));
    })
    .withCustomUpdate(async (ctx, entityId, data, tx) => {
      await deps.saleRepo.updateItem(toRequestContext(ctx), data.saleId as string, entityId, {
        quantity: data.quantity as string | undefined,
        unitPrice: data.unitPrice as string | undefined,
        subtotal: data.subtotal as string | undefined,
        isModified: true,
      }, toDbTx(tx));
    })
    .withCustomDelete(async (ctx, entityId, data, tx) => {
      const existing = await deps.saleRepo.findItemById(toRequestContext(ctx), data.saleId as string, entityId, toDbTx(tx));
      if (!existing) return;
      await deps.saleRepo.deleteItem(toRequestContext(ctx), data.saleId as string, entityId, toDbTx(tx));
    })
    .withPostOperation(async (ctx, parsed, operation, tx) => {
      await deps.saleRepo.recalculateTotalsAtomically(toRequestContext(ctx), parsed.saleId as string, toDbTx(tx));
    })
    .build();
}

export function createPurchaseItemHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("purchase_items")
    .withSchemas(purchaseItemCreateSchema, purchaseItemUpdateSchema)
    .withSupportedOperations(["create", "update", "delete"])
    .withSkipOnParentMissing()
    .withParentCheck({
      parentIdField: "purchaseId",
      parentName: "Compra",
      findParent: (ctx, parentId) =>
        deps.purchaseRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    })
    .withCustomCreate(async (ctx, entityId, data, tx) => {
      // Idempotency check
      const existing = await deps.purchaseRepo.findItemById(
        toRequestContext(ctx),
        data.purchaseId as string,
        entityId,
        toDbTx(tx)
      );
      if (existing) return;

      await deps.purchaseRepo.addItem(
        toRequestContext(ctx),
        data.purchaseId as string,
        {
          id: entityId,
          productId: data.productId as string,
          variantId: data.variantId as string | null,
          unitId: data.unitId as string | null,
          quantity: data.quantity as string,
          unitCost: data.unitCost as string,
          totalCost: data.totalCost as string,
        },
        toDbTx(tx)
      );
      await deps.purchaseRepo.updateTotal(toRequestContext(ctx), data.purchaseId as string, toDbTx(tx));
    })
    .withCustomUpdate(async (ctx, entityId, data, tx) => {
      await deps.purchaseRepo.updateItem(
        toRequestContext(ctx),
        data.purchaseId as string,
        entityId,
        {
          quantity: data.quantity as string,
          unitCost: data.unitCost as string,
          totalCost: data.totalCost as string,
        },
        toDbTx(tx)
      );
      await deps.purchaseRepo.updateTotal(toRequestContext(ctx), data.purchaseId as string, toDbTx(tx));
    })
    .withCustomDelete(async (ctx, entityId, data, tx) => {
      const existing = await deps.purchaseRepo.findItemById(
        toRequestContext(ctx),
        data.purchaseId as string,
        entityId,
        toDbTx(tx)
      );
      if (!existing) return;
      await deps.purchaseRepo.deleteItem(toRequestContext(ctx), data.purchaseId as string, entityId, toDbTx(tx));
      await deps.purchaseRepo.updateTotal(toRequestContext(ctx), data.purchaseId as string, toDbTx(tx));
    })
    .build();
}

export function createDistribucionItemHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("distribucion_items")
    .withSchemas(distribucionItemSyncCreateSchema, distribucionItemSyncUpdateSchema)
    .withSupportedOperations(["create", "update", "delete"])
    .withSkipOnParentMissing()
    .withParentCheck({
      parentIdField: "distribucionId",
      parentName: "Distribución",
      findParent: (ctx, parentId) =>
        deps.distribucionRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    })
    .withCustomCreate(async (ctx, entityId, data, tx) => {
      const existing = await deps.distribucionItemRepo.findById(toRequestContext(ctx), entityId);
      if (existing) return;

      await deps.distribucionItemRepo.create(toRequestContext(ctx), {
        distribucionId: data.distribucionId as string,
        variantId: data.variantId as string,
        cantidadAsignada: data.cantidadAsignada as string,
        cantidadVendida: (data.cantidadVendida as string) || "0",
        unidad: (data.unidad as string) || "kg",
      }, toDbTx(tx));
    })
    .withCustomUpdate(async (ctx, entityId, data, tx) => {
      if (data.cantidadAsignada !== undefined) {
        await deps.distribucionItemRepo.updateAsignada(toRequestContext(ctx), entityId, data.cantidadAsignada as string, toDbTx(tx));
      }
      if (data.cantidadVendida !== undefined) {
        await deps.distribucionItemRepo.updateVendido(toRequestContext(ctx), entityId, data.cantidadVendida as string, toDbTx(tx));
      }
      if (data.unidad !== undefined) {
        await deps.distribucionItemRepo.updateUnidad(toRequestContext(ctx), entityId, data.unidad as string, toDbTx(tx));
      }
    })
    .withCustomDelete(async (ctx, entityId, data, tx) => {
      const existing = await deps.distribucionItemRepo.findById(toRequestContext(ctx), entityId);
      if (!existing) return;
      await deps.distribucionItemRepo.delete(toRequestContext(ctx), entityId);
    })
    .build();
}

export function createAbonoHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("abonos")
    .withSchemas(abonoCreateSchema, abonoUpdateSchema)
    .withSupportedOperations(["create", "update", "delete"])
    .withPayloadEnricher((ctx, payload) => ({
      ...payload,
      sellerId: (payload.sellerId as string) || ctx.businessUserId,
    }))
    .withParentCheck({
      parentIdField: "customerId",
      parentName: "Cliente",
      findParent: (ctx, parentId) =>
        deps.customerRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    })
    .withRepo({
      create: (ctx, data, tx) =>
        deps.paymentRepo.create(toRequestContext(ctx), data as Parameters<typeof deps.paymentRepo.create>[1], toDbTx(tx)),
      findById: (ctx, id, tx) =>
        deps.paymentRepo.findById(toRequestContext(ctx), id, toDbTx(tx)) as Promise<unknown | undefined>,
      update: (ctx, id, data, tx) =>
        deps.paymentRepo.update(toRequestContext(ctx), id, data as Parameters<typeof deps.paymentRepo.update>[2], toDbTx(tx), undefined).then(r => !!r),
      delete: (ctx, id, tx) => deps.paymentRepo.delete(toRequestContext(ctx), id, toDbTx(tx)),
    })
    .withVersionConflictField("version")
    .withCustomUpdate(async (ctx, entityId, data, tx, operation) => {
      const updateData = data as { proofImageId?: string; referenceNumber?: string; notes?: string; version?: number };
      const clientExpectedVersion = operation?.localVersion ?? updateData.version ?? 0;
      await deps.paymentRepo.update(toRequestContext(ctx), entityId, {
        proofImageId: updateData.proofImageId,
        referenceNumber: updateData.referenceNumber,
        notes: updateData.notes,
        version: clientExpectedVersion + 1,
      }, toDbTx(tx), clientExpectedVersion);
    })
    .build();
}

export function createAbonoSyncHandlerForTest(
  paymentRepo: PaymentRepository,
  customerRepo: CustomerRepository
): ISyncHandler {
  const enricher = (ctx: SyncRequestContext, payload: Record<string, unknown>) => ({
    ...payload,
    sellerId: (payload.sellerId as string) || ctx.businessUserId,
  });

  const builder = new SyncHandlerBuilder("abonos")
    .withSchemas(abonoCreateSchema, abonoUpdateSchema)
    .withSupportedOperations(["create", "update", "delete"])
    .withCreateFields({ customerId: "customerId", sellerId: "sellerId", amount: "amount", paymentMethod: "paymentMethod", notes: "notes" })
    .withUpdateFields({ proofImageId: "proofImageId", referenceNumber: "referenceNumber", notes: "notes" })
    .withPayloadEnricher(enricher)
    .withParentCheck({
      parentIdField: "customerId",
      parentName: "Cliente",
      findParent: (ctx, parentId) =>
        customerRepo.findById(toRequestContext(ctx), parentId) as Promise<unknown | undefined>,
    })
    .withRepo({
      create: (ctx, data, tx) =>
        paymentRepo.create(toRequestContext(ctx), data as Parameters<typeof paymentRepo.create>[1], toDbTx(tx)),
      findById: (ctx, id, tx) =>
        paymentRepo.findById(toRequestContext(ctx), id, toDbTx(tx)) as Promise<unknown | undefined>,
      update: (ctx, id, data, tx) =>
        paymentRepo.update(toRequestContext(ctx), id, data as Parameters<typeof paymentRepo.update>[2], toDbTx(tx), undefined).then(r => !!r),
      delete: (ctx, id, tx) => paymentRepo.delete(toRequestContext(ctx), id, toDbTx(tx)),
    })
    .withVersionConflictField("version")
    .withCustomUpdate(async (ctx, entityId, data, tx, operation) => {
      const updateData = data as { proofImageId?: string; referenceNumber?: string; notes?: string; version?: number };
      const clientExpectedVersion = operation?.localVersion ?? updateData.version ?? 0;
      await paymentRepo.update(toRequestContext(ctx), entityId, {
        proofImageId: updateData.proofImageId,
        referenceNumber: updateData.referenceNumber,
        notes: updateData.notes,
        version: clientExpectedVersion + 1,
      }, toDbTx(tx), clientExpectedVersion);
    });

  return builder.build();
}

export function createFileHandler(deps: SyncEngineDeps): ISyncHandler {
  return new SyncHandlerBuilder("files")
    .withSchemas(fileCreateSchema, fileUpdateSchema)
    .withSupportedOperations(["create", "update", "delete"])
    .withCreateFields({
      id: "id",
      filename: "filename",
      storagePath: "storagePath",
      mimeType: "mimeType",
      sizeBytes: "sizeBytes",
    })
    .withUpdateFields({
      filename: "filename",
      storagePath: "storagePath",
      mimeType: "mimeType",
      sizeBytes: "sizeBytes",
    })
    .withRepo({
      create: (ctx, data, tx) =>
        deps.fileRepo.create(toRequestContext(ctx), data as Parameters<typeof deps.fileRepo.create>[1]),
      findById: (ctx, id) =>
        deps.fileRepo.findById(toRequestContext(ctx), id) as Promise<unknown | undefined>,
      update: (ctx, id, data, tx) =>
        deps.fileRepo.update(toRequestContext(ctx), id, data as Parameters<typeof deps.fileRepo.update>[2], toDbTx(tx), undefined).then(r => !!r),
      delete: (ctx, id, tx) => deps.fileRepo.softDelete(toRequestContext(ctx), id),
    })
    .withVersionConflictField("version")
    .build();
}

// ─── Test factory functions ─────────────────────────────────────────────────────

function customerRepoAdapter(repo: CustomerRepository) {
  return {
    create: (ctx: RequestContext, data: unknown, tx?: DbTransaction) =>
      repo.create(ctx, data as Parameters<typeof repo.create>[1], toDbTx(tx)),
    findById: (ctx: RequestContext, id: string, tx?: DbTransaction) =>
      repo.findById(ctx, id, toDbTx(tx)) as Promise<unknown | undefined>,
    update: (ctx: RequestContext, id: string, data: unknown, tx?: DbTransaction) =>
      repo.update(ctx, id, data as Parameters<typeof repo.update>[2], toDbTx(tx)).then(r => !!r),
    delete: (ctx: RequestContext, id: string) => repo.delete(ctx, id),
  };
}

function productRepoAdapter(repo: ProductRepository) {
  return {
    create: (ctx: RequestContext, data: unknown, tx?: DbTransaction) =>
      repo.create(ctx, data as Parameters<typeof repo.create>[1], toDbTx(tx)),
    findById: (ctx: RequestContext, id: string) =>
      repo.findById(ctx, id) as Promise<unknown | undefined>,
    update: (ctx: RequestContext, id: string, data: unknown, tx?: DbTransaction) =>
      repo.update(ctx, id, data as Parameters<typeof repo.update>[2], toDbTx(tx)).then(r => !!r),
    delete: (ctx: RequestContext, id: string) => repo.delete(ctx, id),
  };
}

export function createCustomerSyncHandlerForTest(repo: CustomerRepository): ISyncHandler {
  return GenericSyncHandler.createWithRepo(
    customerConfig as IGenericHandlerConfig<Record<string, unknown>, Record<string, unknown>>,
    customerRepoAdapter(repo)
  );
}

export function createProductSyncHandlerForTest(repo: ProductRepository): ISyncHandler {
  return GenericSyncHandler.createWithRepo(
    productConfig as IGenericHandlerConfig<Record<string, unknown>, Record<string, unknown>>,
    productRepoAdapter(repo)
  );
}
