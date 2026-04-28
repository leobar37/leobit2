/**
 * Visita Service
 * Local-first this.tables.visitas entity service with automatic sync integration
 * Extends generated VisitasService to provide enriched return types with customer data
 */

import type { SyncClientEngineLike } from "./base-service";
import { VisitasService } from "~/lib/sync/generated/services";
import { SyncStatus, type Visitas as Visita } from "~/lib/sync/generated/schema";
import { eq, desc } from "drizzle-orm";

// Re-export types for backward compatibility
export type { CreateVisitasInput, UpdateVisitasInput } from "~/lib/sync/generated/services";

export interface CreateVisitaInput {
  distribucionId: string;
  customerId: string;
  status?: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string;
  saleId?: string;
}

export interface UpdateVisitaInput {
  status?: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string;
  saleId?: string;
}

export interface VisitaWithCustomer extends Omit<Visita, "customerId"> {
  customerId: string;
  businessId: string;
  customer?: {
    id: string;
    name: string;
    dni: string | null;
    address: string | null;
    phone: string | null;
  };
}

/**
 * VisitaService
 * Extends generated VisitasService to provide enriched return types with customer data
 */
export class VisitaService extends VisitasService {
  /**
   * Find a visita by ID with enriched customer data
   */
  async findById(id: string): Promise<VisitaWithCustomer | null> {
    const result = await this.db
      .select({
        id: this.tables.visitas.id,
        distribucionId: this.tables.visitas.distribucionId,
        customerId: this.tables.visitas.customerId,
        vendedorId: this.tables.visitas.vendedorId,
        status: this.tables.visitas.status,
        motivoNoCompra: this.tables.visitas.motivoNoCompra,
        saleId: this.tables.visitas.saleId,
        syncStatus: this.tables.visitas.syncStatus,
        syncAttempts: this.tables.visitas.syncAttempts,
        createdAt: this.tables.visitas.createdAt,
        updatedAt: this.tables.visitas.updatedAt,
        customer: {
          id: this.tables.customers.id,
          name: this.tables.customers.name,
          dni: this.tables.customers.dni,
          address: this.tables.customers.address,
          phone: this.tables.customers.phone,
        },
      })
      .from(this.tables.visitas)
      .leftJoin(this.tables.customers, eq(this.tables.visitas.customerId, this.tables.customers.id))
      .where(eq(this.tables.visitas.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      version: 1,
      distribucionId: row.distribucionId,
      customerId: row.customerId,
      vendedorId: row.vendedorId,
      status: row.status,
      motivoNoCompra: row.motivoNoCompra,
      saleId: row.saleId,
      syncStatus: row.syncStatus,
      syncAttempts: row.syncAttempts,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      businessId: this.businessId,
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        dni: row.customer.dni,
        address: row.customer.address,
        phone: row.customer.phone,
      } : undefined,
    };
  }

  /**
   * Find all this.tables.visitas for the current business with enriched customer data
   */
  async findByBusiness(): Promise<VisitaWithCustomer[]> {
    const result = await this.db
      .select({
        id: this.tables.visitas.id,
        distribucionId: this.tables.visitas.distribucionId,
        customerId: this.tables.visitas.customerId,
        vendedorId: this.tables.visitas.vendedorId,
        status: this.tables.visitas.status,
        motivoNoCompra: this.tables.visitas.motivoNoCompra,
        saleId: this.tables.visitas.saleId,
        syncStatus: this.tables.visitas.syncStatus,
        syncAttempts: this.tables.visitas.syncAttempts,
        createdAt: this.tables.visitas.createdAt,
        updatedAt: this.tables.visitas.updatedAt,
        customer: {
          id: this.tables.customers.id,
          name: this.tables.customers.name,
          dni: this.tables.customers.dni,
          address: this.tables.customers.address,
          phone: this.tables.customers.phone,
        },
      })
      .from(this.tables.visitas)
      .leftJoin(this.tables.customers, eq(this.tables.visitas.customerId, this.tables.customers.id))
      .where(eq(this.tables.visitas.businessId, this.businessId))
      .orderBy(desc(this.tables.visitas.createdAt));

    return result.map(row => ({
      id: row.id,
      version: 1,
      distribucionId: row.distribucionId,
      customerId: row.customerId,
      vendedorId: row.vendedorId,
      status: row.status,
      motivoNoCompra: row.motivoNoCompra,
      saleId: row.saleId,
      syncStatus: row.syncStatus,
      syncAttempts: row.syncAttempts,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      businessId: this.businessId,
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        dni: row.customer.dni,
        address: row.customer.address,
        phone: row.customer.phone,
      } : undefined,
    }));
  }

  /**
   * Find all this.tables.visitas for a distribucion with enriched customer data
   */
  async findByDistribucion(distribucionId: string): Promise<VisitaWithCustomer[]> {
    const result = await this.db
      .select({
        id: this.tables.visitas.id,
        distribucionId: this.tables.visitas.distribucionId,
        customerId: this.tables.visitas.customerId,
        vendedorId: this.tables.visitas.vendedorId,
        status: this.tables.visitas.status,
        motivoNoCompra: this.tables.visitas.motivoNoCompra,
        saleId: this.tables.visitas.saleId,
        syncStatus: this.tables.visitas.syncStatus,
        syncAttempts: this.tables.visitas.syncAttempts,
        createdAt: this.tables.visitas.createdAt,
        updatedAt: this.tables.visitas.updatedAt,
        customer: {
          id: this.tables.customers.id,
          name: this.tables.customers.name,
          dni: this.tables.customers.dni,
          address: this.tables.customers.address,
          phone: this.tables.customers.phone,
        },
      })
      .from(this.tables.visitas)
      .leftJoin(this.tables.customers, eq(this.tables.visitas.customerId, this.tables.customers.id))
      .where(eq(this.tables.visitas.distribucionId, distribucionId))
      .orderBy(desc(this.tables.visitas.createdAt));

    return result.map(row => ({
      id: row.id,
      version: 1,
      distribucionId: row.distribucionId,
      customerId: row.customerId,
      vendedorId: row.vendedorId,
      status: row.status,
      motivoNoCompra: row.motivoNoCompra,
      saleId: row.saleId,
      syncStatus: row.syncStatus,
      syncAttempts: row.syncAttempts,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      businessId: this.businessId,
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        dni: row.customer.dni,
        address: row.customer.address,
        phone: row.customer.phone,
      } : undefined,
    }));
  }

  /**
   * Create a new visita and return enriched data with customer
   * Note: Uses full implementation to return enriched type
   */
  async create(input: CreateVisitaInput): Promise<VisitaWithCustomer> {
    const id = this.generateId();
    const now = new Date(this.now());

    const visita: Partial<Visita> = {
      id,
      distribucionId: input.distribucionId,
      customerId: input.customerId,
      vendedorId: this.businessUserId,
      status: input.status ?? "pendiente",
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      businessId: this.businessId,
      createdAt: now,
      updatedAt: now,
    };

    if (input.motivoNoCompra !== undefined) {
      visita.motivoNoCompra = input.motivoNoCompra;
    }
    if (input.saleId !== undefined) {
      visita.saleId = input.saleId;
    }

    await this.db.insert(this.tables.visitas).values(visita as Visita);

    await this.queueSync("create", id, {
      distribucionId: input.distribucionId,
      customerId: input.customerId,
      vendedorId: this.businessUserId,
      status: input.status ?? "pendiente",
      motivoNoCompra: input.motivoNoCompra,
      saleId: input.saleId,
    });

    const created = await this.findById(id);
    if (!created) {
      throw new Error("Failed to create visita");
    }

    return created;
  }

  /**
   * Create multiple this.tables.visitas for a distribucion
   */
  async createBulk(distribucionId: string, customerIds: string[]): Promise<VisitaWithCustomer[]> {
    const createdVisitas: VisitaWithCustomer[] = [];

    for (const customerId of customerIds) {
      const visita = await this.create({
        distribucionId,
        customerId,
        status: "pendiente",
      });
      createdVisitas.push(visita);
    }

    return createdVisitas;
  }
}
