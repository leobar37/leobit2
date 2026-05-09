import type { CustomerRepository, AccountsReceivableItem } from "../repository/customer.repository";
import type { WaterCustomerProfileRepository, WaterCustomerProfileInput } from "../repository/water-customer-profile.repository";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { getCurrentTransactionId } from "../../lib/transaction-id";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Customer, NewCustomer } from "../../db/schema";

export type CustomerWithWaterProfile = Customer & {
  totalDebt?: number;
  lastSaleDate?: Date | null;
  waterProfile?: (import("../../db/schema").WaterCustomerProfile & { waterRouteName?: string | null }) | null;
};

export class CustomerService {
  constructor(
    private repository: CustomerRepository,
    private waterProfileRepository?: WaterCustomerProfileRepository
  ) {}

  async getCustomers(
    ctx: RequestContext,
    filters?: {
      search?: string;
      limit?: number;
      offset?: number;
      customerIds?: string[];
      tagIds?: string[];
      sortBy?: "name" | "lastSaleDate" | "debt" | "createdAt";
      sortOrder?: "asc" | "desc";
    }
  ) {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver clientes");
    }

    const customers = await this.repository.findMany(ctx, filters);
    return this.attachWaterProfiles(ctx, customers);
  }

  async getCustomer(ctx: RequestContext, id: string): Promise<CustomerWithWaterProfile> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver clientes");
    }

    const customer = await this.repository.findById(ctx, id);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    return this.attachWaterProfile(ctx, customer);
  }

  async createCustomer(
    ctx: RequestContext,
    data: {
      name: string;
      dni?: string | null;
      phone?: string | null;
      address?: string | null;
      notes?: string | null;
      waterProfile?: WaterCustomerProfileInput | null;
    }
  ): Promise<CustomerWithWaterProfile> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para crear clientes");
    }

    if (!data.name || data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    if (data.dni) {
      const existing = await this.repository.findByDni(ctx, data.dni);
      if (existing) {
        throw new ValidationError("Ya existe un cliente con ese DNI");
      }
    }

    return db.transaction(async (tx) => {
      const customer = await this.repository.create(
        ctx,
        {
          name: data.name,
          dni: data.dni,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
        },
        tx
      );

      let waterProfile = null;
      if (data.waterProfile) {
        this.assertWaterMode(ctx);
        waterProfile = await this.getWaterProfileRepository().create(
          ctx,
          customer.id,
          this.normalizeWaterProfileInput(data.waterProfile),
          tx
        );
      }

      return {
        data: { ...customer, ...(ctx.businessMode === "agua" ? { waterProfile } : {}) },
        txid: await getCurrentTransactionId(tx),
      };
    });
  }

  async updateCustomer(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      dni?: string | null;
      phone?: string | null;
      address?: string | null;
      notes?: string | null;
      waterProfile?: WaterCustomerProfileInput | null;
    }
  ): Promise<CustomerWithWaterProfile> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para editar clientes");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Cliente");
    }

    if (data.name !== undefined && data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    if (data.dni && data.dni !== existing.dni) {
      const existingDni = await this.repository.findByDni(ctx, data.dni);
      if (existingDni) {
        throw new ValidationError("Ya existe un cliente con ese DNI");
      }
    }

    return db.transaction(async (tx) => {
      const updated = await this.repository.update(ctx, id, data, tx);
      if (!updated) {
        throw new NotFoundError("Cliente");
      }

      let waterProfile = null;
      if (data.waterProfile) {
        this.assertWaterMode(ctx);
        waterProfile = await this.getWaterProfileRepository().upsert(
          ctx,
          id,
          this.normalizeWaterProfileInput(data.waterProfile),
          tx
        );
      } else if (ctx.businessMode === "agua") {
        waterProfile = await this.getWaterProfileRepository().findByCustomerId(ctx, id, tx) ?? null;
      }

      return {
        data: { ...updated, ...(ctx.businessMode === "agua" ? { waterProfile } : {}) },
        txid: await getCurrentTransactionId(tx),
      };
    });
  }

  async deleteCustomer(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar clientes");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Cliente");
    }

    await this.repository.delete(ctx, id);
  }

  async countCustomers(ctx: RequestContext): Promise<number> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver clientes");
    }

    return this.repository.count(ctx);
  }

  async getAccountsReceivable(
    ctx: RequestContext,
    filters?: {
      search?: string;
      minBalance?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<AccountsReceivableItem[]> {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para ver reportes");
    }

    return this.repository.getAccountsReceivable(ctx, filters);
  }

  async getTotalAccountsReceivable(ctx: RequestContext): Promise<number> {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para ver reportes");
    }

    return this.repository.getTotalAccountsReceivable(ctx);
  }

  async getBalance(ctx: RequestContext, customerId: string): Promise<{ totalSales: number; totalPayments: number; balanceDue: number }> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver clientes");
    }

    const customer = await this.repository.findById(ctx, customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    return this.repository.getBalance(ctx, customerId);
  }

  private async attachWaterProfiles<T extends Customer>(
    ctx: RequestContext,
    customers: T[]
  ): Promise<Array<T & { waterProfile?: import("../../db/schema").WaterCustomerProfile | null }>> {
    if (ctx.businessMode !== "agua" || customers.length === 0) {
      return customers;
    }

    const profiles = await this.getWaterProfileRepository().findByCustomerIds(
      ctx,
      customers.map((customer) => customer.id)
    );
    const profilesByCustomerId = new Map(
      profiles.map((profile) => [profile.customerId, profile])
    );

    return customers.map((customer) => ({
      ...customer,
      waterProfile: profilesByCustomerId.get(customer.id) ?? null,
    }));
  }

  private async attachWaterProfile<T extends Customer>(
    ctx: RequestContext,
    customer: T
  ): Promise<T & { waterProfile?: import("../../db/schema").WaterCustomerProfile | null }> {
    if (ctx.businessMode !== "agua") {
      return customer;
    }
    const waterProfile = await this.getWaterProfileRepository().findByCustomerId(ctx, customer.id);
    return { ...customer, waterProfile: waterProfile ?? null };
  }

  private assertWaterMode(ctx: RequestContext) {
    if (ctx.businessMode !== "agua") {
      throw new ValidationError("Los campos de reparto de agua solo aplican a negocios de agua");
    }
  }

  private getWaterProfileRepository(): WaterCustomerProfileRepository {
    if (!this.waterProfileRepository) {
      throw new Error("Water customer profile repository is not configured");
    }
    return this.waterProfileRepository;
  }

  private normalizeWaterProfileInput(input: WaterCustomerProfileInput): WaterCustomerProfileInput {
    return {
      deliveryFrequency: input.deliveryFrequency || "weekly",
      deliveryDays: Array.isArray(input.deliveryDays) ? input.deliveryDays : [],
      defaultContainerQuantity: Math.max(0, Number(input.defaultContainerQuantity ?? 1)),
      waterRouteId: input.waterRouteId || null,
      preferredRoute: input.preferredRoute?.trim() || null,
      deliveryInstructions: input.deliveryInstructions?.trim() || null,
      scheduleAnchorDate: input.scheduleAnchorDate ?? null,
    };
  }
}
