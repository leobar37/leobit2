/**
 * Supplier Service
 * Local-first supplier entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, suppliers } from "@avileo/shared";
import type { Supplier } from "@avileo/shared";
import { eq, like, and, desc } from "drizzle-orm";

/** Supplier type enum */
export type SupplierType = "generic" | "regular" | "internal";

/** Input for creating a new supplier */
export interface CreateSupplierInput {
  name: string;
  type?: SupplierType;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/** Input for updating an existing supplier */
export interface UpdateSupplierInput {
  name?: string;
  type?: SupplierType;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

/**
 * Supplier Service
 * Provides CRUD operations for suppliers with local-first approach
 * and automatic sync to server
 */
export class SupplierService extends BaseService {
  private static readonly ENTITY_TYPE: EntityType = "suppliers";
  private static readonly ID_PREFIX = "supp";

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  getEntityType(): EntityType {
    return SupplierService.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return SupplierService.ID_PREFIX;
  }

  /**
   * Find a supplier by ID
   */
  async findById(id: string): Promise<Supplier | null> {
    const result = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0] as Supplier;
  }

  /**
   * Find all suppliers for the current business
   * Optionally filtered by search query
   */
  async findByBusiness(search?: string): Promise<Supplier[]> {
    const conditions = [eq(suppliers.businessId, this.businessId)];

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(like(suppliers.name, searchPattern) as never);
    }

    const result = await this.db
      .select()
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(desc(suppliers.createdAt));

    return result as Supplier[];
  }

  /**
   * Create a new supplier
   * Stores locally and queues for server sync
   */
  async create(input: CreateSupplierInput): Promise<Supplier> {
    const id = this.generateId();
    const now = new Date(this.now());

    const supplier: Supplier = {
      id,
      businessId: this.businessId,
      name: input.name,
      type: input.type || "regular",
      ruc: input.ruc || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      notes: input.notes || null,
      isActive: true,
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(suppliers).values(supplier);

    await this.queueSync("insert", id, {
      name: input.name,
      type: input.type || "regular",
      ruc: input.ruc,
      address: input.address,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
    });

    return supplier;
  }

  /**
   * Update an existing supplier
   * Updates locally and queues for server sync
   */
  async update(id: string, input: UpdateSupplierInput): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Supplier not found: ${id}`);
    }

    const updateData: Partial<Supplier> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.ruc !== undefined) {
      updateData.ruc = input.ruc ?? null;
    }
    if (input.address !== undefined) {
      updateData.address = input.address ?? null;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone ?? null;
    }
    if (input.email !== undefined) {
      updateData.email = input.email ?? null;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes ?? null;
    }
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    updateData.syncStatus = SyncStatus.PENDING;
    updateData.updatedAt = new Date(this.now());

    await this.db
      .update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, id));

    await this.queueSync("update", id, input as Record<string, unknown>);
  }

  /**
   * Delete a supplier
   * Removes locally and queues deletion for server sync
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Supplier not found: ${id}`);
    }

    await this.db.delete(suppliers).where(eq(suppliers.id, id));

    await this.queueSync("delete", id, {});
  }
}
