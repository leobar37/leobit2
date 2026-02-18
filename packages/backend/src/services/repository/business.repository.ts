import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import { businesses, businessUsers, type Business, type BusinessUser } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import { NotFoundError } from "../../errors";

export class BusinessRepository {
  async findById(ctx: RequestContext, id: string): Promise<Business | undefined> {
    const business = await db.query.businesses.findFirst({
      where: and(
        eq(businesses.id, id),
        eq(businesses.id, ctx.businessId)
      ),
    });
    return business;
  }

  async findByUserId(ctx: RequestContext): Promise<(BusinessUser & { business: Business }) | undefined> {
    const membership = await db.query.businessUsers.findFirst({
      where: eq(businessUsers.userId, ctx.userId),
      with: { business: true },
    });
    return membership as (BusinessUser & { business: Business }) | undefined;
  }

  async create(
    ctx: RequestContext,
    data: {
      name: string;
      ruc?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
    }
  ): Promise<Business> {
    const [business] = await db
      .insert(businesses)
      .values({
        name: data.name,
        ruc: data.ruc || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
      })
      .returning();

    return business;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      ruc?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      modoOperacion?: string;
      usarDistribucion?: boolean;
      permitirVentaSinStock?: boolean;
    }
  ): Promise<Business | undefined> {
    const [business] = await db
      .update(businesses)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.ruc !== undefined && { ruc: data.ruc }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.modoOperacion !== undefined && { modoOperacion: data.modoOperacion }),
        ...(data.usarDistribucion !== undefined && { usarDistribucion: data.usarDistribucion }),
        ...(data.permitirVentaSinStock !== undefined && { permitirVentaSinStock: data.permitirVentaSinStock }),
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, id))
      .returning();

    return business;
  }

  async updateLogo(ctx: RequestContext, id: string, logoUrl: string): Promise<Business | undefined> {
    const [business] = await db
      .update(businesses)
      .set({
        logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, id))
      .returning();

    return business;
  }
}
