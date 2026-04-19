/**
 * Supplier Service
 * 
 * This file extends the generated SuppliersService from drizzle-sync
 * to preserve the custom search functionality while leveraging
 * the generated CRUD operations.
 * 
 * Generated at: 2026-04-19
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, like, and, desc } from "drizzle-orm";
import { SyncService } from "~/lib/sync/sync-service";
import { suppliers, type Supplier } from "@avileo/shared";

// Import the generated SuppliersService and its input types
import { 
  SuppliersService, 
  type CreateSuppliersInput, 
  type UpdateSuppliersInput 
} from "~/lib/sync/generated/services";

// Re-export types for backward compatibility
export type CreateSupplierInput = CreateSuppliersInput;
export type UpdateSupplierInput = UpdateSuppliersInput;

/** Supplier type enum - preserved from original implementation */
export type SupplierType = "generic" | "regular" | "internal";

/**
 * Supplier Service
 * Extends the generated SuppliersService with custom search functionality.
 */
export class SupplierService extends SuppliersService {
  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  /**
   * Find all suppliers for the current business
   * Optionally filtered by search query
   * 
   * NOTE: This overrides the generated method to add search functionality
   */
  async findByBusiness(search?: string): Promise<Supplier[]> {
    const conditions = [this.businessId ? eq(suppliers.businessId, this.businessId) : undefined];

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(like(suppliers.name, searchPattern) as never);
    }

    const validConditions = conditions.filter((c): c is NonNullable<typeof c> => c !== undefined);

    const result = await this.db
      .select()
      .from(suppliers)
      .where(validConditions.length > 1 ? and(...validConditions) : validConditions[0])
      .orderBy(desc(suppliers.createdAt));

    return result as Supplier[];
  }
}
