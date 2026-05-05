// @ts-nocheck - Backend file
import { BusinessRepository } from "../repository/business.repository";
import { SupplierRepository } from "../repository/supplier.repository";
import { WhatsAppTemplateRepository } from "../repository/whatsapp-template.repository";
import { ProductRepository } from "../repository/product.repository";
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
import { businesses, defaultCalculatorSettings } from "../../db/schema/businesses";
import type { BusinessCalculatorSettings } from "../../db/schema/businesses";
import { DEFAULT_WHATSAPP_TEMPLATES } from "./default-templates";

function normalizePublicCatalogSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function buildDefaultPublicCatalogSlug(name: string, id: string): string {
  const base = normalizePublicCatalogSlug(name) || "catalogo";
  return `${base}-${id.slice(0, 8)}`.slice(0, 100);
}

export class BusinessService {
  constructor(
    private repository: BusinessRepository,
    private supplierRepo: SupplierRepository,
    private whatsAppTemplateRepo: WhatsAppTemplateRepository,
    private productRepo: ProductRepository
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
      publicCatalogEnabled: membership.business.publicCatalogEnabled,
      publicCatalogSlug: membership.business.publicCatalogSlug,
      modoOperacion: membership.business.modoOperacion,
      usarDistribucion: membership.business.usarDistribucion,
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

    const updatedBusiness = await this.repository.update(workerCtx as RequestContext, business.id, {
      publicCatalogSlug: buildDefaultPublicCatalogSlug(business.name, business.id),
    });

    return updatedBusiness ?? business;
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
      publicCatalogEnabled?: boolean;
      publicCatalogSlug?: string | null;
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

    const publicCatalogSlug =
      data.publicCatalogSlug === undefined
        ? undefined
        : data.publicCatalogSlug
          ? normalizePublicCatalogSlug(data.publicCatalogSlug)
          : null;

    if (data.publicCatalogEnabled && !publicCatalogSlug && !existing.publicCatalogSlug) {
      throw new ValidationError("Configura una URL pública para activar el catálogo");
    }

    if (publicCatalogSlug !== undefined && publicCatalogSlug !== null && publicCatalogSlug.length < 3) {
      throw new ValidationError("La URL pública debe tener al menos 3 caracteres");
    }

    if (publicCatalogSlug) {
      const duplicate = await db.query.businesses.findFirst({
        where: eq(businesses.publicCatalogSlug, publicCatalogSlug),
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError("Esta URL pública ya está en uso");
      }
    }

    const business = await this.repository.update(ctx, id, {
      name: data.name,
      ruc: data.ruc,
      address: data.address,
      phone: data.phone,
      email: data.email,
      usarDistribucion: data.usarDistribucion,
      publicCatalogEnabled: data.publicCatalogEnabled,
      publicCatalogSlug,
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

  async seedDemoData(ctx: RequestContext) {
    const demoProducts = [
      { name: "Pollo Entero", type: "pollo" as const, unit: "kg" as const, basePrice: "12.50" },
      { name: "1/2 Pollo", type: "pollo" as const, unit: "kg" as const, basePrice: "6.50" },
      { name: "1/4 Pollo", type: "pollo" as const, unit: "kg" as const, basePrice: "3.50" },
      { name: "Pierna", type: "pollo" as const, unit: "unidad" as const, basePrice: "8.00" },
      { name: "Pecho", type: "pollo" as const, unit: "unidad" as const, basePrice: "7.50" },
    ];

    const createdProducts = [];

    for (const productData of demoProducts) {
      const existing = await this.productRepo.findByName(ctx, productData.name);
      
      if (!existing) {
        const product = await this.productRepo.create(ctx, {
          name: productData.name,
          type: productData.type,
          unit: productData.unit,
          basePrice: productData.basePrice,
          costPrice: "0",
          isActive: true,
          hasVariants: false,
        });
        createdProducts.push(product);
      }
    }

    return {
      productsCreated: createdProducts.length,
      products: createdProducts,
    };
  }
}
