import type { CustomerRepository } from "../repository/customer.repository";
import type { RequestContext } from "../../context/request-context";
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
      dni?: string;
      phone?: string;
      address?: string;
      notes?: string;
    }
  ): Promise<Customer> {
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

    return this.repository.create(ctx, {
      name: data.name,
      dni: data.dni,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
    });
  }

  async updateCustomer(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      dni?: string;
      phone?: string;
      address?: string;
      notes?: string;
    }
  ): Promise<Customer> {
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

    const updated = await this.repository.update(ctx, id, data);
    if (!updated) {
      throw new NotFoundError("Cliente");
    }

    return updated;
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
}
