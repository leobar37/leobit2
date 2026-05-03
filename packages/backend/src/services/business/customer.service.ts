import type { CustomerRepository, AccountsReceivableItem } from "../repository/customer.repository";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Customer, NewCustomer } from "../../db/schema";

export class CustomerService {
  constructor(private repository: CustomerRepository) {}

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

    return this.repository.findMany(ctx, filters);
  }

  async getCustomer(ctx: RequestContext, id: string): Promise<Customer> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver clientes");
    }

    const customer = await this.repository.findById(ctx, id);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    return customer;
  }

  async createCustomer(
    ctx: RequestContext,
    data: {
      name: string;
      dni?: string | null;
      phone?: string | null;
      address?: string | null;
      notes?: string | null;
    }
  ): Promise<MutationResult<Customer>> {
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

      return {
        data: customer,
        txid: await getTxid(tx),
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
    }
  ): Promise<MutationResult<Customer>> {
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

      return {
        data: updated,
        txid: await getTxid(tx),
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
}
