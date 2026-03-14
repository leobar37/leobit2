/**
 * Customer Service
 * Local-first customer entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, type Customer } from "@avileo/shared";
import { mapToCamelCase } from "../mappers/entity-mapper";

/** Input for creating a new customer */
export interface CreateCustomerInput {
  name: string;
  dni?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

/** Input for updating an existing customer */
export interface UpdateCustomerInput {
  name?: string;
  dni?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

/** Search filters for finding customers */
export interface CustomerSearchFilters {
  search?: string;
  hasDni?: boolean;
  hasPhone?: boolean;
}

/**
 * Customer Service
 * Provides CRUD operations for customers with local-first approach
 * and automatic sync to server
 */
export class CustomerService extends BaseService {
  private static readonly TABLE_NAME = "customers";
  private static readonly ENTITY_TYPE: EntityType = "customers";
  private static readonly ID_PREFIX = "cust";

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string
  ) {
    super(pg, db, syncService, businessId);
  }

  getEntityType(): EntityType {
    return CustomerService.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return CustomerService.ID_PREFIX;
  }

  /**
   * Find a customer by ID
   */
  async findById(id: string): Promise<Customer | null> {
    const result = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM ${CustomerService.TABLE_NAME} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapToCamelCase<Customer>(result.rows[0]);
  }

  /**
   * Find all customers for the current business
   * Optionally filtered by search query
   */
  async findByBusiness(filters?: CustomerSearchFilters): Promise<Customer[]> {
    const conditions: string[] = ["business_id = $1"];
    const params: (string | null)[] = [this.businessId];
    let paramIndex = 2;

    if (filters?.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR dni ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.hasDni === true) {
      conditions.push("dni IS NOT NULL AND dni != ''");
    }

    if (filters?.hasPhone === true) {
      conditions.push("phone IS NOT NULL AND phone != ''");
    }

    const query = `SELECT * FROM ${CustomerService.TABLE_NAME} WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;

    const result = await this.pg.query<Record<string, unknown>>(query, params);
    return result.rows.map((row) => mapToCamelCase<Customer>(row));
  }

  /**
   * Create a new customer
   * Stores locally and queues for server sync
   */
  async create(input: CreateCustomerInput): Promise<Customer> {
    const id = this.generateId();
    const now = this.now();

    const customer: Customer = {
      id,
      name: input.name,
      dni: input.dni || null,
      phone: input.phone || null,
      address: input.address || null,
      notes: input.notes || null,
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      businessId: this.businessId,
      createdBy: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await this.pg.exec(
      `INSERT INTO ${CustomerService.TABLE_NAME} (
        id, name, dni, phone, address, notes,
        sync_status, sync_attempts, business_id, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        customer.id,
        customer.name,
        customer.dni,
        customer.phone,
        customer.address,
        customer.notes,
        customer.syncStatus,
        customer.syncAttempts,
        customer.businessId,
        customer.createdBy,
        customer.createdAt,
        customer.updatedAt,
      ]
    );

    await this.queueSync("insert", id, {
      name: input.name,
      dni: input.dni,
      phone: input.phone,
      address: input.address,
      notes: input.notes,
    });

    return customer;
  }

  /**
   * Update an existing customer
   * Updates locally and queues for server sync
   */
  async update(id: string, input: UpdateCustomerInput): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Customer not found: ${id}`);
    }

    const updates: string[] = [];
    const params: (string | null)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.dni !== undefined) {
      updates.push(`dni = $${paramIndex++}`);
      params.push(input.dni ?? null);
    }
    if (input.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(input.phone ?? null);
    }
    if (input.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      params.push(input.address ?? null);
    }
    if (input.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(input.notes ?? null);
    }

    const now = this.now();
    updates.push(`sync_status = $${paramIndex++}`);
    params.push(SyncStatus.PENDING);

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    // Add id as last parameter
    params.push(id);

    await this.pg.exec(
      `UPDATE ${CustomerService.TABLE_NAME} SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

    await this.queueSync("update", id, input as Record<string, unknown>);
  }

  /**
   * Delete a customer
   * Removes locally and queues deletion for server sync
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Customer not found: ${id}`);
    }

    await this.pg.exec(
      `DELETE FROM ${CustomerService.TABLE_NAME} WHERE id = $1`,
      [id]
    );

    await this.queueSync("delete", id, {});
  }
}
