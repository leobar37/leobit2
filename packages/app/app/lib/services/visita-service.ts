/**
 * Visita Service
 * Local-first visitas entity service with automatic sync integration
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, visitas, customers, type Visita } from "@avileo/shared";
import { eq, and, desc } from "drizzle-orm";

export interface CreateVisitaInput {
  distribucionId: string;
  customerId: string;
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

export class VisitaService extends BaseService {
  private static readonly ENTITY_TYPE: EntityType = "visitas";
  private static readonly ID_PREFIX = "vis";

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string
  ) {
    super(pg, db, syncService, businessId);
  }

  getEntityType(): EntityType {
    return VisitaService.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return VisitaService.ID_PREFIX;
  }

  async findById(id: string): Promise<VisitaWithCustomer | null> {
    const result = await this.db
      .select({
        id: visitas.id,
        distribucionId: visitas.distribucionId,
        customerId: visitas.customerId,
        vendedorId: visitas.vendedorId,
        status: visitas.status,
        motivoNoCompra: visitas.motivoNoCompra,
        saleId: visitas.saleId,
        syncStatus: visitas.syncStatus,
        syncAttempts: visitas.syncAttempts,
        createdAt: visitas.createdAt,
        updatedAt: visitas.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          dni: customers.dni,
          address: customers.address,
          phone: customers.phone,
        },
      })
      .from(visitas)
      .leftJoin(customers, eq(visitas.customerId, customers.id))
      .where(eq(visitas.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
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

  async findByDistribucion(distribucionId: string): Promise<VisitaWithCustomer[]> {
    const result = await this.db
      .select({
        id: visitas.id,
        distribucionId: visitas.distribucionId,
        customerId: visitas.customerId,
        vendedorId: visitas.vendedorId,
        status: visitas.status,
        motivoNoCompra: visitas.motivoNoCompra,
        saleId: visitas.saleId,
        syncStatus: visitas.syncStatus,
        syncAttempts: visitas.syncAttempts,
        createdAt: visitas.createdAt,
        updatedAt: visitas.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          dni: customers.dni,
          address: customers.address,
          phone: customers.phone,
        },
      })
      .from(visitas)
      .leftJoin(customers, eq(visitas.customerId, customers.id))
      .where(eq(visitas.distribucionId, distribucionId))
      .orderBy(desc(visitas.createdAt));

    return result.map(row => ({
      id: row.id,
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

  async create(input: CreateVisitaInput): Promise<VisitaWithCustomer> {
    const id = this.generateId();
    const now = new Date(this.now());

    const visita: Partial<Visita> = {
      id,
      distribucionId: input.distribucionId,
      customerId: input.customerId,
      vendedorId: this.businessId,
      status: "pendiente",
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      businessId: this.businessId,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(visitas).values(visita as Visita);

    await this.queueSync("insert", id, {
      distribucionId: input.distribucionId,
      customerId: input.customerId,
      status: "pendiente",
    });

    const created = await this.findById(id);
    if (!created) {
      throw new Error("Failed to create visita");
    }

    return created;
  }

  async createBulk(distribucionId: string, customerIds: string[]): Promise<VisitaWithCustomer[]> {
    const now = new Date(this.now());
    const createdVisitas: VisitaWithCustomer[] = [];

    for (const customerId of customerIds) {
      const visita: Partial<Visita> = {
        id: this.generateId(),
        distribucionId,
        customerId,
        vendedorId: this.businessId,
        status: "pendiente",
        syncStatus: SyncStatus.PENDING,
        syncAttempts: 0,
        businessId: this.businessId,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.insert(visitas).values(visita as Visita);

      await this.queueSync("insert", visita.id!, {
        distribucionId,
        customerId,
        status: "pendiente",
      });

      const created = await this.findById(visita.id!);
      if (created) {
        createdVisitas.push(created);
      }
    }

    return createdVisitas;
  }

  async update(id: string, input: UpdateVisitaInput): Promise<VisitaWithCustomer> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Visita not found: ${id}`);
    }

    const updateData: Partial<Visita> = {
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(this.now()),
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.motivoNoCompra !== undefined) {
      updateData.motivoNoCompra = input.motivoNoCompra;
    }
    if (input.saleId !== undefined) {
      updateData.saleId = input.saleId;
    }

    await this.db
      .update(visitas)
      .set(updateData)
      .where(eq(visitas.id, id));

    await this.queueSync("update", id, input as Record<string, unknown>);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Failed to update visita: ${id}`);
    }

    return updated;
  }
}
