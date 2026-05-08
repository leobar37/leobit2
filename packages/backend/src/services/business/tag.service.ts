/**
 * Tag Service
 * Business logic for tag management
 */
import type { TagRepository } from "../repository/tag.repository";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { getCurrentTransactionId } from "../../lib/transaction-id";
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

    if (!data.name || data.name.length < 1) {
      throw new ValidationError("El nombre es requerido");
    }

    if (data.name.length > 100) {
      throw new ValidationError("El nombre no puede tener más de 100 caracteres");
    }

    const color = data.color || "#f97316";
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new ValidationError("Color inválido");
    }

    return db.transaction(async (tx) => {
      const tag = await this.repository.create(ctx, {
        name: data.name,
        color,
      }, tx);

      return {
        data: tag,
        txid: await getCurrentTransactionId(tx),
      };
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

    if (data.name !== undefined) {
      if (data.name.length < 1) {
        throw new ValidationError("El nombre es requerido");
      }
      if (data.name.length > 100) {
        throw new ValidationError("El nombre no puede tener más de 100 caracteres");
      }
    }

    if (data.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      throw new ValidationError("Color inválido");
    }

    return db.transaction(async (tx) => {
      const updated = await this.repository.update(ctx, id, data, tx);
      if (!updated) {
        throw new NotFoundError("Etiqueta");
      }

      return {
        data: updated,
        txid: await getCurrentTransactionId(tx),
      };
    });
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
