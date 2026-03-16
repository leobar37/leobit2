/**
 * Customer Group Service
 * Business logic for customer groups
 */
import type { CustomerGroupRepository, CustomerGroupWithMemberCount, CustomerGroupWithMembers } from "../repository/customer-group.repository";
import type { CustomerRepository } from "../repository/customer.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";

export class CustomerGroupService {
  constructor(
    private customerGroupRepo: CustomerGroupRepository,
    private customerRepo: CustomerRepository,
  ) {}

  /**
   * Get all customer groups for a business
   */
  async getGroups(ctx: RequestContext): Promise<CustomerGroupWithMemberCount[]> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver grupos de clientes");
    }

    return this.customerGroupRepo.findAll(ctx);
  }

  /**
   * Get a single customer group by ID
   */
  async getGroup(ctx: RequestContext, groupId: string): Promise<CustomerGroupWithMembers | null> {
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver grupos de clientes");
    }

    const group = await this.customerGroupRepo.findByIdWithMembers(ctx, groupId);
    if (!group) {
      throw new NotFoundError("Grupo de clientes");
    }

    return group;
  }

  /**
   * Create a new customer group
   */
  async createGroup(ctx: RequestContext, data: { name: string }): Promise<CustomerGroupWithMemberCount> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para crear grupos de clientes");
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("El nombre del grupo es requerido");
    }

    if (data.name.trim().length > 100) {
      throw new ValidationError("El nombre del grupo no puede exceder 100 caracteres");
    }

    const group = await this.customerGroupRepo.create(ctx, { name: data.name.trim() });

    return {
      ...group,
      memberCount: 0,
    };
  }

  /**
   * Update a customer group
   */
  async updateGroup(ctx: RequestContext, groupId: string, data: { name: string }): Promise<CustomerGroupWithMemberCount> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para actualizar grupos de clientes");
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("El nombre del grupo es requerido");
    }

    if (data.name.trim().length > 100) {
      throw new ValidationError("El nombre del grupo no puede exceder 100 caracteres");
    }

    // Verify group exists
    const existingGroup = await this.customerGroupRepo.findById(ctx, groupId);
    if (!existingGroup) {
      throw new NotFoundError("Grupo de clientes");
    }

    const group = await this.customerGroupRepo.update(ctx, groupId, { name: data.name.trim() });
    const memberCount = await this.customerGroupRepo.getMemberCount(ctx, groupId);

    return {
      ...group,
      memberCount,
    };
  }

  /**
   * Delete a customer group
   */
  async deleteGroup(ctx: RequestContext, groupId: string): Promise<void> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para eliminar grupos de clientes");
    }

    // Verify group exists
    const existingGroup = await this.customerGroupRepo.findById(ctx, groupId);
    if (!existingGroup) {
      throw new NotFoundError("Grupo de clientes");
    }

    await this.customerGroupRepo.delete(ctx, groupId);
  }

  /**
   * Add customers to a group
   */
  async addMembers(ctx: RequestContext, groupId: string, customerIds: string[]): Promise<void> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para agregar clientes a grupos");
    }

    if (!customerIds || customerIds.length === 0) {
      throw new ValidationError("Debe seleccionar al menos un cliente");
    }

    // Verify group exists
    const existingGroup = await this.customerGroupRepo.findById(ctx, groupId);
    if (!existingGroup) {
      throw new NotFoundError("Grupo de clientes");
    }

    // Verify all customers exist and belong to the business
    const customers = await this.customerRepo.findByIds(ctx, customerIds);
    if (customers.length !== customerIds.length) {
      throw new NotFoundError("Algunos clientes no fueron encontrados");
    }

    await this.customerGroupRepo.addMembers(ctx, groupId, customerIds);
  }

  /**
   * Remove a customer from a group
   */
  async removeMember(ctx: RequestContext, groupId: string, customerId: string): Promise<void> {
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para remover clientes de grupos");
    }

    // Verify group exists
    const existingGroup = await this.customerGroupRepo.findById(ctx, groupId);
    if (!existingGroup) {
      throw new NotFoundError("Grupo de clientes");
    }

    // Verify customer exists
    const customer = await this.customerRepo.findById(ctx, customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    // Check if member exists
    const isMember = await this.customerGroupRepo.isMember(ctx, groupId, customerId);
    if (!isMember) {
      throw new ValidationError("El cliente no es miembro del grupo");
    }

    await this.customerGroupRepo.removeMember(ctx, groupId, customerId);
  }
}
