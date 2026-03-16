/**
 * Customer Service
 * Local-first customer entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, customers } from "@avileo/shared";
import type { Customer } from "@avileo/shared";
import { eq, like, and, or, desc, isNull, isNotNull } from "drizzle-orm";

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
  private static readonly ENTITY_TYPE: EntityType = "customers";
  private static readonly ID_PREFIX = "cust";

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
    return CustomerService.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return CustomerService.ID_PREFIX;
  }

  /**
   * Find a customer by ID
   */
  async findById(id: string): Promise<Customer | null> {
    const result = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0] as Customer;
  }

  /**
   * Find all customers for the current business
   * Optionally filtered by search query
   */
  async findByBusiness(filters?: CustomerSearchFilters): Promise<Customer[]> {
    const conditions = [eq(customers.businessId, this.businessId)];

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(customers.name, searchPattern),
          like(customers.dni, searchPattern),
          like(customers.phone, searchPattern)
        ) as never
      );
    }

    if (filters?.hasDni === true) {
      conditions.push(isNotNull(customers.dni) as never);
    }

    if (filters?.hasPhone === true) {
      conditions.push(isNotNull(customers.phone) as never);
    }

    const result = await this.db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt));

    return result as Customer[];
  }

  /**
   * Create a new customer
   * Stores locally and queues for server sync
   */
  async create(input: CreateCustomerInput): Promise<Customer> {
    const id = this.generateId();
    const now = new Date(this.now());

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
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(customers).values(customer);

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

    const updateData: Partial<Customer> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.dni !== undefined) {
      updateData.dni = input.dni ?? null;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone ?? null;
    }
    if (input.address !== undefined) {
      updateData.address = input.address ?? null;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes ?? null;
    }

    updateData.syncStatus = SyncStatus.PENDING;
    updateData.updatedAt = new Date(this.now());

    await this.db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id));

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

    await this.db.delete(customers).where(eq(customers.id, id));

    await this.queueSync("delete", id, {});
  }
}
