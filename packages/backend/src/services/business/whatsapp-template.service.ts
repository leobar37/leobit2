import type { WhatsAppTemplateRepository } from "../repository/whatsapp-template.repository";
import type { RequestContext } from "../../context/request-context";
import { NotFoundError, ValidationError, ForbiddenError } from "../../errors";
import type { WhatsAppTemplate } from "../../db/schema";
import { DEFAULT_WHATSAPP_TEMPLATES } from "./default-templates";

// Allowed template variables - must match whatsapp-message.service.ts
const ALLOWED_VARIABLES = [
  "nombre_cliente",
  "monto",
  "fecha",
  "telefono",
  "productos",
  "total",
  "dias_sin_pedido",
  "ultima_entrega",
  "bidones_habituales",
] as const;

type AllowedVariable = (typeof ALLOWED_VARIABLES)[number];

interface TemplateVariables {
  nombre_cliente?: string;
  monto?: string | number;
  fecha?: string;
  telefono?: string;
  productos?: string;
  total?: string | number;
  dias_sin_pedido?: string | number;
  ultima_entrega?: string;
  bidones_habituales?: string | number;
}

export class WhatsAppTemplateService {
  constructor(private repository: WhatsAppTemplateRepository) {}

  async getAllTemplates(
    ctx: RequestContext,
    filters?: {
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<WhatsAppTemplate[]> {
    if (!ctx.hasPermission("whatsapp.read")) {
      throw new ForbiddenError("No tiene permisos para ver plantillas");
    }

    // Get or create default templates
    const templates = await this.getOrCreateDefaultTemplates(ctx);

    let result = templates;
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.content.toLowerCase().includes(searchLower)
      );
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || result.length;
    result = result.slice(offset, offset + limit);

    return result;
  }

  private async getOrCreateDefaultTemplates(
    ctx: RequestContext
  ): Promise<WhatsAppTemplate[]> {
    const existing = await this.repository.findMany(ctx);

    if (existing.length > 0) {
      return existing;
    }

    for (const template of DEFAULT_WHATSAPP_TEMPLATES) {
      await this.repository.create(ctx, {
        name: template.name,
        content: template.content,
        isDefault: template.isDefault,
      });
    }

    return this.repository.findMany(ctx);
  }

  async getTemplateById(
    ctx: RequestContext,
    id: string
  ): Promise<WhatsAppTemplate> {
    if (!ctx.hasPermission("whatsapp.read")) {
      throw new ForbiddenError("No tiene permisos para ver plantillas");
    }

    const template = await this.repository.findById(ctx, id);
    if (!template) {
      throw new NotFoundError("Plantilla");
    }

    return template;
  }

  async createTemplate(
    ctx: RequestContext,
    data: {
      name: string;
      content: string;
      isDefault?: boolean;
    }
  ): Promise<WhatsAppTemplate> {
    if (!ctx.hasPermission("whatsapp.write")) {
      throw new ForbiddenError("No tiene permisos para crear plantillas");
    }

    if (!data.name || data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    if (data.name.length > 100) {
      throw new ValidationError("El nombre no puede exceder 100 caracteres");
    }

    if (!data.content || data.content.length < 5) {
      throw new ValidationError("El contenido debe tener al menos 5 caracteres");
    }

    this.validateTemplateVariables(data.content);

    if (data.isDefault) {
      const existingDefault = await this.repository.findDefault(ctx);
      if (existingDefault) {
        await this.repository.update(ctx, existingDefault.id, {
          isDefault: false,
        });
      }
    }

    return this.repository.create(ctx, {
      name: data.name,
      content: data.content,
      isDefault: data.isDefault ?? false,
    });
  }

  async updateTemplate(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      content?: string;
      isDefault?: boolean;
    }
  ): Promise<WhatsAppTemplate> {
    if (!ctx.hasPermission("whatsapp.write")) {
      throw new ForbiddenError("No tiene permisos para editar plantillas");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Plantilla");
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name.length < 2) {
        throw new ValidationError("El nombre debe tener al menos 2 caracteres");
      }
      if (data.name.length > 100) {
        throw new ValidationError("El nombre no puede exceder 100 caracteres");
      }
    }

    // Validate content if provided
    if (data.content !== undefined) {
      if (data.content.length < 5) {
        throw new ValidationError(
          "El contenido debe tener al menos 5 caracteres"
        );
      }
      this.validateTemplateVariables(data.content);
    }

    // If setting as default, ensure only one default per business
    if (data.isDefault === true && !existing.isDefault) {
      const currentDefault = await this.repository.findDefault(ctx);
      if (currentDefault && currentDefault.id !== id) {
        await this.repository.update(ctx, currentDefault.id, {
          isDefault: false,
        });
      }
    }

    const updated = await this.repository.update(ctx, id, data);
    if (!updated) {
      throw new NotFoundError("Plantilla");
    }

    return updated;
  }

  async deleteTemplate(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.hasPermission("whatsapp.delete")) {
      throw new ForbiddenError("No tiene permisos para eliminar plantillas");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Plantilla");
    }

    await this.repository.delete(ctx, id);
  }

  /**
   * Render a template by replacing variables with actual values
   * Allowed variables: {nombre_cliente}, {monto}, {fecha}, {telefono}, {productos}, {total},
   * {dias_sin_pedido}, {ultima_entrega}, {bidones_habituales}
   */
  renderTemplate(
    template: WhatsAppTemplate,
    variables: TemplateVariables
  ): string {
    let rendered = template.content;

    // Replace each allowed variable
    for (const key of ALLOWED_VARIABLES) {
      const placeholder = `{${key}}`;
      const value = variables[key];

      if (value !== undefined) {
        rendered = rendered.replaceAll(placeholder, String(value));
      }
    }

    return rendered;
  }

  /**
   * Validate that template content only uses allowed variables
   */
  private validateTemplateVariables(content: string): void {
    // Find all variables in the content
    const variableRegex = /\{([^}]+)\}/g;
    const matches = content.matchAll(variableRegex);

    for (const match of matches) {
      const variable = match[1];
      if (!ALLOWED_VARIABLES.includes(variable as AllowedVariable)) {
        throw new ValidationError(
          `Variable no permitida: {${variable}}. Variables permitidas: ${ALLOWED_VARIABLES.map((v) => `{${v}}`).join(", ")}`
        );
      }
    }
  }

  /**
   * Get the default template for the business
   */
  async getDefaultTemplate(
    ctx: RequestContext
  ): Promise<WhatsAppTemplate | undefined> {
    if (!ctx.hasPermission("whatsapp.read")) {
      throw new ForbiddenError("No tiene permisos para ver plantillas");
    }

    const defaultTemplate = await this.repository.findDefault(ctx);

    if (defaultTemplate) {
      return defaultTemplate;
    }

    const templates = await this.getOrCreateDefaultTemplates(ctx);
    return templates.find((t) => t.isDefault);
  }
}
