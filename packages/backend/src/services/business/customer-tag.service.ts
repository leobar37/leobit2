/**
 * Customer Tag Service
 * Business logic for customer-tag assignments
 */
import type { CustomerTagRepository, CustomerTagWithDetails } from "../repository/customer-tag.repository";
import type { TagRepository } from "../repository/tag.repository";
import type { CustomerRepository } from "../repository/customer.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";

export interface TagAssignment {
  tagId: string;
  tagName: string;
  tagColor: string;
  assignedAt: Date;
}

export class CustomerTagService {
  constructor(
    private customerTagRepo: CustomerTagRepository,
    private tagRepo: TagRepository,
    private customerRepo: CustomerRepository,
  ) {}

  async getCustomerTags(ctx: RequestContext, customerId: string): Promise<TagAssignment[]> {
    if (!ctx.hasPermission("tags.read")) {
      throw new ForbiddenError("No tiene permisos para ver etiquetas");
    }

    // Verify customer exists and belongs to business
    const customer = await this.customerRepo.findById(ctx, customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    const assignments = await this.customerTagRepo.findByCustomer(ctx, customerId);

    return assignments.map((assignment) => ({
      tagId: assignment.tagId,
      tagName: assignment.tag.name,
      tagColor: assignment.tag.color,
      assignedAt: assignment.assignedAt,
    }));
  }

  async assignTags(
    ctx: RequestContext,
    customerId: string,
    tagIds: string[]
  ): Promise<TagAssignment[]> {
    if (!ctx.hasPermission("tags.write")) {
      throw new ForbiddenError("No tiene permisos para asignar etiquetas");
    }

    // Verify customer exists and belongs to business
    const customer = await this.customerRepo.findById(ctx, customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    // Validate all tags exist and belong to the business
    if (tagIds.length > 0) {
      const allTags = await this.tagRepo.findAll(ctx);
      const validTagIds = new Set(allTags.map((t) => t.id));
      const invalidTags = tagIds.filter((id) => !validTagIds.has(id));

      if (invalidTags.length > 0) {
        throw new ValidationError("Algunas etiquetas no son válidas");
      }
    }

    // Assign tags (replaces existing assignments)
    await this.customerTagRepo.assignTags(ctx, customerId, tagIds);

    // Return updated assignments
    return this.getCustomerTags(ctx, customerId);
  }

  async addTagToCustomer(
    ctx: RequestContext,
    customerId: string,
    tagId: string
  ): Promise<void> {
    if (!ctx.hasPermission("tags.write")) {
      throw new ForbiddenError("No tiene permisos para asignar etiquetas");
    }

    // Verify customer exists
    const customer = await this.customerRepo.findById(ctx, customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    // Verify tag exists
    const tag = await this.tagRepo.findById(ctx, tagId);
    if (!tag) {
      throw new NotFoundError("Etiqueta");
    }

    // Check if already assigned
    const hasTag = await this.customerTagRepo.hasTag(ctx, customerId, tagId);
    if (hasTag) {
      return; // Already assigned, nothing to do
    }

    await this.customerTagRepo.addTag(ctx, customerId, tagId);
  }

  async removeTagFromCustomer(
    ctx: RequestContext,
    customerId: string,
    tagId: string
  ): Promise<void> {
    if (!ctx.hasPermission("tags.write")) {
      throw new ForbiddenError("No tiene permisos para remover etiquetas");
    }

    // Verify customer exists
    const customer = await this.customerRepo.findById(ctx, customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    await this.customerTagRepo.removeTag(ctx, customerId, tagId);
  }

  async getCustomersByTags(
    ctx: RequestContext,
    tagIds: string[]
  ): Promise<string[]> {
    if (!ctx.hasPermission("tags.read")) {
      throw new ForbiddenError("No tiene permisos para ver etiquetas");
    }

    if (tagIds.length === 0) {
      return [];
    }

    // Validate all tags exist
    const allTags = await this.tagRepo.findAll(ctx);
    const validTagIds = new Set(allTags.map((t) => t.id));
    const invalidTags = tagIds.filter((id) => !validTagIds.has(id));

    if (invalidTags.length > 0) {
      throw new ValidationError("Algunas etiquetas no son válidas");
    }

    return this.customerTagRepo.getCustomersByTags(ctx, tagIds);
  }

  async assignTagsBulk(
    ctx: RequestContext,
    customerIds: string[],
    tagIds: string[]
  ): Promise<void> {
    if (!ctx.hasPermission("tags.write")) {
      throw new ForbiddenError("No tiene permisos para asignar etiquetas");
    }

    if (customerIds.length === 0) {
      throw new ValidationError("Debe seleccionar al menos un cliente");
    }

    // Validate all tags exist and belong to the business
    if (tagIds.length > 0) {
      const allTags = await this.tagRepo.findAll(ctx);
      const validTagIds = new Set(allTags.map((t) => t.id));
      const invalidTags = tagIds.filter((id) => !validTagIds.has(id));

      if (invalidTags.length > 0) {
        throw new ValidationError("Algunas etiquetas no son válidas");
      }
    }

    // Verify all customers exist and belong to business
    const customers = await this.customerRepo.findByIds(ctx, customerIds);
    if (customers.length !== customerIds.length) {
      throw new NotFoundError("Algunos clientes no fueron encontrados");
    }

    // Assign tags to all customers (replaces existing assignments for each)
    for (const customerId of customerIds) {
      await this.customerTagRepo.assignTags(ctx, customerId, tagIds);
    }
  }
}
