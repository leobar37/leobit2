/**
 * Supplier Service
 * Local-first supplier entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, type Supplier } from "@avileo/shared";
import { mapToCamelCase } from "../mappers/entity-mapper";

/** Input for creating a new supplier */
export interface CreateSupplierInput {
  name: string;
  type?: "generic" | "regular" | "internal";
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/** Input for updating an existing supplier */
export interface UpdateSupplierInput {
  name?: string;
  type?: "generic" | "regular" | "internal";
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

/** Search filters for finding suppliers */
export interface SupplierSearchFilters {
  search?: string;
  type?: "generic" | "regular" | "internal";
  isActive?: boolean;
}

/**
 * Supplier Service
 * Provides CRUD operations for suppliers with local-first approach
 * and automatic sync to server
 */
export class SupplierService extends BaseService {
  private static readonly TABLE_NAME = "suppliers";
  private static readonly ENTITY_TYPE: EntityType = "suppliers";
  private static readonly ID_PREFIX = "supp";

  constructor(pg: PGlite, syncService: SyncService, businessId: string) {
    super(pg, syncService, businessId);
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
    const result = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM ${SupplierService.TABLE_NAME} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapToCamelCase<Supplier>(result.rows[0]);
  }

  /**
   * Find all suppliers for the current business
   * Optionally filtered by search query
   */
  async findByBusiness(filters?: SupplierSearchFilters): Promise<Supplier[]> {
    const conditions: string[] = ["business_id = $1"];
    const params: (string | null)[] = [this.businessId];
    let paramIndex = 2;

    if (filters?.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR ruc ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(String(filters.isActive));
      paramIndex++;
    }

    const query = `SELECT * FROM ${SupplierService.TABLE_NAME} WHERE ${conditions.join(" AND ")} ORDER BY name ASC`;

    const result = await this.pg.query<Record<string, unknown>>(query, params);
    return result.rows.map((row) => mapToCamelCase<Supplier>(row));
  }

  /**
   * Create a new supplier
   * Stores locally and queues for server sync
   */
  async create(input: CreateSupplierInput): Promise<Supplier> {
    const id = this.generateId();
    const now = this.now();

    const supplier: Supplier = {
      id,
      name: input.name,
      type: input.type || "regular",
      ruc: input.ruc || null,
      phone: input.phone || null,
      address: input.address || null,
      email: input.email || null,
      notes: input.notes || null,
      isActive: true,
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      businessId: this.businessId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await this.pg.exec(
      `INSERT INTO ${SupplierService.TABLE_NAME} (
        id, name, type, ruc, phone, address, email, notes, is_active,
        sync_status, sync_attempts, business_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        supplier.id,
        supplier.name,
        supplier.type,
        supplier.ruc,
        supplier.phone,
        supplier.address,
        supplier.email,
        supplier.notes,
        supplier.isActive,
        supplier.syncStatus,
        supplier.syncAttempts,
        supplier.businessId,
        supplier.createdAt,
        supplier.updatedAt,
      ]
    );

    await this.queueSync("insert", id, {
      name: input.name,
      type: input.type,
      ruc: input.ruc,
      phone: input.phone,
      address: input.address,
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

    const updates: string[] = [];
    const params: (string | null)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(input.type);
    }
    if (input.ruc !== undefined) {
      updates.push(`ruc = $${paramIndex++}`);
      params.push(input.ruc ?? null);
    }
    if (input.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(input.phone ?? null);
    }
    if (input.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      params.push(input.address ?? null);
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(input.email ?? null);
    }
    if (input.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(input.notes ?? null);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(String(input.isActive));
    }

    const now = this.now();
    updates.push(`sync_status = $${paramIndex++}`);
    params.push(SyncStatus.PENDING);

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    // Add id as last parameter
    params.push(id);

    await this.pg.exec(
      `UPDATE ${SupplierService.TABLE_NAME} SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

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

    await this.pg.exec(
      `DELETE FROM ${SupplierService.TABLE_NAME} WHERE id = $1`,
      [id]
    );

    await this.queueSync("delete", id, {});
  }
}
