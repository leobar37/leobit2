/**
 * Supplier Service
 * 
 * This file extends the generated SuppliersService from drizzle-sync
 * to preserve the custom search functionality while leveraging
 * the generated CRUD operations.
 * 
 * Generated at: 2026-04-19
 */

import type { SyncClientEngineLike } from "./base-service";
import { eq, like, and, desc } from "drizzle-orm";
import type { Suppliers as Supplier } from "~/lib/sync/generated/schema";

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
  /**
   * Find all this.tables.suppliers for the current business
   * Optionally filtered by search query
   * 
   * NOTE: This overrides the generated method to add search functionality
   */
  async findByBusiness(options?: { search?: string; limit?: number; offset?: number; sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<Supplier[]> {
    const search = options?.search;
    const conditions = [this.businessId ? eq(this.tables.suppliers.businessId, this.businessId) : undefined];

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(like(this.tables.suppliers.name, searchPattern) as never);
    }

    const validConditions = conditions.filter((c): c is NonNullable<typeof c> => c !== undefined);

    const result = await this.db
      .select()
      .from(this.tables.suppliers)
      .where(validConditions.length > 1 ? and(...validConditions) : validConditions[0])
      .orderBy(desc(this.tables.suppliers.createdAt));

    return result as Supplier[];
  }
}
