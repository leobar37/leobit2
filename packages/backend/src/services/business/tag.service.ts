/**
 * Tag Service
 * Business logic for tag management
 */
import type { TagRepository } from "../repository/tag.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Tag, NewTag } from "../../db/schema";

export interface TagWithCount extends Tag {
  customerCount: number;
}

export class TagService {
  constructor(private repository: TagRepository) {}

  async listTags(ctx: RequestContext): Promise<TagWithCount[]> {
    if (!ctx.hasPermission("tags.read")) {
      throw new ForbiddenError("No tiene permisos para ver etiquetas");
    }

    const tags = await this.repository.findAll(ctx);
    
    // Get customer count for each tag
    const tagsWithCount = await Promise.all(
      tags.map(async (tag) => ({
        ...tag,
        customerCount: await this.repository.getCustomerCount(ctx, tag.id),
      }))
    );

    return tagsWithCount;
  }

  async getTag(ctx: RequestContext, id: string): Promise<Tag> {
    if (!ctx.hasPermission("tags.read")) {
      throw new ForbiddenError("No tiene permisos para ver etiquetas");
    }

    const tag = await this.repository.findById(ctx, id);
    if (!tag) {
      throw new NotFoundError("Etiqueta");
    }

    return tag;
  }

  async createTag(
    ctx: RequestContext,
    data: {
      name: string;
      color?: string;
    }
  ): Promise<Tag> {
    if (!ctx.hasPermission("tags.write")) {
      throw new ForbiddenError("No tiene permisos para crear etiquetas");
    }

    // Validate name
    if (!data.name || data.name.length < 1) {
      throw new ValidationError("El nombre es requerido");
    }

    if (data.name.length > 100) {
      throw new ValidationError("El nombre no puede tener más de 100 caracteres");
    }

    // Validate color (hex format)
    const color = data.color || "#f97316";
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new ValidationError("Color inválido");
    }

    return this.repository.create(ctx, {
      name: data.name,
      color,
    });
  }

  async updateTag(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      color?: string;
    }
  ): Promise<Tag> {
    if (!ctx.hasPermission("tags.write")) {
      throw new ForbiddenError("No tiene permisos para editar etiquetas");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Etiqueta");
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name.length < 1) {
        throw new ValidationError("El nombre es requerido");
      }
      if (data.name.length > 100) {
        throw new ValidationError("El nombre no puede tener más de 100 caracteres");
      }
    }

    // Validate color if provided
    if (data.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      throw new ValidationError("Color inválido");
    }

    const updated = await this.repository.update(ctx, id, data);
    if (!updated) {
      throw new NotFoundError("Etiqueta");
    }

    return updated;
  }

  async deleteTag(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.hasPermission("tags.write")) {
      throw new ForbiddenError("No tiene permisos para eliminar etiquetas");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Etiqueta");
    }

    await this.repository.delete(ctx, id);
  }
}
