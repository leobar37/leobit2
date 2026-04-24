import type { SyncEntity } from "@avileo/shared";

export type { SyncEntity } from "@avileo/shared";

export type SyncOperationType = "create" | "update" | "delete";

export interface SyncOperationInput {
  idempotencyKey: string;
  entityType: SyncEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  localVersion: number;
  localTimestamp: string;
  correlationId?: string;
  deviceId?: string;
  sourceFingerprint?: string;
  error?: string;
}

export interface SyncOperationResult {
  idempotencyKey: string;
  success: boolean;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp: string;
}

export interface SyncBatchResult {
  results: SyncOperationResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  };
}

// Re-export EntityRegistry from library for convenience
export type { EntityRegistry } from "@avileo/drizzle-sync/server";

// SyncEngineDeps - dependencies for SyncEngine
// This must be kept in sync with the library's SyncEngineDeps interface
import type { CustomerRepository } from "../repository/customer.repository";
import type { SaleRepository } from "../repository/sale.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { DistribucionService } from "../business/distribucion.service";
import type { ProductRepository } from "../repository/product.repository";
import type { TagRepository } from "../repository/tag.repository";
import type { CustomerTagRepository } from "../repository/customer-tag.repository";
import type { PurchaseRepository } from "../repository/purchase.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { CustomerGroupRepository } from "../repository/customer-group.repository";
import type { VisitaRepository } from "../repository/visita.repository";
import type { SupplierRepository } from "../repository/supplier.repository";
import type { FileRepository } from "../repository/file.repository";
import type { SyncConflictRepository } from "./framework/SyncConflictRepository";
import type { IConflictResolver } from "./framework/types";

export interface SyncEngineDeps {
  // Index signature required by library's SyncHandlerDeps interface
  [key: string]: unknown;
  customerRepo: CustomerRepository;
  saleRepo: SaleRepository;
  paymentRepo: PaymentRepository;
  distribucionRepo: DistribucionRepository;
  distribucionItemRepo: DistribucionItemRepository;
  distribucionService: DistribucionService;
  productRepo: ProductRepository;
  tagRepo: TagRepository;
  customerTagRepo: CustomerTagRepository;
  purchaseRepo: PurchaseRepository;
  variantRepo: ProductVariantRepository;
  customerGroupRepo: CustomerGroupRepository;
  visitaRepo: VisitaRepository;
  supplierRepo: SupplierRepository;
  fileRepo: FileRepository;
  syncConflictRepo?: SyncConflictRepository;
  /**
   * Conflict resolvers map (instance-based).
   * Replaces the deprecated static ConflictResolverRegistry.
   * If not provided, defaults to all standard entity resolvers via createConflictResolvers().
   */
  conflictResolvers?: Record<string, IConflictResolver>;
}
