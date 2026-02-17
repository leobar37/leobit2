import type { SupplierRepository } from "../repository/supplier.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Supplier, NewSupplier } from "../../db/schema";

export class SupplierService {
  constructor(private repository: SupplierRepository) {}

  async getSuppliers(
    ctx: RequestContext,
    filters?: {
      search?: string;
      type?: "generic" | "regular" | "internal";
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    if (!ctx.hasPermission("suppliers.read")) {
      throw new ForbiddenError("No tiene permisos para ver proveedores");
    }

    return this.repository.findMany(ctx, filters);
  }

  async getSupplier(ctx: RequestContext, id: string): Promise<Supplier> {
    if (!ctx.hasPermission("suppliers.read")) {
      throw new ForbiddenError("No tiene permisos para ver proveedores");
    }

    const supplier = await this.repository.findById(ctx, id);
    if (!supplier) {
      throw new NotFoundError("Proveedor");
    }

    return supplier;
  }

  async getGenericSupplier(ctx: RequestContext): Promise<Supplier | undefined> {
    if (!ctx.hasPermission("suppliers.read")) {
      throw new ForbiddenError("No tiene permisos para ver proveedores");
    }

    return this.repository.findGenericByBusinessId(ctx);
  }

  async createSupplier(
    ctx: RequestContext,
    data: {
      name: string;
      type?: "generic" | "regular" | "internal";
      ruc?: string;
      address?: string;
      phone?: string;
      email?: string;
      notes?: string;
    }
  ): Promise<Supplier> {
    if (!ctx.hasPermission("suppliers.write")) {
      throw new ForbiddenError("No tiene permisos para crear proveedores");
    }

    if (!data.name || data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    if (data.type === "generic") {
      const existingGeneric = await this.repository.findGenericByBusinessId(ctx);
      if (existingGeneric) {
        throw new ValidationError("Ya existe un proveedor genérico para este negocio");
      }
    }

    return this.repository.create(ctx, {
      name: data.name,
      type: data.type ?? "regular",
      ruc: data.ruc,
      address: data.address,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      isActive: true,
    });
  }

  async createGenericSupplier(ctx: RequestContext): Promise<Supplier> {
    const existingGeneric = await this.repository.findGenericByBusinessId(ctx);
    if (existingGeneric) {
      return existingGeneric;
    }

    return this.repository.create(ctx, {
      name: "Proveedor Varios",
      type: "generic",
      ruc: null,
      address: null,
      phone: null,
      email: null,
      notes: "Proveedor genérico para compras sin identificación",
      isActive: true,
    });
  }

  async updateSupplier(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      ruc?: string;
      address?: string;
      phone?: string;
      email?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<Supplier> {
    if (!ctx.hasPermission("suppliers.write")) {
      throw new ForbiddenError("No tiene permisos para editar proveedores");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Proveedor");
    }

    if (existing.type === "generic" && data.name !== undefined) {
      throw new ValidationError("No se puede editar el nombre del proveedor genérico");
    }

    if (data.name !== undefined && data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    const updated = await this.repository.update(ctx, id, data);
    if (!updated) {
      throw new NotFoundError("Proveedor");
    }

    return updated;
  }

  async deleteSupplier(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar proveedores");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Proveedor");
    }

    if (existing.type === "generic") {
      throw new ForbiddenError("No se puede eliminar el proveedor genérico");
    }

    await this.repository.delete(ctx, id);
  }

  async countSuppliers(ctx: RequestContext): Promise<number> {
    if (!ctx.hasPermission("suppliers.read")) {
      throw new ForbiddenError("No tiene permisos para ver proveedores");
    }

    return this.repository.count(ctx);
  }
}
