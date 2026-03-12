import { BusinessRepository } from "../repository/business.repository";
import { SupplierRepository } from "../repository/supplier.repository";
import { WhatsAppTemplateRepository } from "../repository/whatsapp-template.repository";
import type { RequestContext } from "../../context/request-context";
import { RequestContext as RequestContextClass } from "../../context/request-context";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../errors";
import { eq } from "drizzle-orm";
import { db, businessUsers } from "../../lib/db";
import { businesses } from "../../db/schema/businesses";
import type { BusinessCalculatorSettings } from "../../db/schema/businesses";
import { DEFAULT_WHATSAPP_TEMPLATES } from "./default-templates";

export class BusinessService {
  constructor(
    private repository: BusinessRepository,
    private supplierRepo: SupplierRepository,
    private whatsAppTemplateRepo: WhatsAppTemplateRepository
  ) {}

  async getBusiness(ctx: RequestContext) {
    const membership = await this.repository.findByUserId(ctx);

    if (!membership) {
      throw new NotFoundError("Negocio");
    }

    return {
      id: membership.business.id,
      businessUserId: membership.id,
      name: membership.business.name,
      ruc: membership.business.ruc,
      address: membership.business.address,
      phone: membership.business.phone,
      email: membership.business.email,
      logoUrl: membership.business.logoUrl,
      modoOperacion: membership.business.modoOperacion,
      usarDistribucion: membership.business.usarDistribucion,
      permitirVentaSinStock: membership.business.permitirVentaSinStock,
      role: membership.role,
      salesPoint: membership.salesPoint,
      isActive: membership.business.isActive,
      createdAt: membership.business.createdAt,
      updatedAt: membership.business.updatedAt,
    };
  }

  async createBusiness(
    ctx: RequestContext,
    data: {
      name: string;
      ruc?: string;
      address?: string;
      phone?: string;
      email?: string;
    }
  ) {
    const existingMembership = await this.repository.findByUserId(ctx);

    if (existingMembership) {
      throw new ConflictError("El usuario ya tiene un negocio asociado");
    }

    if (!data.name || data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    const business = await this.repository.create(ctx, {
      name: data.name,
      ruc: data.ruc,
      address: data.address,
      phone: data.phone,
      email: data.email,
    });

    await db.insert(businessUsers).values({
      businessId: business.id,
      userId: ctx.userId,
      role: "ADMIN_NEGOCIO",
    });

    const workerCtx = RequestContextClass.forWorker(business.id);
    await this.supplierRepo.create(workerCtx, {
      name: "Proveedor Varios",
      type: "generic",
      ruc: null,
      address: null,
      phone: null,
      email: null,
      notes: "Proveedor genérico para compras sin identificación",
      isActive: true,
    });

    await this.seedDefaultTemplates(workerCtx);

    return business;
  }

  async updateBusiness(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      ruc?: string;
      address?: string;
      phone?: string;
      email?: string;
      usarDistribucion?: boolean;
      permitirVentaSinStock?: boolean;
    }
  ) {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("No tienes permiso para editar este negocio");
    }

    if (!ctx.belongsToBusiness(id)) {
      throw new ForbiddenError("No perteneces a este negocio");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Negocio");
    }

    const business = await this.repository.update(ctx, id, {
      name: data.name,
      ruc: data.ruc,
      address: data.address,
      phone: data.phone,
      email: data.email,
      usarDistribucion: data.usarDistribucion,
      permitirVentaSinStock: data.permitirVentaSinStock,
    });

    return business;
  }

  async updateLogo(ctx: RequestContext, id: string, logoUrl: string) {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("No tienes permiso para editar este negocio");
    }

    if (!ctx.belongsToBusiness(id)) {
      throw new ForbiddenError("No perteneces a este negocio");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Negocio");
    }

    return this.repository.updateLogo(ctx, id, logoUrl);
  }

  async getCalculatorSettings(ctx: RequestContext): Promise<BusinessCalculatorSettings> {
    const membership = await this.repository.findByUserId(ctx);

    if (!membership) {
      throw new NotFoundError("Negocio");
    }

    return membership.business.calculatorSettings ?? defaultCalculatorSettings;
  }

  async updateCalculatorSettings(
    ctx: RequestContext,
    settings: BusinessCalculatorSettings
  ): Promise<BusinessCalculatorSettings> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("No tienes permiso para editar la configuración");
    }

    const membership = await this.repository.findByUserId(ctx);

    if (!membership) {
      throw new NotFoundError("Negocio");
    }

    const [updated] = await db
      .update(businesses)
      .set({
        calculatorSettings: settings,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, ctx.businessId))
      .returning();

    return updated.calculatorSettings ?? {} as BusinessCalculatorSettings;
  }

  /**
   * Seeds default WhatsApp templates for a new business
   */
  private async seedDefaultTemplates(
    ctx: ReturnType<typeof RequestContextClass.forWorker>
  ): Promise<void> {
    const existing = await this.whatsAppTemplateRepo.findMany(ctx, { limit: 1 });

    if (existing.length > 0) {
      return;
    }

    for (const template of DEFAULT_WHATSAPP_TEMPLATES) {
      await this.whatsAppTemplateRepo.create(ctx, {
        name: template.name,
        content: template.content,
        isDefault: template.isDefault,
      });
    }
  }
}
